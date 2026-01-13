"""Add excel_templates table and update excel_reports

Revision ID: add_excel_templates_001
Revises: add_elements_001
Create Date: 2026-01-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_excel_templates_001'
down_revision: Union[str, None] = 'add_elements_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create excel_templates table
    op.create_table(
        'excel_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('file_path', sa.String(500), nullable=True),
        sa.Column('file_name', sa.String(255), nullable=True),
        sa.Column('structure', sa.JSON(), nullable=True, server_default='{}'),
        sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_excel_templates_id', 'excel_templates', ['id'])

    # Add template_id column to excel_template_reports
    op.add_column('excel_template_reports', sa.Column('template_id', sa.Integer(), nullable=True))

    # Add sheet_data column for cell modifications
    op.add_column('excel_template_reports', sa.Column('sheet_data', sa.JSON(), nullable=True, server_default='{}'))

    # Add data_sources column for visualization mappings
    op.add_column('excel_template_reports', sa.Column('data_sources', sa.JSON(), nullable=True, server_default='[]'))


def downgrade() -> None:
    op.drop_column('excel_template_reports', 'data_sources')
    op.drop_column('excel_template_reports', 'sheet_data')
    op.drop_column('excel_template_reports', 'template_id')
    op.drop_index('ix_excel_templates_id', table_name='excel_templates')
    op.drop_table('excel_templates')
