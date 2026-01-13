from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON
from sqlalchemy.sql import func

from app.core.database import Base


class ExcelTemplate(Base):
    """
    Excel Template model - stores uploaded Excel templates.
    Templates are parsed and their structure is stored as JSON
    for rendering in the frontend grid.
    """
    __tablename__ = "excel_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Original file storage
    file_path = Column(String(500), nullable=True)  # Path to stored .xlsx file
    file_name = Column(String(255), nullable=True)  # Original filename

    # Parsed structure for frontend rendering
    # Structure: {
    #   sheets: [{
    #     name: string,
    #     cells: {A1: {value, formula, style}, ...},
    #     merges: ["A1:C1", ...],
    #     columnWidths: {0: 100, 1: 150, ...},
    #     rowHeights: {0: 25, 1: 30, ...}
    #   }]
    # }
    structure = Column(JSON, default={})

    # Metadata
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
