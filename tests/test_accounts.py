import time
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update, func
from backend.app import Settings, create_app
from backend.database import User, LoginSession, Entry, COOKIE, digest
P='long-test-password'
H={'X-MindBridge-Client':'v5','Origin':'http://localhost'}
@pytest.fixture
def app(tmp_path): return create_app(Settings(database_url='sqlite+pysqlite:///'+str(tmp_path/'test.db'),auth_limit=100))
@pytest.fixture
def c(app):
    with TestClient(app,base_url='http://localhost') as client: yield client

def signup(c,name='alice'):
    r=c.post('/api/auth/register',json={'username':name,'password':P},headers=H);assert r.status_code==200,r.text;return r

def login(c,name='alice',password=P): return c.post('/api/auth/login',json={'username':name,'password':password},headers=H)
def auth(c): return {**H,'X-CSRF-Token':c.get('/api/auth/me').json()['csrf'] or ''}
def entry(c,text='Private note',kind='journal',id='first'): return c.post('/api/entries',json={'client_id':id,'type':kind,'text':text},headers=auth(c))

def test_unauthenticated(c):
    assert c.get('/api/auth/me').json()=={'user':None,'csrf':None}
    assert c.get('/api/entries').status_code==401
    assert entry(c).status_code==401
    assert c.get('/api/account/export').status_code==401

def test_hash_cookie_token(c,app):
    r=signup(c,'ALICE');assert r.json()['user']['username']=='alice'
    cookie=r.headers['set-cookie'].lower();assert 'httponly' in cookie and 'samesite=strict' in cookie and 'max-age=43200' in cookie
    token=c.cookies.get(COOKIE)
    with app.state.database.Session() as s:
        u=s.scalar(select(User));sess=s.scalar(select(LoginSession));assert u.password_hash.startswith('$argon2id$') and P not in u.password_hash
        assert sess.token_hash==digest(token) and sess.token_hash!=token
    assert c.get('/api/auth/me').json()['csrf']==r.json()['csrf']
    assert P not in r.text

def test_session_rotation_logout(c):
    signup(c);old=c.cookies.get(COOKIE);login(c);new=c.cookies.get(COOKIE);assert old!=new
    c.cookies.clear();c.cookies.set(COOKIE,old);assert c.get('/api/auth/me').json()['user'] is None
    c.cookies.clear();login(c);token=c.cookies.get(COOKIE);assert c.post('/api/auth/logout',json={},headers=auth(c)).status_code==200
    c.cookies.set(COOKIE,token);assert c.get('/api/auth/me').json()['user'] is None

def test_expiry_tamper(c,app):
    signup(c)
    with app.state.database.Session.begin() as s: s.execute(update(LoginSession).values(expires_at=int(time.time())-1))
    assert c.get('/api/auth/me').json()['user'] is None
    c.cookies.set(COOKIE,'wrong');assert c.get('/api/entries').status_code==401

def test_username_unique(c):
    signup(c);r=c.post('/api/auth/register',json={'username':'ALICE','password':P},headers=H);assert r.status_code==409
@pytest.mark.parametrize('name',['alice','unknown'])
def test_generic_login_error(c,name):
    signup(c);r=login(c,name,'incorrect-password');assert r.status_code==401 and r.json()['error']['code']=='invalid_credentials'
@pytest.mark.parametrize('body',[{'username':'ab','password':P},{'username':'a@b.com','password':P},{'username':'alice','password':'short'},{'username':'alice','password':' '*12},{'username':'alice','password':P,'admin':True}])
def test_signup_validation(c,body):
    r=c.post('/api/auth/register',json=body,headers=H);assert r.status_code==422 and r.json()['error']['code']=='invalid_request';assert P not in r.text

def test_csrf_origin(c):
    signup(c);body={'client_id':'a','type':'journal','text':'Note'}
    for headers in [H,{**H,'X-CSRF-Token':'a'*64},{**auth(c),'Origin':'https://evil.example'},{**auth(c),'X-MindBridge-Client':'v4'}]:
        assert c.post('/api/entries',json=body,headers=headers).status_code==403
@pytest.mark.parametrize('kind,text',[('journal','<script>evil</script>'),('gratitude','Tea'),('mood','🙂')])
def test_crud_export(c,kind,text):
    signup(c);r=entry(c,text,kind);assert r.status_code==200;id=r.json()['entries'][0]['id']
    history=c.get('/api/entries').json();assert history['total']==1 and history['entries'][0]['text']==text
    export=c.get('/api/account/export');assert export.json()['entries'][0]['id']==id
    assert 'password' not in export.text and 'csrf' not in export.text and export.headers['cache-control']=='no-store'
    assert c.post('/api/entries/'+id+'/delete',json={},headers=auth(c)).status_code==200
    assert c.get('/api/entries').json()['total']==0

def test_ownership(app):
    with TestClient(app,base_url='http://localhost') as a,TestClient(app,base_url='http://localhost') as b:
        signup(a,'alice');signup(b,'bob');id=entry(a,'Alice private').json()['entries'][0]['id']
        assert b.get('/api/entries').json()['entries']==[] and b.get('/api/account/export').json()['entries']==[]
        assert b.post('/api/entries/'+id+'/delete',json={},headers=auth(b)).status_code==404
        entry(b,'Bob private');assert 'Bob private' not in a.get('/api/entries').text and 'Alice private' not in b.get('/api/entries').text

def test_owner_field_rejected(c):
    signup(c);r=c.post('/api/entries',json={'client_id':'a','type':'journal','text':'Note','user_id':'fake'},headers=auth(c));assert r.status_code==422

def test_retry_idempotent(c):
    signup(c);first=entry(c).json()['entries'][0]['id'];assert entry(c).json()['entries'][0]['id']==first
    assert c.get('/api/entries').json()['total']==1 and entry(c,'Changed text').status_code==409
@pytest.mark.parametrize('body',[{'client_id':'a','type':'mood','text':'bad'},{'client_id':'a','type':'gratitude','text':'x'*1001},{'client_id':'a','type':'journal','text':' '},{'client_id':'a','type':'journal','text':'x'*10001},{'client_id':'a','type':'journal','text':'Note','at':'2999-01-01T00:00:00Z'},{'client_id':'a','type':'journal','text':'Note','at':'2025-01-01'}])
def test_entry_validation(c,body):
    signup(c);assert c.post('/api/entries',json=body,headers=auth(c)).status_code==422

def test_import_atomic_and_dates(c):
    signup(c);items=[{'client_id':'old-1','type':'journal','text':'Old','at':'2025-01-01T12:00:00Z'},{'client_id':'old-2','type':'mood','text':'🙂','at':'2025-01-02T12:00:00Z'}]
    for _ in range(2): assert c.post('/api/entries/import',json={'entries':items},headers=auth(c)).status_code==200
    h=c.get('/api/entries').json();assert h['total']==2 and h['entries'][0]['at'].startswith('2025-01-02')
    items=[{'client_id':'new','type':'journal','text':'Rollback'},{'client_id':'old-1','type':'journal','text':'Conflict'}]
    assert c.post('/api/entries/import',json={'entries':items},headers=auth(c)).status_code==409
    assert c.get('/api/entries').json()['total']==2

def test_change_password_revoke_all(app):
    with TestClient(app,base_url='http://localhost') as a,TestClient(app,base_url='http://localhost') as b:
        signup(a);login(b)
        assert a.post('/api/auth/password',json={'password':P,'new_password':'new-strong-password'},headers=auth(a)).status_code==200
        assert a.get('/api/auth/me').json()['user'] is None and b.get('/api/auth/me').json()['user'] is None
        assert login(a).status_code==401 and login(a,password='new-strong-password').status_code==200

def test_account_delete_reauth_cascade(c,app):
    signup(c);entry(c);assert c.post('/api/auth/delete',json={'password':'wrong'},headers=auth(c)).status_code==401
    assert c.get('/api/entries').json()['total']==1
    assert c.post('/api/auth/delete',json={'password':P},headers=auth(c)).status_code==200
    with app.state.database.Session() as s:
        for model in [User,Entry,LoginSession]: assert s.scalar(select(func.count()).select_from(model))==0

def test_rate_limit(tmp_path):
    app=create_app(Settings(database_url='sqlite+pysqlite:///'+str(tmp_path/'rate.db'),auth_limit=2))
    with TestClient(app,base_url='http://localhost') as c:
        login(c);login(c);assert login(c).status_code==429

def test_persist_restart(tmp_path):
    url='sqlite+pysqlite:///'+str(tmp_path/'persist.db')
    with TestClient(create_app(Settings(database_url=url)),base_url='http://localhost') as c: signup(c);entry(c,'Persistent');token=c.cookies.get(COOKIE)
    with TestClient(create_app(Settings(database_url=url)),base_url='http://localhost') as c:
        c.cookies.set(COOKIE,token);assert c.get('/api/entries').json()['entries'][0]['text']=='Persistent'

def test_pagination(c):
    signup(c)
    for i in range(4): entry(c,str(i),id='id-'+str(i))
    a=c.get('/api/entries?limit=2').json();b=c.get('/api/entries?limit=2&offset=2').json()
    assert len(a['entries'])==len(b['entries'])==2 and not set(e['id'] for e in a['entries'])&set(e['id'] for e in b['entries'])
    assert c.get('/api/entries?limit=101').status_code==422

def test_secure_cookie(tmp_path):
    app=create_app(Settings(database_url='sqlite+pysqlite:///'+str(tmp_path/'secure.db'),secure_cookies=True))
    with TestClient(app,base_url='https://localhost') as c:
        r=c.post('/api/auth/register',json={'username':'alice','password':P},headers={**H,'Origin':'https://localhost'})
        assert 'secure' in r.headers['set-cookie'].lower()
