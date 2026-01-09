"""Add is_query_locked column to visualizations

Revision ID: add_query_locked_001
Revises:
Create Date: 2026-01-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_query_locked_001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_query_locked column with default True
    op.add_column('visualizations', sa.Column('is_query_locked', sa.Boolean(), nullable=False, server_default='true'))


def downgrade() -> None:
    op.drop_column('visualizations', 'is_query_locked')
