from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class Report(Base):
    """
    Report model - stores report metadata and block configuration.
    Reports are collections of visualization widgets, text blocks, and tables
    that can be exported as PDF or Excel.
    """
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Report content - array of blocks
    # Each block: { id, type, order, config }
    # Types: 'text', 'visualization', 'table', 'divider'
    blocks = Column(JSON, default=[])

    # Page settings
    settings = Column(JSON, default={
        "page_size": "A4",
        "orientation": "portrait",
        "margins": {
            "top": 20,
            "right": 20,
            "bottom": 20,
            "left": 20
        }
    })

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
