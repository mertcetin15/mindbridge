"""Persistent daily planner with optimistic revision checks."""
from alembic import op
import sqlalchemy as sa
revision='0002'
down_revision='0001'
branch_labels=None
depends_on=None

def upgrade():
    op.create_table('planners',sa.Column('user_id',sa.String(36),sa.ForeignKey('users.id',ondelete='CASCADE'),primary_key=True),sa.Column('revision',sa.Integer(),nullable=False),sa.Column('content',sa.Text(),nullable=False))

def downgrade():
    raise RuntimeError('Planner data would be lost. Restore a verified backup instead.')
