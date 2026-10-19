"""Account hardening: per-account lockout, sign-out-everywhere, AI quota and cross-account isolation."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, func

from backend.app import Settings, create_app
from backend.database import COOKIE, LoginSession, Entry

P = 'long-test-password'
H = {'X-MindBridge-Client': 'v5', 'Origin': 'http://localhost'}
CHAT = {'X-MindBridge-Client': 'v4', 'Origin': 'http://localhost'}


def make(tmp_path, **settings):
    base = dict(database_url='sqlite+pysqlite:///' + str(tmp_path / 'h.db'), auth_limit=1000)
    base.update(settings)
    return create_app(Settings(**base))


def client(app):
    return TestClient(app, base_url='http://localhost')


def signup(c, name='alice'):
    r = c.post('/api/auth/register', json={'username': name, 'password': P}, headers=H)
    assert r.status_code == 200, r.text
    return r


def login(c, name='alice', password=P):
    return c.post('/api/auth/login', json={'username': name, 'password': password}, headers=H)


def auth(c):
    return {**H, 'X-CSRF-Token': c.get('/api/auth/me').json()['csrf'] or ''}


# --- per-account sign-in lockout -------------------------------------------------------------

def test_repeated_failures_lock_that_name_and_reveal_nothing(tmp_path):
    app = make(tmp_path, login_failures=3)
    with client(app) as victim, client(app) as attacker, client(app) as other:
        signup(victim, 'alice'); signup(other, 'bob')
        for _ in range(3):
            assert login(attacker, 'alice', 'wrong-password-1').status_code == 401
        blocked = login(attacker, 'alice', P)           # even the right password waits out the window
        assert blocked.status_code == 429 and blocked.json()['error']['code'] == 'auth_rate_limit'
        assert int(blocked.headers['Retry-After']) > 0
        assert login(attacker, 'bob', P).status_code == 200, 'other accounts are unaffected'
        # A name that does not exist behaves exactly the same: no account enumeration.
        for _ in range(3):
            assert login(attacker, 'nobody', 'wrong-password-1').status_code == 401
        ghost = login(attacker, 'nobody', P)
        assert ghost.status_code == 429 and ghost.json()['error'] == blocked.json()['error']


def test_a_successful_sign_in_clears_the_failure_count(tmp_path):
    app = make(tmp_path, login_failures=3)
    with client(app) as c:
        signup(c)
        for _ in range(2):
            assert login(c, password='wrong-password-1').status_code == 401
        assert login(c).status_code == 200
        for _ in range(2):
            assert login(c, password='wrong-password-1').status_code == 401
        assert login(c).status_code == 200


def test_lockout_state_is_not_shared_with_the_address_limiter(tmp_path):
    app = make(tmp_path, login_failures=3, auth_limit=2)
    with client(app) as c:
        assert login(c, 'user1', 'wrong-password-1').status_code == 401
        assert login(c, 'user2', 'wrong-password-1').status_code == 401
        assert login(c, 'user3', 'wrong-password-1').status_code == 429   # per-address limit still applies


# --- sign out everywhere ---------------------------------------------------------------------

def test_logout_all_needs_reauthentication_and_csrf(tmp_path):
    app = make(tmp_path)
    with client(app) as a, client(app) as b:
        signup(a); login(b)
        assert a.post('/api/auth/logout-all', json={'password': P}, headers=H).status_code == 403          # no CSRF token
        assert a.post('/api/auth/logout-all', json={'password': 'wrong-password-1'}, headers=auth(a)).status_code == 401
        assert a.get('/api/auth/me').json()['user'] and b.get('/api/auth/me').json()['user'], 'nothing revoked yet'
        r = a.post('/api/auth/logout-all', json={'password': P}, headers=auth(a))
        assert r.status_code == 200 and r.json()['revoked'] == 2
        assert a.get('/api/auth/me').json()['user'] is None and b.get('/api/auth/me').json()['user'] is None
        with app.state.database.Session() as s:
            assert s.scalar(select(func.count()).select_from(LoginSession)) == 0
        assert login(a).status_code == 200, 'the account itself is untouched'


def test_logout_all_requires_a_session(tmp_path):
    with client(make(tmp_path)) as c:
        assert c.post('/api/auth/logout-all', json={'password': P}, headers=H).status_code == 401


# --- AI quota --------------------------------------------------------------------------------

class Counting:
    def __init__(self): self.calls = 0

    async def reply(self, data):
        self.calls += 1
        return 'A calm, practical suggestion.'


def ai_app(tmp_path, quota):
    provider = Counting()
    app = create_app(Settings(database_url='sqlite+pysqlite:///' + str(tmp_path / 'ai.db'), api_key='k', model='m',
                              require_ai_login=True, ai_daily_quota=quota, auth_limit=1000, rate_limit=1000), provider)
    return app, provider


def chat(c, text='Help me plan my week'):
    headers = {**CHAT, 'X-CSRF-Token': c.get('/api/auth/me').json()['csrf'] or ''}
    return c.post('/api/chat', headers=headers, json={'mode': 'ai', 'language': 'en', 'consent': True,
                                                      'messages': [{'role': 'user', 'content': text}]})


def test_quota_is_per_account_and_reports_what_is_left(tmp_path):
    app, provider = ai_app(tmp_path, 2)
    with client(app) as a, client(app) as b:
        signup(a, 'alice'); signup(b, 'bob')
        first, second = chat(a), chat(a)
        assert first.json()['ai_quota'] == {'limit': 2, 'remaining': 1}
        assert second.json()['ai_quota'] == {'limit': 2, 'remaining': 0}
        third = chat(a)
        assert third.status_code == 429 and third.json()['error']['code'] == 'ai_quota' and int(third.headers['Retry-After']) > 0
        assert chat(b).status_code == 200, 'another account has its own budget'
        assert provider.calls == 3, 'a refused request never reaches the provider'


def test_quota_never_blocks_crisis_help_and_degrades_to_support(tmp_path):
    app, provider = ai_app(tmp_path, 1)
    with client(app) as c:
        signup(c); chat(c)
        assert chat(c).status_code == 429
        crisis = chat(c, 'I want to die')
        assert crisis.status_code == 200 and crisis.json()['source'] == 'safety' and '116 123' in crisis.json()['reply']
        soft = chat(c, "Everything feels hopeless and I can't go on")
        assert soft.status_code == 200 and soft.json()['source'] == 'safety'


def test_quota_can_be_disabled(tmp_path):
    app, provider = ai_app(tmp_path, 0)
    with client(app) as c:
        signup(c)
        for _ in range(5):
            r = chat(c)
            assert r.status_code == 200 and 'ai_quota' not in r.json()


def test_a_refused_quota_request_spends_nothing_when_the_provider_is_busy_or_unconfigured(tmp_path):
    app = create_app(Settings(database_url='sqlite+pysqlite:///' + str(tmp_path / 'u.db'), require_ai_login=True,
                              ai_daily_quota=1, auth_limit=1000), Counting())
    with client(app) as c:
        signup(c)
        assert chat(c).json()['error']['code'] == 'ai_not_configured'
        assert chat(c).json()['error']['code'] == 'ai_not_configured', 'configuration errors never consume the budget'


# --- response headers ------------------------------------------------------------------------

def test_isolation_headers_on_page_api_and_assets(tmp_path):
    with client(make(tmp_path)) as c:
        for path in ('/', '/api/health', '/assets/paper.css'):
            h = c.get(path).headers
            assert h['cross-origin-opener-policy'] == 'same-origin' and h['cross-origin-resource-policy'] == 'same-origin', path
            assert h['x-content-type-options'] == 'nosniff' and h['x-frame-options'] == 'DENY' and h['referrer-policy'] == 'no-referrer'
            assert "frame-ancestors 'none'" in h['content-security-policy'] and "object-src 'none'" in h['content-security-policy']


def test_csp_has_no_inline_script_and_no_third_party_hosts(tmp_path):
    import re
    with client(make(tmp_path)) as c:
        policy = c.get('/').headers['content-security-policy']
        directives = {d.split()[0]: d.split()[1:] for d in policy.split(';') if d.strip()}
        assert directives['script-src'] == ["'self'"], 'scripts: same origin only, no inline, no eval'
        assert "'unsafe-eval'" not in policy and 'http' not in policy, 'no third-party host is allowed anywhere'
        assert directives['font-src'] == ["'self'"] and directives['img-src'] == ["'self'", 'data:']
        assert directives['connect-src'] == ["'self'"] and directives['object-src'] == ["'none'"] and directives['base-uri'] == ["'none'"]
        # The page must actually satisfy that policy: external scripts only, no inline handlers or script bodies.
        page = c.get('/').text
        assert not re.search(r'\son[a-z]+\s*=', page), 'inline event-handler attribute in served page'
        assert not re.search(r'<script(?![^>]*\ssrc=)[^>]*>', page), 'inline <script> in served page'
        assert not re.search(r'<script[^>]+src="https?:', page) and not re.search(r'<link[^>]+href="https?:', page)


# --- cross-account isolation (IDOR / BOLA) ---------------------------------------------------

def plan(c, revision, title):
    return c.post('/api/planner', json={'revision': revision, 'tasks': [{'id': 't1', 'title': title, 'minutes': 5}]}, headers=auth(c))


def test_two_accounts_cannot_reach_each_others_records_planner_or_exports(tmp_path):
    app = make(tmp_path)
    with client(app) as a, client(app) as b:
        signup(a, 'alice'); signup(b, 'bob')
        alice_entry = a.post('/api/entries', json={'client_id': 'e1', 'type': 'journal', 'text': 'Alice secret'}, headers=auth(a)).json()['entries'][0]
        assert plan(a, 0, 'Alice private task').status_code == 200

        # Reading
        assert 'Alice' not in b.get('/api/entries').text
        assert b.get('/api/planner').json()['tasks'] == []
        # Check structure, not substrings: the export holds random UUIDs, and a short token such as "e1"
        # can occur inside one by chance (this test used to fail about one run in ten for that reason).
        export = b.get('/api/account/export').json()
        assert export['username'] == 'bob' and export['entries'] == [] and export['planner'] == []
        assert 'Alice' not in str(export) and all(e.get('client_id') != 'e1' for e in export['entries'])

        # Writing / deleting by guessing identifiers
        assert b.post('/api/entries/' + alice_entry['id'] + '/delete', json={}, headers=auth(b)).status_code == 404
        same_client_id = b.post('/api/entries', json={'client_id': 'e1', 'type': 'journal', 'text': 'Bob note'}, headers=auth(b))
        assert same_client_id.status_code == 200 and same_client_id.json()['entries'][0]['id'] != alice_entry['id'], 'client IDs are scoped per account'
        assert plan(b, 0, 'Bob task').status_code == 200 and plan(b, 1, 'Bob task 2').status_code == 200

        # Bulk import by Bob must not touch Alice either.
        assert b.post('/api/entries/import', json={'entries': [{'client_id': 'e1', 'type': 'journal', 'text': 'Bob note'}]}, headers=auth(b)).status_code == 200

        # Alice is unchanged.
        assert a.get('/api/planner').json()['tasks'][0]['title'] == 'Alice private task'
        assert a.get('/api/entries').json()['entries'][0]['text'] == 'Alice secret'
        with app.state.database.Session() as s:
            assert s.scalar(select(func.count()).select_from(Entry)) == 2


def test_a_forged_or_foreign_cookie_grants_nothing(tmp_path):
    app = make(tmp_path)
    with client(app) as a, client(app) as intruder:
        signup(a)
        stolen_hash = None
        with app.state.database.Session() as s:
            stolen_hash = s.scalar(select(LoginSession.token_hash))
        # Presenting the stored digest (what a database leak would expose) is not a valid session token.
        intruder.cookies.set(COOKIE, stolen_hash)
        assert intruder.get('/api/entries').status_code == 401
        assert intruder.get('/api/planner').status_code == 401
        assert intruder.get('/api/account/export').status_code == 401


def test_deleting_an_account_revokes_its_sessions_and_leaves_others_alone(tmp_path):
    app = make(tmp_path)
    with client(app) as a, client(app) as b, client(app) as a2:
        signup(a, 'alice'); signup(b, 'bob'); login(a2, 'alice')
        b.post('/api/entries', json={'client_id': 'k', 'type': 'journal', 'text': 'Bob keeps this'}, headers=auth(b))
        assert a.post('/api/auth/delete', json={'password': P}, headers=auth(a)).status_code == 200
        assert a2.get('/api/auth/me').json()['user'] is None
        assert b.get('/api/entries').json()['entries'][0]['text'] == 'Bob keeps this'


# --- session fixation and cookie attributes ---------------------------------------------------

def test_session_fixation_a_planted_cookie_is_never_adopted(tmp_path):
    app = make(tmp_path)
    with client(app) as setup:
        signup(setup, 'alice')
    planted = 'attacker-chosen-session-value-0123456789abcdef'
    with client(app) as victim:
        r = victim.post('/api/auth/login', json={'username': 'alice', 'password': P}, headers={**H, 'Cookie': COOKIE + '=' + planted})
        assert r.status_code == 200
        issued = victim.cookies.get(COOKIE)
        assert issued and issued != planted, 'login must issue a fresh session value'
    with client(app) as attacker:
        assert attacker.get('/api/auth/me', headers={'Cookie': COOKIE + '=' + planted}).json()['user'] is None, 'the planted value must not authenticate'


def test_logout_makes_the_old_session_value_useless_and_a_new_login_gets_a_new_one(tmp_path):
    app = make(tmp_path)
    with client(app) as c:
        signup(c)
        first = c.cookies.get(COOKIE)
        assert c.post('/api/auth/logout', json={}, headers=auth(c)).status_code == 200
        with client(app) as replay:
            assert replay.get('/api/auth/me', headers={'Cookie': COOKIE + '=' + first}).json()['user'] is None
        login(c)
        second = c.cookies.get(COOKIE)
        assert second and second != first


def test_session_cookie_is_httponly_strict_and_secure_only_when_configured(tmp_path):
    for secure in (False, True):
        sub = tmp_path / ('secure' if secure else 'plain')
        sub.mkdir()
        app = make(sub, secure_cookies=secure)
        origin = 'https://localhost' if secure else 'http://localhost'
        with TestClient(app, base_url=origin) as c:
            r = c.post('/api/auth/register', json={'username': 'cookie-user', 'password': P}, headers={**H, 'Origin': origin})
            assert r.status_code == 200, r.text
            cookie = r.headers['set-cookie'].lower()
            assert 'httponly' in cookie and 'samesite=strict' in cookie
            assert ('; secure' in cookie) is secure


# --- operator kill switch for AI replies (AI_ENABLED) ---------------------------------------------

def _chat_body(text):
    return {'mode': 'ai', 'language': 'en', 'consent': True, 'messages': [{'role': 'user', 'content': text}]}


def test_kill_switch_stops_ai_replies_but_not_safety_replies_or_the_rest_of_the_site(tmp_path):
    app = make(tmp_path, api_key='test-key', model='test-model', ai_enabled=False)
    with client(app) as c:
        assert c.get('/api/health').json()['ai_enabled'] is False
        off = c.post('/api/chat', json=_chat_body('I have an exam tomorrow'), headers=CHAT)
        assert off.status_code == 503 and off.json()['error']['code'] == 'ai_disabled'
        crisis = c.post('/api/chat', json=_chat_body('I might kill myself'), headers=CHAT)
        assert crisis.status_code == 200 and crisis.json()['source'] == 'safety' and '116 123' in crisis.json()['reply']
        assert c.get('/').status_code == 200
        assert signup(c).status_code == 200 and c.get('/api/entries').status_code == 200


def test_kill_switch_reads_the_environment_and_defaults_to_on(monkeypatch):
    for value, expected in [('0', False), ('false', False), ('OFF', False), ('no', False), ('1', True), ('', True), ('yes', True)]:
        monkeypatch.setenv('AI_ENABLED', value)
        assert Settings.environment().ai_enabled is expected, value
    monkeypatch.delenv('AI_ENABLED')
    assert Settings.environment().ai_enabled is True
