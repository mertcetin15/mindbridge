"""Optional account email: verification and password reset by single-use link (no real mail is sent)."""
import re
import time

from fastapi.testclient import TestClient
from sqlalchemy import select, update

from backend.app import Settings, create_app
from backend.database import COOKIE
from backend.email_accounts import EmailToken, UserEmail, RESET_SECONDS

P = 'long-test-password'
NEW = 'a-brand-new-password'
H = {'X-MindBridge-Client': 'v5', 'Origin': 'http://localhost'}


class Outbox:
    enabled = True

    def __init__(self):
        self.sent = []

    def send(self, to, subject, body):
        self.sent.append((to, subject, body))
        return True


def make(tmp_path, mail=True):
    app = create_app(Settings(database_url='sqlite+pysqlite:///' + str(tmp_path / 'm.db'), auth_limit=1000))
    app.state.mailer = Outbox() if mail else app.state.mailer
    return app


def client(app):
    return TestClient(app, base_url='http://localhost')


def signup(c, name='alice'):
    r = c.post('/api/auth/register', json={'username': name, 'password': P}, headers=H)
    assert r.status_code == 200, r.text
    return {**H, 'X-CSRF-Token': r.json()['csrf']}


def add_email(c, headers, address='alice@example.com', password=P):
    return c.post('/api/auth/email', json={'password': password, 'email': address}, headers=headers)


def token_from(outbox, marker, index=-1):
    return re.search(marker + r'=([A-Za-z0-9_-]+)', outbox.sent[index][2]).group(1)


def verified_account(app, name='alice', address='alice@example.com'):
    c = client(app)
    with c:
        headers = signup(c, name)
        assert add_email(c, headers, address).status_code == 200
        link = token_from(app.state.mailer, '#verify')
        assert client(app).post('/api/auth/verify-email', json={'token': link}, headers=H).status_code == 200
    return link


def test_email_features_are_off_until_the_operator_configures_a_mail_server(tmp_path):
    app = make(tmp_path, mail=False)
    with client(app) as c:
        headers = signup(c)
        assert c.get('/api/health').json()['mail_enabled'] is False
        assert c.get('/api/auth/email').json()['mail_enabled'] is False
        assert add_email(c, headers).status_code == 503
        assert c.post('/api/auth/forgot', json={'email': 'alice@example.com'}, headers=H).status_code == 503


def test_adding_an_address_needs_the_password_and_sends_one_confirmation_link(tmp_path):
    app = make(tmp_path)
    with client(app) as c:
        headers = signup(c)
        assert add_email(c, headers, password='wrong-password-123').status_code == 401
        assert add_email(c, {**H}).status_code in (401, 403), 'no CSRF token, no email'
        assert add_email(c, headers, 'not-an-address').status_code == 422
        r = add_email(c, headers, ' Alice@Example.COM ')
        assert r.status_code == 200 and r.headers['cache-control'] == 'no-store'
        assert len(app.state.mailer.sent) == 1
        to, subject, body = app.state.mailer.sent[0]
        assert to == 'alice@example.com' and '#verify=' in body and P not in body and 'alice' not in body.split('http')[0]
        assert c.get('/api/auth/email').json() == {'has_email': True, 'email': 'a***@example.com', 'verified': False, 'mail_enabled': True}


def test_only_a_hash_of_each_link_token_is_stored(tmp_path):
    app = make(tmp_path)
    with client(app) as c:
        add_email(c, signup(c))
        raw = token_from(app.state.mailer, '#verify')
        with app.state.database.Session() as s:
            rows = s.scalars(select(EmailToken)).all()
            assert len(rows) == 1 and raw not in rows[0].token_hash and len(rows[0].token_hash) == 64


def test_confirming_works_once_and_bad_or_expired_links_are_refused_alike(tmp_path):
    app = make(tmp_path)
    with client(app) as c:
        add_email(c, signup(c))
        raw = token_from(app.state.mailer, '#verify')
    d = client(app)
    bad = d.post('/api/auth/verify-email', json={'token': 'A' * 43}, headers=H)
    assert bad.status_code == 400 and bad.json()['error']['code'] == 'invalid_link'
    ok = d.post('/api/auth/verify-email', json={'token': raw}, headers=H)
    assert ok.status_code == 200
    again = d.post('/api/auth/verify-email', json={'token': raw}, headers=H)
    assert again.status_code == 400 and again.json()['error']['code'] == 'invalid_link', 'a link works once'
    with client(app) as c2:
        headers = signup(c2, 'bob')
        add_email(c2, headers, 'bob@example.com')
        raw2 = token_from(app.state.mailer, '#verify')
        with app.state.database.Session.begin() as s:
            s.execute(update(EmailToken).values(expires_at=int(time.time()) - 5))
        expired = client(app).post('/api/auth/verify-email', json={'token': raw2}, headers=H)
        assert expired.status_code == 400 and expired.json()['error']['code'] == 'invalid_link'


def test_forgot_password_answers_identically_for_verified_unverified_and_unknown_addresses(tmp_path):
    app = make(tmp_path)
    verified_account(app, 'alice', 'alice@example.com')
    with client(app) as c:
        add_email(c, signup(c, 'bob'), 'bob@example.com')      # added, never confirmed
    before = len(app.state.mailer.sent)
    answers = []
    for address in ('alice@example.com', 'bob@example.com', 'nobody@example.com', 'not an address'):
        r = client(app).post('/api/auth/forgot', json={'email': address}, headers=H)
        answers.append((r.status_code, r.json(), r.headers['cache-control']))
    assert len({str(a) for a in answers}) == 1 and answers[0][0] == 200 and answers[0][1] == {'ok': True}
    new = app.state.mailer.sent[before:]
    assert len(new) == 1 and new[0][0] == 'alice@example.com' and '#reset=' in new[0][2], 'mail goes only to the verified address'


def test_reset_link_sets_a_new_password_signs_everything_out_and_works_once(tmp_path):
    app = make(tmp_path)
    verified_account(app)
    with client(app) as phone:
        r = phone.post('/api/auth/login', json={'username': 'alice', 'password': P}, headers=H)
        old_cookie = phone.cookies.get(COOKIE)
        client(app).post('/api/auth/forgot', json={'email': 'alice@example.com'}, headers=H)
        raw = token_from(app.state.mailer, '#reset')
        laptop = client(app)
        done = laptop.post('/api/auth/reset', json={'token': raw, 'new_password': NEW}, headers=H)
        assert done.status_code == 200 and done.json()['user']['username'] == 'alice' and done.headers['cache-control'] == 'no-store'
        assert laptop.cookies.get(COOKIE) and laptop.cookies.get(COOKIE) != old_cookie
        with client(app) as replay:
            assert replay.get('/api/auth/me', headers={'Cookie': COOKIE + '=' + old_cookie}).json()['user'] is None
        assert client(app).post('/api/auth/login', json={'username': 'alice', 'password': P}, headers=H).status_code == 401
        assert client(app).post('/api/auth/login', json={'username': 'alice', 'password': NEW}, headers=H).status_code == 200
        again = client(app).post('/api/auth/reset', json={'token': raw, 'new_password': 'yet-another-password-9'}, headers=H)
        assert again.status_code == 400 and again.json()['error']['code'] == 'invalid_link'


def test_a_reset_link_expires_after_thirty_minutes_and_a_newer_link_cancels_the_older_one(tmp_path):
    app = make(tmp_path)
    verified_account(app)
    for _ in range(2):
        client(app).post('/api/auth/forgot', json={'email': 'alice@example.com'}, headers=H)
    first, second = token_from(app.state.mailer, '#reset', -2), token_from(app.state.mailer, '#reset', -1)
    assert first != second
    assert client(app).post('/api/auth/reset', json={'token': first, 'new_password': NEW}, headers=H).status_code == 400, 'the older link was cancelled'
    with app.state.database.Session.begin() as s:
        s.execute(update(EmailToken).values(expires_at=int(time.time()) - 1))
    assert client(app).post('/api/auth/reset', json={'token': second, 'new_password': NEW}, headers=H).status_code == 400
    assert RESET_SECONDS == 1800


def test_nobody_can_claim_an_address_by_typing_it(tmp_path):
    app = make(tmp_path)
    with client(app) as squatter:
        add_email(squatter, signup(squatter, 'mallory'), 'alice@example.com')   # typed, never confirmed
        squat_link = token_from(app.state.mailer, '#verify')
    verified_account(app, 'alice', 'alice@example.com')
    r = client(app).post('/api/auth/verify-email', json={'token': squat_link}, headers=H)
    assert r.status_code == 400, "the squatter's row was removed when the owner confirmed"
    client(app).post('/api/auth/forgot', json={'email': 'alice@example.com'}, headers=H)
    assert app.state.mailer.sent[-1][0] == 'alice@example.com'
    token = token_from(app.state.mailer, '#reset')
    with app.state.database.Session() as s:
        owner = s.scalar(select(UserEmail).where(UserEmail.verified_at.is_not(None)))
        assert s.scalars(select(UserEmail)).all() == [owner]
    assert client(app).post('/api/auth/reset', json={'token': token, 'new_password': NEW}, headers=H).json()['user']['username'] == 'alice'


def test_more_than_five_reset_requests_an_hour_send_nothing_but_look_the_same(tmp_path):
    app = make(tmp_path)
    verified_account(app)
    before = len(app.state.mailer.sent)
    replies = [client(app).post('/api/auth/forgot', json={'email': 'alice@example.com'}, headers=H) for _ in range(8)]
    assert {r.status_code for r in replies} == {200} and len({str(r.json()) for r in replies}) == 1
    assert len(app.state.mailer.sent) - before == 5


def test_changing_or_removing_the_address_cancels_confirmation_and_links(tmp_path):
    app = make(tmp_path)
    verified_account(app)
    with client(app) as c:
        h = {**H, 'X-CSRF-Token': c.post('/api/auth/login', json={'username': 'alice', 'password': P}, headers=H).json()['csrf']}
        assert add_email(c, h, 'new@example.com').status_code == 200
        assert c.get('/api/auth/email').json()['verified'] is False, 'a new address starts unconfirmed'
        client(app).post('/api/auth/forgot', json={'email': 'new@example.com'}, headers=H)
        assert app.state.mailer.sent[-1][2].count('#reset=') == 0, 'an unconfirmed address cannot reset'
        assert c.post('/api/auth/email/remove', json={'password': 'wrong-password-123'}, headers=h).status_code == 401
        assert c.post('/api/auth/email/remove', json={'password': P}, headers=h).status_code == 200
        assert c.get('/api/auth/email').json()['has_email'] is False
        with app.state.database.Session() as s:
            assert s.scalars(select(EmailToken)).all() == []


def test_deleting_the_account_deletes_the_address_and_links(tmp_path):
    app = make(tmp_path)
    with client(app) as c:
        h = signup(c)
        add_email(c, h)
        assert c.post('/api/auth/delete', json={'password': P}, headers=h).status_code == 200
    with app.state.database.Session() as s:
        assert s.scalars(select(UserEmail)).all() == [] and s.scalars(select(EmailToken)).all() == []


def test_a_mail_server_that_cannot_be_reached_is_a_quiet_false_and_logs_no_address(tmp_path, caplog):
    from backend.mailer import Mailer
    mailer = Mailer('127.0.0.1', 1, sender='MindBridge <no-reply@example.com>', starttls=False)
    assert mailer.enabled and mailer.send('someone@example.com', 'subject', 'body with a link') is False
    assert 'someone@example.com' not in caplog.text and 'link' not in caplog.text
    assert Mailer().enabled is False and Mailer().send('a@b.co', 's', 'b') is False


def test_unauthenticated_email_status_is_refused(tmp_path):
    with client(make(tmp_path)) as c:
        assert c.get('/api/auth/email').status_code == 401
