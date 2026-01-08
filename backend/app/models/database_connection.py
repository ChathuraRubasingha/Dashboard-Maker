from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Text
from sqlalchemy.sql import func

from app.core.database import Base


class DatabaseConnectionMetadata(Base):
    """
    Additional metadata about database connections not stored in Metabase.
    This supplements the database connection info from Metabase.
    """
    __tablename__ = "database_connection_metadata"

    id = Column(Integer, primary_key=True, index=True)

    # Reference to Metabase database
    metabase_database_id = Column(Integer, unique=True, index=True, nullable=False)

    # Custom naming and categorization
    custom_name = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)  # production, staging, analytics, etc.
    tags = Column(JSON, default=[])

    # Custom schema documentation
    schema_documentation = Column(JSON, default={})

    # Table relationships (joins) documentation
    relationships = Column(JSON, default=[])

    # Access control metadata
    access_level = Column(String(50), default="private")  # public, private, restricted
    allowed_users = Column(JSON, default=[])

    # Sync settings
    auto_sync = Column(Boolean, default=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    sync_frequency = Column(String(50), default="daily")  # hourly, daily, weekly

    # Connection health
    is_healthy = Column(Boolean, default=True)
    last_health_check = Column(DateTime(timezone=True), nullable=True)
    health_check_error = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
