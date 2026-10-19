"""One-time recovery codes: account recovery without an email address."""
import re
import time

from fastapi.testclient import TestClient
from sqlalchemy import select, update

from backend.app import Settings, create_app
from backend.database import COOKIE
from backend.recovery import RecoveryCode, RECOVERY_SECONDS

P = 'long-test-password'
NEW = 'a-brand-new-password'
H = {'X-MindBridge-Client': 'v5', 'Origin': 'http://localhost'}


def make(tmp_path, **settings):
    base = dict(database_url='sqlite+pysqlite:///' + str(tmp_path / 'r.db'), auth_limit=1000)
    base.update(settings)
    return create_app(Settings(**base))


def client(app):
    return TestClient(app, base_url='http://localhost')


def signup(c, name='alice'):
    r = c.post('/api/auth/register', json={'username': name, 'password': P}, headers=H)
    assert r.status_code == 200, r.text
    return {**H, 'X-CSRF-Token': r.json()['csrf']}


def make_code(c, headers, password=P):
    return c.post('/api/auth/recovery-code', json={'password': password}, headers=headers)


def recover(c, name, code, password=NEW):
    return c.post('/api/auth/recover', json={'username': name, 'code': code, 'new_password': password}, headers=H)


def test_creating_a_code_needs_the_password_and_shows_it_once(tmp_path):
    app = make(tmp_path)
    with client(app) as c:
        headers = signup(c)
        assert c.get('/api/auth/recovery').json() == {'has_code': False}
        assert make_code(c, headers, 'wrong-password-123').status_code == 401
        assert make_code(c, {**H}).status_code in (401, 403), 'no CSRF token, no code'
        r = make_code(c, headers)
        assert r.status_code == 200 and r.headers['cache-control'] == 'no-store'
        assert re.fullmatch(r'[A-Z2-9]{5}(-[A-Z2-9]{5}){3}', r.json()['code'])
        assert c.get('/api/auth/recovery').json()['has_code'] is True
        assert 'code' not in c.get('/api/auth/recovery').json(), 'the code cannot be read back'


def test_only_a_hash_is_stored(tmp_path):
    app = make(tmp_path)
    with client(app) as c:
        headers = signup(c)
        code = make_code(c, headers).json()['code']
        with app.state.database.Session() as s:
            row = s.scalars(select(RecoveryCode)).one()
            assert row.code_hash.startswith('$argon2id$')
            assert code.replace('-', '') not in row.code_hash and code not in row.code_hash


def test_recovery_sets_a_new_password_signs_everything_out_and_is_single_use(tmp_path):
    app = make(tmp_path)
    with client(app) as phone, client(app) as laptop:
        headers = signup(phone)
        old_cookie = phone.cookies.get(COOKIE)
        code = make_code(phone, headers).json()['code']
        r = recover(laptop, 'alice', code)
        assert r.status_code == 200 and r.json()['user']['username'] == 'alice' and r.headers['cache-control'] == 'no-store'
        new_cookie = laptop.cookies.get(COOKIE)
        assert new_cookie and new_cookie != old_cookie
        assert laptop.get('/api/auth/me').json()['user']['username'] == 'alice'
        with client(app) as replay:
            assert replay.get('/api/auth/me', headers={'Cookie': COOKIE + '=' + old_cookie}).json()['user'] is None, 'old sessions are revoked'
        with client(app) as fresh:
            assert fresh.post('/api/auth/login', json={'username': 'alice', 'password': P}, headers=H).status_code == 401, 'old password is gone'
            assert fresh.post('/api/auth/login', json={'username': 'alice', 'password': NEW}, headers=H).status_code == 200
        again = recover(client(app), 'alice', code, 'yet-another-password-1')
        assert again.status_code == 401 and again.json()['error']['code'] == 'invalid_recovery', 'the code works once'
        assert laptop.get('/api/auth/recovery').json() == {'has_code': False}


def test_a_new_code_replaces_the_old_one(tmp_path):
    app = make(tmp_path)
    with client(app) as c:
        headers = signup(c)
        first = make_code(c, headers).json()['code']
        second = make_code(c, headers).json()['code']
        assert first != second
    with client(app) as d:
        assert recover(d, 'alice', first).status_code == 401
        assert recover(d, 'alice', second).status_code == 200


def test_every_failure_looks_the_same_so_nothing_is_revealed(tmp_path):
    app = make(tmp_path)
    with client(app) as c:
        headers = signup(c, 'alice')
        code = make_code(c, headers).json()['code']
        signup(client(app), 'bob')   # exists, has no code
        expired_code = None
    with app.state.database.Session.begin() as s:
        s.execute(update(RecoveryCode).values(created_at=int(time.time()) - RECOVERY_SECONDS - 5))
    cases = [('nobody', code), ('bob', code), ('alice', 'AAAAA-AAAAA-AAAAA-AAAAA'), ('alice', 'short'), ('alice', code)]
    seen = set()
    for name, attempt in cases:
        r = recover(client(app), name, attempt)
        seen.add((r.status_code, r.json()['error']['code']))
    assert seen == {(401, 'invalid_recovery')}, seen   # unknown name, no code, wrong code, malformed, expired: one answer


def test_the_code_is_forgiving_about_case_spaces_and_hyphens(tmp_path):
    app = make(tmp_path)
    with client(app) as c:
        headers = signup(c)
        code = make_code(c, headers).json()['code']
    typed = code.lower().replace('-', ' ')
    assert recover(client(app), 'ALICE', typed).status_code == 200


def test_repeated_wrong_codes_lock_that_name_for_a_while(tmp_path):
    app = make(tmp_path, login_failures=3)
    with client(app) as c:
        headers = signup(c)
        code = make_code(c, headers).json()['code']
    d = client(app)
    for _ in range(3):
        assert recover(d, 'alice', 'AAAAA-AAAAA-AAAAA-AAAAA').status_code == 401
    blocked = recover(d, 'alice', code)
    assert blocked.status_code == 429, 'even the right code waits out the window'


def test_recovery_of_one_account_never_touches_another(tmp_path):
    app = make(tmp_path)
    with client(app) as a, client(app) as b:
        ha = signup(a, 'alice')
        signup(b, 'bob')
        code = make_code(a, ha).json()['code']
        assert recover(client(app), 'bob', code).status_code == 401, "alice's code does not open bob's account"
        with client(app) as bob_again:
            assert bob_again.post('/api/auth/login', json={'username': 'bob', 'password': P}, headers=H).status_code == 200


def test_deleting_the_account_removes_the_code(tmp_path):
    app = make(tmp_path)
    with client(app) as c:
        headers = signup(c)
        make_code(c, headers)
        assert c.post('/api/auth/delete', json={'password': P}, headers=headers).status_code == 200
    with app.state.database.Session() as s:
        assert s.scalars(select(RecoveryCode)).all() == []


def test_unauthenticated_status_is_refused(tmp_path):
    with client(make(tmp_path)) as c:
        assert c.get('/api/auth/recovery').status_code == 401
