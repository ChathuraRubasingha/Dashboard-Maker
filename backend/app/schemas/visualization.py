from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class VisualizationCustomizationBase(BaseModel):
    custom_colors: List[str] = [
        "#509EE3", "#88BF4D", "#A989C5", "#EF8C8C",
        "#F9D45C", "#F2A86F", "#98D9D9", "#7172AD"
    ]
    color_palette_name: str = "default"
    custom_labels: Dict[str, str] = {}
    x_axis_label: Optional[str] = None
    y_axis_label: Optional[str] = None
    x_axis_format: Optional[str] = None
    y_axis_format: Optional[str] = None
    show_legend: bool = True
    legend_position: str = "bottom"
    show_grid: bool = True
    grid_color: str = "#f0f0f0"
    show_data_labels: bool = False
    data_label_format: Optional[str] = None
    goal_lines: List[Dict[str, Any]] = []
    reference_lines: List[Dict[str, Any]] = []
    hidden_columns: List[str] = []
    column_order: List[str] = []
    column_widths: Dict[str, int] = {}
    conditional_formatting: List[Dict[str, Any]] = []
    enable_animations: bool = True


class VisualizationCustomizationCreate(VisualizationCustomizationBase):
    pass


class VisualizationCustomizationUpdate(BaseModel):
    custom_colors: Optional[List[str]] = None
    color_palette_name: Optional[str] = None
    custom_labels: Optional[Dict[str, str]] = None
    x_axis_label: Optional[str] = None
    y_axis_label: Optional[str] = None
    x_axis_format: Optional[str] = None
    y_axis_format: Optional[str] = None
    show_legend: Optional[bool] = None
    legend_position: Optional[str] = None
    show_grid: Optional[bool] = None
    grid_color: Optional[str] = None
    show_data_labels: Optional[bool] = None
    data_label_format: Optional[str] = None
    goal_lines: Optional[List[Dict[str, Any]]] = None
    reference_lines: Optional[List[Dict[str, Any]]] = None
    hidden_columns: Optional[List[str]] = None
    column_order: Optional[List[str]] = None
    column_widths: Optional[Dict[str, int]] = None
    conditional_formatting: Optional[List[Dict[str, Any]]] = None
    enable_animations: Optional[bool] = None


class VisualizationCustomizationResponse(VisualizationCustomizationBase):
    id: int
    visualization_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class VisualizationBase(BaseModel):
    name: str
    description: Optional[str] = None
    database_id: Optional[int] = None
    query_type: str = "native"
    native_query: Optional[str] = None
    mbql_query: Optional[Dict[str, Any]] = None
    visualization_type: str = "table"
    visualization_settings: Dict[str, Any] = {}


class VisualizationCreate(VisualizationBase):
    metabase_question_id: Optional[int] = None
    customization: Optional[VisualizationCustomizationCreate] = None


class VisualizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    metabase_question_id: Optional[int] = None
    database_id: Optional[int] = None
    query_type: Optional[str] = None
    native_query: Optional[str] = None
    mbql_query: Optional[Dict[str, Any]] = None
    visualization_type: Optional[str] = None
    visualization_settings: Optional[Dict[str, Any]] = None
    is_archived: Optional[bool] = None
    collection_id: Optional[int] = None


class VisualizationResponse(VisualizationBase):
    id: int
    metabase_question_id: Optional[int] = None
    is_archived: bool
    collection_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    customization: Optional[VisualizationCustomizationResponse] = None

    class Config:
        from_attributes = True
