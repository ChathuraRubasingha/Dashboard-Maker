from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime
from enum import Enum


class PlaceholderType(str, Enum):
    """Types of placeholders that can be used in Excel templates."""
    TABLE = "table"       # Full table data
    VALUE = "value"       # Single value
    CHART = "chart"       # Chart image


class DataSourceType(str, Enum):
    """Types of data sources for placeholders."""
    VISUALIZATION = "visualization"  # Existing saved visualization
    SAVED_QUERY = "saved_query"      # Saved query by ID
    INLINE_QUERY = "inline_query"    # Direct SQL query


class ExcelPlaceholder(BaseModel):
    """A detected placeholder in an Excel template."""
    id: str                           # Unique ID (UUID)
    placeholder: str                  # e.g., "{{table:sales_data}}"
    type: PlaceholderType             # table, value, chart
    name: str                         # e.g., "sales_data"
    sheet_name: str                   # Sheet where placeholder was found
    cell_reference: str               # e.g., "A5" or "B2"


class DataSourceMapping(BaseModel):
    """Mapping configuration for a placeholder to its data source."""
    type: DataSourceType
    source_id: Optional[int] = None   # Visualization or saved query ID
    query: Optional[str] = None       # Inline SQL query
    database_id: Optional[int] = None # Database ID for inline queries


class ExcelTemplateReportCreate(BaseModel):
    """Schema for creating a new Excel template report."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class ExcelTemplateReportUpdate(BaseModel):
    """Schema for updating an Excel template report."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    mappings: Optional[Dict[str, DataSourceMapping]] = None
    is_public: Optional[bool] = None
    is_archived: Optional[bool] = None


class ExcelTemplateReportResponse(BaseModel):
    """Schema for Excel template report response."""
    id: int
    name: str
    description: Optional[str]
    template_filename: Optional[str]
    placeholders: List[Dict[str, Any]]
    mappings: Dict[str, Any]
    is_public: bool
    share_token: Optional[str]
    is_archived: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ExcelTemplateReportListResponse(BaseModel):
    """Schema for Excel template report list response (lightweight)."""
    id: int
    name: str
    description: Optional[str]
    template_filename: Optional[str]
    placeholder_count: int
    mapped_count: int
    is_public: bool
    is_archived: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class TemplateUploadResponse(BaseModel):
    """Schema for template upload response."""
    message: str
    filename: str
    placeholders: List[ExcelPlaceholder]


class PlaceholderMappingRequest(BaseModel):
    """Schema for updating placeholder mappings."""
    mappings: Dict[str, DataSourceMapping]


class GenerateExcelResponse(BaseModel):
    """Schema for generate Excel response."""
    message: str
    filename: str
    download_url: str


class ShareResponse(BaseModel):
    """Schema for share response."""
    share_url: str
    share_token: str
    is_public: bool
