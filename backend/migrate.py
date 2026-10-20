"""Explicit migrations; only adopt legacy databases after structural validation."""
from pathlib import Path
from alembic import command
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.autogenerate import compare_metadata
from sqlalchemy import inspect, text, MetaData

ROOT = Path(__file__).resolve().parents[1]
HEAD = '0004'

def migrate_engine(engine):
    from .database import Base
    from .planner import Planner  # register the new models
    from .recovery import RecoveryCode
    from .email_accounts import UserEmail, EmailToken
    legacy=MetaData()
    for name,table in Base.metadata.tables.items():
        if name not in ("planners","recovery_codes","user_emails","email_tokens"):table.to_metadata(legacy)
    config = Config(str(ROOT / 'alembic.ini'))
    with engine.begin() as connection:
        config.attributes['connection'] = connection
        tables = set(inspect(connection).get_table_names())
        if 'schema_version' in tables:
            version = connection.execute(text('SELECT version FROM schema_version WHERE id=1')).scalar()
            if version != 1:
                raise RuntimeError('Unsupported legacy schema version; no data was changed')
        if tables and 'alembic_version' not in tables:
            if tables != set(legacy.tables):
                raise RuntimeError('Incomplete or unknown legacy schema; refusing automatic adoption')
            differences = compare_metadata(MigrationContext.configure(connection), legacy)
            if differences:
                raise RuntimeError('Legacy schema differs from V6; manual migration required')
            command.stamp(config, '0001')
        command.upgrade(config, 'head')

def check_engine(engine):
    with engine.connect() as connection:
        if MigrationContext.configure(connection).get_current_revision() != HEAD:
            raise RuntimeError('Database migration required: python -m backend.migrate')

if __name__ == '__main__':
    import os
    from .database import Database
    url = os.environ.get('DATABASE_URL', 'sqlite+pysqlite:///' + str(ROOT/'data/mindbridge.sqlite3'))
    database = Database(url)
    try:
        migrate_engine(database.engine)
        print('Database migration completed: '+HEAD)
    finally:
        database.close()
