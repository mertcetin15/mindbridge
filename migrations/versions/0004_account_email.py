"""Optional account email and single-use email links (hashes only)."""
from alembic import op
import sqlalchemy as sa
revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'user_emails',
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('email', sa.String(254), nullable=False),
        sa.Column('verified_at', sa.BigInteger, nullable=True),
        sa.Column('created_at', sa.BigInteger, nullable=False),
    )
    op.create_index('ix_user_emails_email', 'user_emails', ['email'])
    op.create_table(
        'email_tokens',
        sa.Column('token_hash', sa.String(64), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('purpose', sa.String(8), nullable=False),
        sa.Column('expires_at', sa.BigInteger, nullable=False),
    )
    op.create_index('ix_email_tokens_user_id', 'email_tokens', ['user_id'])


def downgrade():
    # Only the optional email data is dropped; accounts, entries, plans and recovery codes are untouched.
    op.drop_table('email_tokens')
    op.drop_table('user_emails')
