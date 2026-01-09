from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Visualization(Base):
    """
    Custom visualization/question stored in our system.
    Can be linked to a Metabase question or be fully custom.
    """
    __tablename__ = "visualizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Reference to Metabase question (if exists)
    metabase_question_id = Column(Integer, nullable=True, index=True)

    # Query configuration (for custom queries)
    database_id = Column(Integer, nullable=True)  # Metabase database ID
    query_type = Column(String(20), default="native")  # native, mbql

    # Native SQL query
    native_query = Column(Text, nullable=True)

    # MBQL query (JSON format)
    mbql_query = Column(JSON, nullable=True)

    # Visualization type
    visualization_type = Column(String(50), default="table")  # table, bar, line, pie, area, etc.

    # Visualization settings (Metabase compatible)
    visualization_settings = Column(JSON, default={})

    # Metadata
    is_archived = Column(Boolean, default=False)
    is_query_locked = Column(Boolean, default=True)  # Lock query after creation (edit appearance only)
    collection_id = Column(Integer, nullable=True)  # Metabase collection ID

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    customization = relationship("VisualizationCustomization", back_populates="visualization", uselist=False, cascade="all, delete-orphan")
    dashboard_cards = relationship("DashboardCard", back_populates="visualization")


class VisualizationCustomization(Base):
    """
    Extended customization options for visualizations
    that go beyond what Metabase natively supports.
    """
    __tablename__ = "visualization_customizations"

    id = Column(Integer, primary_key=True, index=True)
    visualization_id = Column(Integer, ForeignKey("visualizations.id"), nullable=False, unique=True)

    # Color customization
    custom_colors = Column(JSON, default=[
        "#509EE3", "#88BF4D", "#A989C5", "#EF8C8C",
        "#F9D45C", "#F2A86F", "#98D9D9", "#7172AD"
    ])
    color_palette_name = Column(String(50), default="default")

    # Label customization
    custom_labels = Column(JSON, default={})

    # Axis customization
    x_axis_label = Column(String(255), nullable=True)
    y_axis_label = Column(String(255), nullable=True)
    x_axis_format = Column(String(50), nullable=True)
    y_axis_format = Column(String(50), nullable=True)

    # Legend
    show_legend = Column(Boolean, default=True)
    legend_position = Column(String(20), default="bottom")

    # Grid
    show_grid = Column(Boolean, default=True)
    grid_color = Column(String(20), default="#f0f0f0")

    # Data labels
    show_data_labels = Column(Boolean, default=False)
    data_label_format = Column(String(50), nullable=True)

    # Goal/reference lines
    goal_lines = Column(JSON, default=[])
    reference_lines = Column(JSON, default=[])

    # Table specific
    hidden_columns = Column(JSON, default=[])
    column_order = Column(JSON, default=[])
    column_widths = Column(JSON, default={})

    # Conditional formatting
    conditional_formatting = Column(JSON, default=[])

    # Animation
    enable_animations = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    visualization = relationship("Visualization", back_populates="customization")
