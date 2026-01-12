"""Add elements column to reports table

Revision ID: add_elements_001
Revises: create_excel_reports_001
Create Date: 2026-01-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_elements_001'
down_revision: Union[str, None] = 'create_excel_reports_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add elements column for new ReportBro-style designer
    op.add_column('reports', sa.Column('elements', sa.JSON(), nullable=True, server_default='[]'))


def downgrade() -> None:
    op.drop_column('reports', 'elements')
