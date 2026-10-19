"""Real PostgreSQL checks. Isolated test DB only; never a production connection."""
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
import pytest
from sqlalchemy.engine import make_url
from backend.database import Database, DomainError

@pytest.fixture
def db():
    url=os.getenv('TEST_DATABASE_URL')
    if not url:pytest.skip('TEST_DATABASE_URL is not configured; PostgreSQL not verified')
    parsed=make_url(url)
    if parsed.drivername!='postgresql+psycopg' or not (parsed.database or '').endswith('_test'):
        pytest.fail('TEST_DATABASE_URL must point to PostgreSQL with a database name ending _test')
    db=Database(url);db.initialize();yield db;db.close()


def test_postgres_ownership_atomic_retry_and_cascade(db):
    suffix=uuid.uuid4().hex[:12]
    _,a=db.register('a_'+suffix,'long-test-password');_,b=db.register('b_'+suffix,'long-test-password')
    try:
        record={'client_id':'one','type':'journal','text':'Owner A only'}
        first=db.save_entries(a,[record])['entries'][0]
        assert db.save_entries(a,[record])['entries'][0]['id']==first['id']
        assert db.export(b)['entries']==[]
        with pytest.raises(DomainError):db.delete_entry(b,first['id'])
        with pytest.raises(DomainError):db.save_entries(a,[{'client_id':'two','type':'journal','text':'Rollback'},dict(record,text='Conflict')])
        assert db.list_entries(a)['total']==1
        db.delete_account(a,'long-test-password')
        with pytest.raises(DomainError):db.me(a)
    finally:
        for token in [a,b]:
            try:db.delete_account(token,'long-test-password')
            except DomainError:pass


def test_postgres_concurrent_idempotency(db):
    _,token=db.register('race_'+uuid.uuid4().hex[:12],'long-test-password')
    record={'client_id':'same','type':'journal','text':'Same retry'}
    try:
        with ThreadPoolExecutor(max_workers=4) as pool:
            results=list(pool.map(lambda _:db.save_entries(token,[record]),range(4)))
        assert len({r['entries'][0]['id'] for r in results})==1
        assert db.list_entries(token)['total']==1
    finally:db.delete_account(token,'long-test-password')
