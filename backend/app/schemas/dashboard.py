from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


# Layout configuration schema
class LayoutConfig(BaseModel):
    columns: int = 12
    row_height: int = 80
    margin: List[int] = [10, 10]
    container_padding: List[int] = [10, 10]
    breakpoints: Dict[str, int] = {
        "lg": 1200,
        "md": 996,
        "sm": 768,
        "xs": 480
    }


# Card styling schema
class CardStyling(BaseModel):
    border_radius: int = 8
    border_color: str = "#e0e0e0"
    border_width: int = 1
    shadow: str = "sm"
    background_color: str = "#ffffff"
    padding: int = 16


# Dashboard Card schemas
class DashboardCardBase(BaseModel):
    metabase_question_id: Optional[int] = None
    visualization_id: Optional[int] = None
    position_x: int = 0
    position_y: int = 0
    width: int = 4
    height: int = 3
    z_index: int = 0
    custom_styling: Optional[CardStyling] = None
    title_override: Optional[str] = None
    show_title: bool = True
    filter_mappings: List[Dict[str, Any]] = []
    responsive_layouts: Dict[str, Any] = {}


class DashboardCardCreate(DashboardCardBase):
    pass


class DashboardCardUpdate(BaseModel):
    metabase_question_id: Optional[int] = None
    visualization_id: Optional[int] = None
    position_x: Optional[int] = None
    position_y: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    z_index: Optional[int] = None
    custom_styling: Optional[CardStyling] = None
    title_override: Optional[str] = None
    show_title: Optional[bool] = None
    filter_mappings: Optional[List[Dict[str, Any]]] = None
    responsive_layouts: Optional[Dict[str, Any]] = None


class DashboardCardResponse(DashboardCardBase):
    id: int
    dashboard_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Dashboard Filter schemas
class DashboardFilterBase(BaseModel):
    name: str
    display_name: str
    filter_type: str  # text, number, date, dropdown
    default_value: Optional[Any] = None
    options: List[Any] = []
    options_query_id: Optional[int] = None
    position: int = 0
    width: str = "auto"
    is_required: bool = False
    date_range_type: Optional[str] = None


class DashboardFilterCreate(DashboardFilterBase):
    pass


class DashboardFilterUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    filter_type: Optional[str] = None
    default_value: Optional[Any] = None
    options: Optional[List[Any]] = None
    options_query_id: Optional[int] = None
    position: Optional[int] = None
    width: Optional[str] = None
    is_required: Optional[bool] = None
    date_range_type: Optional[str] = None


class DashboardFilterResponse(DashboardFilterBase):
    id: int
    dashboard_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Dashboard schemas
class DashboardBase(BaseModel):
    name: str
    description: Optional[str] = None
    layout_config: Optional[LayoutConfig] = None
    theme: str = "light"
    custom_css: Optional[str] = None
    background_color: str = "#ffffff"
    global_filters: List[Dict[str, Any]] = []
    is_public: bool = False


class DashboardCreate(DashboardBase):
    metabase_dashboard_id: Optional[int] = None


class DashboardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    metabase_dashboard_id: Optional[int] = None
    layout_config: Optional[LayoutConfig] = None
    theme: Optional[str] = None
    custom_css: Optional[str] = None
    background_color: Optional[str] = None
    global_filters: Optional[List[Dict[str, Any]]] = None
    is_public: Optional[bool] = None
    is_archived: Optional[bool] = None


class DashboardResponse(DashboardBase):
    id: int
    metabase_dashboard_id: Optional[int] = None
    public_uuid: Optional[str] = None
    is_archived: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    cards: List[DashboardCardResponse] = []
    filters: List[DashboardFilterResponse] = []

    class Config:
        from_attributes = True


# Bulk card update schema
class BulkCardUpdate(BaseModel):
    cards: List[Dict[str, Any]]  # List of {id, position_x, position_y, width, height}
