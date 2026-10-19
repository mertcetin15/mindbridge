import pytest
from pathlib import Path
from sqlalchemy import inspect, text
from fastapi.testclient import TestClient
from backend.app import Settings, create_app
from backend.database import Database, Base, SchemaVersion, COOKIE
from backend.migrate import migrate_engine, check_engine


def test_migrate_new_and_repeated(tmp_path):
    db=Database('sqlite+pysqlite:///'+str(tmp_path/'new.db'))
    migrate_engine(db.engine);migrate_engine(db.engine);check_engine(db.engine)
    assert set(inspect(db.engine).get_table_names())=={'users','entries','login_sessions','schema_version','alembic_version','planners','recovery_codes'}
    db.close()


def test_adopt_legacy_preserves_records(tmp_path):
    db=Database('sqlite+pysqlite:///'+str(tmp_path/'legacy.db'))
    Base.metadata.create_all(db.engine,tables=[t for t in Base.metadata.sorted_tables if t.name not in ("planners","recovery_codes")])
    with db.Session.begin() as session: session.add(SchemaVersion(id=1,version=1))
    _,token=db.register('legacy','long-test-password')
    db.save_entries(token,[{'client_id':'original','type':'journal','text':'Keep my draft'}])
    migrate_engine(db.engine);check_engine(db.engine)
    assert db.list_entries(token)['entries'][0]['text']=='Keep my draft'
    db.close()


def test_migration_refuses_unknown_schema(tmp_path):
    db=Database('sqlite+pysqlite:///'+str(tmp_path/'unknown.db'))
    with db.engine.begin() as c: c.execute(text('CREATE TABLE unrelated (id INTEGER)'))
    with pytest.raises(RuntimeError,match='unknown legacy'): migrate_engine(db.engine)
    assert inspect(db.engine).get_table_names()==['unrelated']
    db.close()


def test_migration_refuses_future_version(tmp_path):
    db=Database('sqlite+pysqlite:///'+str(tmp_path/'future.db'))
    Base.metadata.create_all(db.engine,tables=[t for t in Base.metadata.sorted_tables if t.name not in ("planners","recovery_codes")])
    with db.Session.begin() as session:session.add(SchemaVersion(id=1,version=99))
    with pytest.raises(RuntimeError,match='Unsupported'):migrate_engine(db.engine)
    assert 'alembic_version' not in inspect(db.engine).get_table_names()
    db.close()


def test_release_assets_and_private_paths():
    with TestClient(create_app(Settings()),base_url='http://localhost') as c:
        page=c.get('/');assert page.status_code==200 and '/assets/app.js' in page.text
        assert c.get('/assets/app.js').status_code==200
        assert c.get('/assets/../../backend/database.py').status_code==404
        assert c.get('/data/mindbridge.sqlite3').status_code==404
        assert c.get('/frontend/accounts.js').status_code==404
        assert 'frame-ancestors' in page.headers['content-security-policy']
        assert c.get('/',headers={'host':'evil.example'}).status_code==400


def test_production_config_fails_closed():
    with pytest.raises(ValueError):Settings(production=True)
    with pytest.raises(ValueError):Settings(production=True,public_origin='http://example.com',secure_cookies=True,require_ai_login=True)
    with pytest.raises(ValueError):Settings(production=True,public_origin='https://example.com',secure_cookies=True,require_ai_login=True)
    s=Settings(production=True,public_origin='https://example.com',secure_cookies=True,require_ai_login=True,database_url='postgresql+psycopg://user:pass@localhost/mindbridge')
    assert s.production


def test_ai_requires_session_and_csrf():
    class Provider:
        async def reply(self,data):return 'Authenticated response'
    with TestClient(create_app(Settings(require_ai_login=True,api_key='test',model='test'),Provider()),base_url='http://localhost') as c:
        body={'mode':'ai','language':'en','consent':True,'messages':[{'role':'user','content':'Plan my study session'}]}
        headers={'X-MindBridge-Client':'v4','Origin':'http://localhost'}
        assert c.post('/api/chat',json=body,headers=headers).status_code==401
        auth=c.post('/api/auth/register',json={'username':'alice','password':'long-test-password'},headers={'X-MindBridge-Client':'v5'})
        assert auth.status_code==200
        assert c.post('/api/chat',json=body,headers=headers).status_code==403
        result=c.post('/api/chat',json=body,headers={**headers,'X-CSRF-Token':auth.json()['csrf']})
        assert result.status_code==200 and result.json()['source']=='ai'
