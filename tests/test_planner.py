import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, func
from backend.app import create_app, Settings
from backend.database import COOKIE
from backend.planner import Planner

HEADERS={'X-MindBridge-Client':'v5','Origin':'http://localhost'}
PASSWORD='long-test-password'
TASK={'id':'task1','title':'Email lecturer','step':'Write opening sentence','minutes':15,'priority':'important','due':'2026-10-13','done':False}
# What the server stores and returns: older clients send only done, the state is derived.
STORED=dict(TASK,status='planned',status_at='')

@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(Settings(database_url='sqlite+pysqlite:///'+str(tmp_path/'tasks.db'),auth_limit=100)),base_url='http://localhost') as c:yield c

def signup(c,name='alice'):
    response=c.post('/api/auth/register',json={'username':name,'password':PASSWORD},headers=HEADERS)
    assert response.status_code==200
    return {**HEADERS,'X-CSRF-Token':response.json()['csrf']}

def test_planner_auth_owner_and_export(client):
    c=client
    assert c.get('/api/planner').status_code==401
    h=signup(c);token=c.cookies.get(COOKIE)
    assert c.get('/api/planner').json()['tasks']==[]
    r=c.post('/api/planner',json={'revision':0,'tasks':[TASK]},headers=h)
    assert r.status_code==200 and r.json()['revision']==1
    assert c.get('/api/account/export').json()['planner']==[STORED]
    c.cookies.clear();signup(c,'bob')
    assert c.get('/api/planner').json()['tasks']==[]
    assert c.get('/api/account/export').json()['planner']==[]
    c.cookies.clear();c.cookies.set(COOKIE,token)
    assert c.get('/api/planner').json()['tasks']==[STORED]


def test_revision_conflict_preserves_last_save(client):
    h=signup(client)
    assert client.post('/api/planner',json={'revision':0,'tasks':[TASK]},headers=h).status_code==200
    r=client.post('/api/planner',json={'revision':0,'tasks':[]},headers=h)
    assert r.status_code==409 and r.json()['error']['code']=='planner_conflict'
    assert client.get('/api/planner').json()['tasks']==[STORED]
    assert client.post('/api/planner',json={'revision':1,'tasks':[dict(TASK,done=True,step='Continue here')]},headers=h).status_code==200
    assert client.get('/api/planner').json()['tasks'][0]['done'] is True

@pytest.mark.parametrize('changes',[{'minutes':0},{'minutes':181},{'minutes':1.5},{'title':'   '},{'title':'a'*241},{'due':'2026-02-30'},{'due':'20261013'},{'priority':'urgent'},{'done':'true'},{'owner':'bob'}])
def test_validation(client,changes):
    h=signup(client)
    assert client.post('/api/planner',json={'revision':0,'tasks':[dict(TASK,**changes)]},headers=h).status_code==422
    assert client.get('/api/planner').json()['revision']==0


def test_duplicate_limit_csrf_origin(client):
    h=signup(client);body={'revision':0,'tasks':[TASK]}
    for headers in [HEADERS,{**h,'Origin':'https://wrong.example'}]:assert client.post('/api/planner',json=body,headers=headers).status_code==403
    assert client.post('/api/planner',json={'revision':0,'tasks':[TASK,TASK]},headers=h).status_code==422
    assert client.post('/api/planner',json={'revision':0,'tasks':[dict(TASK,id=str(i)) for i in range(101)]},headers=h).status_code==422
    assert client.post('/api/planner',json={**body,'user_id':'bob'},headers=h).status_code==422


def test_delete_cascades_planner(client):
    h=signup(client)
    client.post('/api/planner',json={'revision':0,'tasks':[TASK]},headers=h)
    assert client.post('/api/auth/delete',json={'password':PASSWORD},headers=h).status_code==200
    with client.app.state.database.Session() as s:assert s.scalar(select(func.count()).select_from(Planner))==0


def test_restart_preserves_planner(tmp_path):
    settings=Settings(database_url='sqlite+pysqlite:///'+str(tmp_path/'persist.db'))
    with TestClient(create_app(settings),base_url='http://localhost') as c:
        h=signup(c);c.post('/api/planner',json={'revision':0,'tasks':[TASK]},headers=h);token=c.cookies.get(COOKIE)
    with TestClient(create_app(settings),base_url='http://localhost') as c:
        c.cookies.set(COOKIE,token);assert c.get('/api/planner').json()['tasks']==[STORED]


def test_v7_migration_preserves_account_entries(tmp_path):
    from alembic import command
    from alembic.config import Config
    from pathlib import Path
    from backend.database import Database
    db=Database('sqlite+pysqlite:///'+str(tmp_path/'v7.db'))
    config=Config(str(Path(__file__).resolve().parents[1]/'alembic.ini'))
    with db.engine.begin() as connection:
        config.attributes['connection']=connection
        command.upgrade(config,'0001')
    _,token=db.register('olduser',PASSWORD)
    db.save_entries(token,[{'client_id':'before','type':'journal','text':'Original entry'}])
    db.initialize()
    assert db.list_entries(token)['entries'][0]['text']=='Original entry'
    from backend.planner import read_plan
    assert read_plan(db,token)['tasks']==[]
    db.close()


# --- explicit step state ---------------------------------------------------------------------

@pytest.mark.parametrize('status',['planned','started','paused','partial','done','abandoned'])
def test_every_state_round_trips_and_keeps_done_consistent(client,status):
    h=signup(client);body={'revision':0,'tasks':[dict(TASK,status=status,done=status=='done',status_at='2026-10-18')]}
    assert client.post('/api/planner',json=body,headers=h).status_code==200
    stored=client.get('/api/planner').json()['tasks'][0]
    assert stored['status']==status and stored['done']==(status=='done') and stored['status_at']=='2026-10-18'

def test_legacy_done_flag_derives_the_state(client):
    h=signup(client)
    client.post('/api/planner',json={'revision':0,'tasks':[dict(TASK,id='a',done=True),dict(TASK,id='b',done=False)]},headers=h)
    states={t['id']:t['status'] for t in client.get('/api/planner').json()['tasks']}
    assert states=={'a':'done','b':'planned'}

@pytest.mark.parametrize('changes',[
    {'status':'done','done':False},{'status':'started','done':True},{'status':'finished'},{'status':'DONE'},
    {'status_at':'18/10/2026'},{'status_at':'2026-13-01'},{'status_at':'2026-10-18T10:00'},{'status':5},
])
def test_inconsistent_or_unknown_state_is_rejected(client,changes):
    h=signup(client);assert client.post('/api/planner',json={'revision':0,'tasks':[dict(TASK,**changes)]},headers=h).status_code==422

def test_rows_saved_before_states_existed_still_load_and_upgrade_on_next_save(client):
    import json as _json
    from sqlalchemy import update
    h=signup(client);client.post('/api/planner',json={'revision':0,'tasks':[TASK]},headers=h)
    legacy=[{k:v for k,v in TASK.items()}]   # exactly what v19 wrote: no status, no status_at
    with client.app.state.database.Session.begin() as s:
        s.execute(update(Planner).values(content=_json.dumps(legacy)))
    loaded=client.get('/api/planner').json();assert 'status' not in loaded['tasks'][0], 'old rows are returned untouched'
    r=client.post('/api/planner',json={'revision':loaded['revision'],'tasks':loaded['tasks']},headers=h);assert r.status_code==200
    assert client.get('/api/planner').json()['tasks'][0]['status']=='planned'