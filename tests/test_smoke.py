import importlib.util
from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from backend.app import Settings, create_app
from backend.database import User

spec = importlib.util.spec_from_file_location('smoke', Path(__file__).resolve().parents[1] / 'scripts' / 'smoke.py')
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


def failed(results):
    return [(n, d) for n, ok, d in results if not ok]


def test_a_healthy_local_app_passes_every_public_check():
    with TestClient(create_app(Settings()), base_url='http://localhost') as c:
        results = smoke.run(c)
    assert len(results) >= 14 and failed(results) == []


def test_the_default_run_creates_no_account_and_sends_no_chat(tmp_path):
    app = create_app(Settings(database_url='sqlite+pysqlite:///' + str(tmp_path / 's.db')))
    with TestClient(app, base_url='http://localhost') as c:
        results = smoke.run(c)
        with app.state.database.Session() as s:
            assert s.scalar(select(func.count()).select_from(User)) == 0
    assert not any('chat' in n.lower() or 'account' in n.lower() for n, _, _ in results), 'the default run names no chat or account step'


def test_the_account_flow_cleans_up_after_itself(tmp_path):
    app = create_app(Settings(database_url='sqlite+pysqlite:///' + str(tmp_path / 's2.db'), auth_limit=100))
    with TestClient(app, base_url='http://localhost') as c:
        results = smoke.run(c, with_account=True)
        assert failed(results) == [], failed(results)
        assert any('deleted again' in n for n, _, _ in results)
        with app.state.database.Session() as s:
            assert s.scalar(select(func.count()).select_from(User)) == 0, 'the throw-away account must not be left behind'


def test_it_fails_loudly_when_the_security_headers_are_missing():
    bare = FastAPI()

    @bare.get('/api/health')
    def health():
        return {'status': 'ok', 'release': 'x'}

    @bare.get('/')
    def home():
        return __import__('fastapi').responses.HTMLResponse('<html>MindBridge</html>')
    with TestClient(bare, base_url='http://localhost') as c:
        problems = dict(failed(smoke.run(c)))
    assert any('CSP' in n for n in problems) and any('security headers' in n for n in problems)
    assert any('ready' in n for n in problems), 'a missing readiness route is a failure, not a crash'


def test_an_unreachable_host_reports_instead_of_raising():
    def refuse(request):
        raise httpx.ConnectError('refused')
    client = httpx.Client(transport=httpx.MockTransport(refuse))
    results = smoke.run(client, 'http://nowhere.invalid')
    assert results and not results[0][1] and 'ConnectError' in results[0][2]


def test_a_down_database_is_reported_by_the_ready_check():
    app = create_app(Settings())
    with TestClient(app, base_url='http://localhost') as c:
        def down():
            raise RuntimeError('db down')
        app.state.database.ping = down
        names = dict(failed(smoke.run(c)))
    assert any('database answers' in n for n in names) and names[[n for n in names if 'database answers' in n][0]] == 'unavailable'


def test_the_command_line_wrapper_returns_the_right_status(monkeypatch, capsys):
    assert smoke.main([]) == 2
    app = create_app(Settings())
    monkeypatch.setattr(httpx, 'Client', lambda **kw: TestClient(app, base_url='http://localhost'))
    assert smoke.main(['http://localhost']) == 0
    assert 'passed, 0 failed' in capsys.readouterr().out
