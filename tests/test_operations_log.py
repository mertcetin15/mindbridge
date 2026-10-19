"""Operational log: useful for finding a failed request, and incapable of recording what people write."""
import json
import logging

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from backend.app import Settings, create_app, LOG_FIELDS

CHAT = {'X-MindBridge-Client': 'v4', 'Origin': 'http://localhost'}
ACCOUNT = {'X-MindBridge-Client': 'v5', 'Origin': 'http://localhost'}
PASSWORD = 'long-test-password'
SECRET = 'My private journal sentence about exams'


@pytest.fixture
def records(caplog):
    caplog.set_level(logging.WARNING, logger='mindbridge')
    return lambda: [r for r in caplog.records if r.name == 'mindbridge']


class Failing:
    async def reply(self, data):
        raise RuntimeError('SECRET provider detail ' + data.messages[-1].content)


def chat(client, text='Help me plan my week', **extra):
    return client.post('/api/chat' + extra.pop('query', ''), headers=CHAT, json={'mode': 'ai', 'language': 'en', 'consent': True, 'messages': [{'role': 'user', 'content': text}]})


def client_for(provider=None, **settings):
    return TestClient(create_app(Settings(**settings), provider), base_url='http://localhost')


def test_a_provider_failure_is_logged_with_the_id_the_person_was_shown(records):
    with client_for(Failing(), api_key='k', model='m') as c:
        r = chat(c)
    assert r.status_code == 502
    entries = [json.loads(x.getMessage()) for x in records()]
    assert len(entries) == 1
    e = entries[0]
    assert e['event'] == 'server_error' and e['route'] == '/api/chat' and e['method'] == 'POST' and e['status'] == 502
    assert e['error_code'] == 'provider_unavailable' and isinstance(e['duration_ms'], int)
    assert e['request_id'] == r.headers['X-Request-ID'] == r.json()['request_id'], 'the quoted id finds the log line'


def test_only_allow_listed_fields_ever_appear(records):
    with client_for(Failing(), api_key='k', model='m') as c:
        chat(c)
    for x in records():
        assert set(json.loads(x.getMessage())) <= set(LOG_FIELDS)


def test_nothing_the_person_wrote_or_sent_reaches_the_log(records):
    with client_for(Failing(), api_key='k', model='m') as c:
        c.cookies.set('mb_session', 'COOKIE-VALUE-123')
        r = c.post('/api/chat?token=QUERY-SECRET', headers={**CHAT, 'X-CSRF-Token': 'CSRF-VALUE-456'},
                   json={'mode': 'ai', 'language': 'en', 'consent': True, 'messages': [{'role': 'user', 'content': SECRET}]})
    assert r.status_code == 502
    text = ' '.join(x.getMessage() + ' ' + str(x.args) + ' ' + str(x.exc_info) for x in records())
    for forbidden in (SECRET, 'journal', 'RuntimeError', 'SECRET provider', 'COOKIE-VALUE-123', 'CSRF-VALUE-456', 'QUERY-SECRET', 'token=', 'testclient', '127.0.0.1', 'mb_session'):
        assert forbidden not in text, forbidden
    assert r.text.count(SECRET) == 0, 'and the response never echoes it either'


def test_successful_and_ordinary_refusals_are_not_logged(records):
    class Fine:
        async def reply(self, data):
            return 'A calm suggestion.'
    with client_for(Fine(), api_key='k', model='m') as c:
        assert chat(c).status_code == 200
        assert c.get('/api/health').status_code == 200
        assert c.get('/api/entries').status_code == 401        # not signed in: normal, not an incident
        assert c.post('/api/chat', headers=CHAT, content='not json').status_code in (415, 422)
    assert records() == []


def test_rate_limit_refusals_are_counted_without_identifying_anyone(records):
    class Fine:
        async def reply(self, data):
            return 'ok'
    with client_for(Fine(), api_key='k', model='m', rate_limit=1) as c:
        assert chat(c).status_code == 200
        r = chat(c)
    assert r.status_code == 429
    e = [json.loads(x.getMessage()) for x in records()]
    assert [x['event'] for x in e] == ['rate_limited'] and e[0]['error_code'] == 'rate_limit' and e[0]['route'] == '/api/chat'


def test_a_database_failure_logs_the_route_template_not_the_record_id(records, tmp_path):
    app = create_app(Settings(database_url='sqlite+pysqlite:///' + str(tmp_path / 'ops.db'), auth_limit=100))
    with TestClient(app, base_url='http://localhost') as c:
        c.post('/api/auth/register', json={'username': 'opsuser', 'password': PASSWORD}, headers=ACCOUNT)
        csrf = c.get('/api/auth/me').json()['csrf']
        def boom(*a, **k):
            raise SQLAlchemyError('connection refused for opsuser')
        app.state.database.list_entries = boom
        app.state.database.delete_entry = boom
        assert c.get('/api/entries').status_code == 503
        secret_id = 'abcdef12-3456-7890-abcd-ef1234567890'
        assert c.post('/api/entries/' + secret_id + '/delete', json={}, headers={**ACCOUNT, 'X-CSRF-Token': csrf}).status_code == 503
    entries = [json.loads(x.getMessage()) for x in records()]
    assert [(e['route'], e['error_code'], e['status']) for e in entries] == [('/api/entries', 'storage_unavailable', 503), ('/api/entries/{entry_id}/delete', 'storage_unavailable', 503)]
    blob = ' '.join(x.getMessage() for x in records())
    assert secret_id not in blob and 'opsuser' not in blob and 'connection refused' not in blob


def test_an_unhandled_exception_gives_a_generic_500_with_an_id_and_logs_only_the_class(records):
    app = create_app(Settings())
    def boom():
        raise RuntimeError('SECRET message with ' + SECRET)
    app.add_api_route('/boom', boom)
    with TestClient(app, base_url='http://localhost') as c:
        r = c.get('/boom')
    assert r.status_code == 500 and r.json()['error'] == {'code': 'internal_error'} and r.json()['request_id'] == r.headers['X-Request-ID']
    assert 'Traceback' not in r.text and 'SECRET' not in r.text and 'content-security-policy' in r.headers, 'safe headers still apply'
    e = [json.loads(x.getMessage()) for x in records()]
    assert len(e) == 1 and e[0]['event'] == 'unhandled_exception' and e[0]['exc_type'] == 'RuntimeError' and e[0]['route'] == '/boom'
    assert 'SECRET' not in records()[0].getMessage() and SECRET not in records()[0].getMessage()


def test_routes_that_do_not_exist_are_logged_as_unmatched_not_by_path(records):
    app = create_app(Settings())
    app.add_api_route('/boom2', lambda: (_ for _ in ()).throw(ValueError('x')))
    with TestClient(app, base_url='http://localhost') as c:
        assert c.get('/boom2').status_code == 500
    assert json.loads(records()[0].getMessage())['route'] == '/boom2'
