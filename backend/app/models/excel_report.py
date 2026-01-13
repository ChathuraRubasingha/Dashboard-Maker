from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class ExcelTemplateReport(Base):
    """
    Excel Template Report model - stores Excel template reports that can be
    populated with data from queries/visualizations and downloaded as Excel files.

    Users can:
    1. Upload an Excel template with placeholders
    2. Or select a saved template from excel_templates table
    3. Map data sources to cells/ranges
    4. Generate filled Excel files
    """
    __tablename__ = "excel_template_reports"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Reference to saved template (new approach)
    template_id = Column(Integer, ForeignKey('excel_templates.id'), nullable=True)

    # Template file storage (legacy - for direct uploads)
    template_file_path = Column(String(500), nullable=True)  # Path to stored template
    template_filename = Column(String(255), nullable=True)   # Original filename

    # Detected placeholders from template (legacy)
    # Array of: { id, placeholder, type, sheet_name, cell_reference }
    placeholders = Column(JSON, default=[])

    # Placeholder to data source mappings (legacy)
    # Object: { placeholder_id: { type, source_id, query, database_id } }
    mappings = Column(JSON, default={})

    # Sheet modifications (new approach)
    # Structure: {sheets: [{name, cells: {A1: {value, style}, ...}}]}
    sheet_data = Column(JSON, default={})

    # Data source mappings (new approach)
    # Array of: [{id, visualization_id, sheet_name, start_cell, columns, include_header}]
    data_sources = Column(JSON, default=[])

    # Sharing
    is_public = Column(Boolean, default=False)
    share_token = Column(String(64), nullable=True, unique=True, index=True)

    # Metadata
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def generate_share_token(self):
        """Generate a unique share token for the report."""
        self.share_token = str(uuid.uuid4()).replace('-', '')[:32]
        return self.share_token
