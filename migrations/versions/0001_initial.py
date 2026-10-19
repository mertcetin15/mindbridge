"""Initial account schema; compatible with V5/V6 schema version 1."""
from alembic import op
import sqlalchemy as sa
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('schema_version', sa.Column('id',sa.Integer(),primary_key=True),sa.Column('version',sa.Integer(),nullable=False))
    op.create_table('users',sa.Column('id',sa.String(36),primary_key=True),sa.Column('username',sa.String(32),nullable=False,unique=True),sa.Column('password_hash',sa.String(256),nullable=False),sa.Column('created_at',sa.BigInteger(),nullable=False))
    op.create_table('login_sessions',sa.Column('token_hash',sa.String(64),primary_key=True),sa.Column('user_id',sa.String(36),sa.ForeignKey('users.id',ondelete='CASCADE'),nullable=False),sa.Column('expires_at',sa.BigInteger(),nullable=False))
    op.create_index('ix_login_sessions_user_id','login_sessions',['user_id'])
    op.create_index('ix_login_sessions_expires_at','login_sessions',['expires_at'])
    op.create_table('entries',sa.Column('id',sa.String(36),primary_key=True),sa.Column('user_id',sa.String(36),sa.ForeignKey('users.id',ondelete='CASCADE'),nullable=False),sa.Column('client_id',sa.String(128),nullable=False),sa.Column('kind',sa.String(16),nullable=False),sa.Column('content',sa.Text(),nullable=False),sa.Column('created_at',sa.BigInteger(),nullable=False),sa.UniqueConstraint('user_id','client_id',name='uq_entry_user_client'))
    op.create_index('ix_entries_user_date','entries',['user_id','created_at','id'])
    op.execute(sa.text('INSERT INTO schema_version (id, version) VALUES (1, 1)'))

def downgrade():
    raise RuntimeError('Destructive downgrade disabled. Restore a verified backup instead.')
