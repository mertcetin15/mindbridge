from alembic import context
from backend.database import Base

connection = context.config.attributes.get('connection')
if connection is None:
    raise RuntimeError('Use python -m backend.migrate; credentials stay in environment variables.')
context.configure(connection=connection, target_metadata=Base.metadata, compare_type=True)
with context.begin_transaction():
    context.run_migrations()
