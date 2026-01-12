"""Create excel_template_reports table

Revision ID: create_excel_reports_001
Revises: add_query_locked_001
Create Date: 2026-01-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'create_excel_reports_001'
down_revision: Union[str, None] = 'add_query_locked_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'excel_template_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('template_file_path', sa.String(500), nullable=True),
        sa.Column('template_filename', sa.String(255), nullable=True),
        sa.Column('placeholders', sa.JSON(), nullable=True, server_default='[]'),
        sa.Column('mappings', sa.JSON(), nullable=True, server_default='{}'),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('share_token', sa.String(64), nullable=True, unique=True),
        sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_excel_template_reports_id', 'excel_template_reports', ['id'])
    op.create_index('ix_excel_template_reports_share_token', 'excel_template_reports', ['share_token'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_excel_template_reports_share_token', table_name='excel_template_reports')
    op.drop_index('ix_excel_template_reports_id', table_name='excel_template_reports')
    op.drop_table('excel_template_reports')
