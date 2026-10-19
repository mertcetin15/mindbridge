"""Optional one-time account recovery codes (hash only, one row per user)."""
from alembic import op
import sqlalchemy as sa
revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'recovery_codes',
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('code_hash', sa.String(256), nullable=False),
        sa.Column('created_at', sa.BigInteger, nullable=False),
    )


def downgrade():
    # Dropping the table only removes the ability to recover by code; no account, entry or plan is touched.
    op.drop_table('recovery_codes')
