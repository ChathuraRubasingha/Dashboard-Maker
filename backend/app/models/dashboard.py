from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Dashboard(Base):
    """
    Dashboard metadata - stores UI layout information that Metabase doesn't manage.
    The actual dashboard in Metabase is referenced by metabase_dashboard_id.
    """
    __tablename__ = "dashboards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Reference to Metabase dashboard
    metabase_dashboard_id = Column(Integer, nullable=True, index=True)

    # Layout configuration (grid system, breakpoints)
    layout_config = Column(JSON, default={
        "columns": 12,
        "row_height": 80,
        "margin": [10, 10],
        "container_padding": [10, 10],
        "breakpoints": {
            "lg": 1200,
            "md": 996,
            "sm": 768,
            "xs": 480
        }
    })

    # UI customizations
    theme = Column(String(50), default="light")
    custom_css = Column(Text, nullable=True)
    background_color = Column(String(20), default="#ffffff")

    # Global filters config
    global_filters = Column(JSON, default=[])

    # Sharing settings
    is_public = Column(Boolean, default=False)
    public_uuid = Column(String(36), nullable=True, unique=True, index=True)

    # Metadata
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    cards = relationship("DashboardCard", back_populates="dashboard", cascade="all, delete-orphan")
    filters = relationship("DashboardFilter", back_populates="dashboard", cascade="all, delete-orphan")


class DashboardCard(Base):
    """
    Individual card/visualization placement on a dashboard.
    Stores position, size, and styling information.
    """
    __tablename__ = "dashboard_cards"

    id = Column(Integer, primary_key=True, index=True)
    dashboard_id = Column(Integer, ForeignKey("dashboards.id"), nullable=False)

    # Reference to Metabase question
    metabase_question_id = Column(Integer, nullable=True, index=True)

    # Reference to local visualization (if not using Metabase)
    visualization_id = Column(Integer, ForeignKey("visualizations.id"), nullable=True)

    # Grid position (react-grid-layout compatible)
    position_x = Column(Integer, default=0)
    position_y = Column(Integer, default=0)
    width = Column(Integer, default=4)
    height = Column(Integer, default=3)

    # Responsive layouts (stored as JSON for each breakpoint)
    responsive_layouts = Column(JSON, default={})

    # Layering
    z_index = Column(Integer, default=0)

    # Card-specific styling
    custom_styling = Column(JSON, default={
        "border_radius": 8,
        "border_color": "#e0e0e0",
        "border_width": 1,
        "shadow": "sm",
        "background_color": "#ffffff",
        "padding": 16
    })

    # Card title override (optional)
    title_override = Column(String(255), nullable=True)
    show_title = Column(Boolean, default=True)

    # Filter parameter mapping
    filter_mappings = Column(JSON, default=[])

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    dashboard = relationship("Dashboard", back_populates="cards")
    visualization = relationship("Visualization", back_populates="dashboard_cards")


class DashboardFilter(Base):
    """
    Dashboard-level filter configuration.
    Maps UI filters to Metabase parameters.
    """
    __tablename__ = "dashboard_filters"

    id = Column(Integer, primary_key=True, index=True)
    dashboard_id = Column(Integer, ForeignKey("dashboards.id"), nullable=False)

    # Filter configuration
    name = Column(String(100), nullable=False)
    display_name = Column(String(255), nullable=False)
    filter_type = Column(String(50), nullable=False)  # text, number, date, dropdown

    # Default value
    default_value = Column(JSON, nullable=True)

    # For dropdown filters - list of options
    options = Column(JSON, default=[])
    options_query_id = Column(Integer, nullable=True)  # Metabase question ID for dynamic options

    # UI settings
    position = Column(Integer, default=0)
    width = Column(String(20), default="auto")
    is_required = Column(Boolean, default=False)

    # Date filter specific
    date_range_type = Column(String(50), nullable=True)  # relative, absolute, all_time

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    dashboard = relationship("Dashboard", back_populates="filters")
