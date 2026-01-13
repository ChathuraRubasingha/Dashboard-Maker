from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime


# Cell style structures
class FontStyle(BaseModel):
    """Font styling for a cell."""
    name: Optional[str] = None
    size: Optional[int] = None
    bold: Optional[bool] = None
    italic: Optional[bool] = None
    color: Optional[str] = None


class FillStyle(BaseModel):
    """Fill/background styling for a cell."""
    color: Optional[str] = None


class BorderStyle(BaseModel):
    """Border style for one side."""
    style: Optional[str] = None  # thin, medium, thick, dashed, etc.
    color: Optional[str] = None


class BorderStyles(BaseModel):
    """All four borders for a cell."""
    top: Optional[BorderStyle] = None
    bottom: Optional[BorderStyle] = None
    left: Optional[BorderStyle] = None
    right: Optional[BorderStyle] = None


class AlignmentStyle(BaseModel):
    """Alignment styling for a cell."""
    horizontal: Optional[str] = None  # left, center, right
    vertical: Optional[str] = None    # top, middle, bottom
    wrapText: Optional[bool] = None


class CellStyle(BaseModel):
    """Complete styling for a cell."""
    font: Optional[FontStyle] = None
    fill: Optional[FillStyle] = None
    border: Optional[BorderStyles] = None
    alignment: Optional[AlignmentStyle] = None
    numberFormat: Optional[str] = None


class Cell(BaseModel):
    """A single cell in the spreadsheet."""
    value: Optional[Any] = None
    formula: Optional[str] = None
    style: Optional[CellStyle] = None


class Sheet(BaseModel):
    """A sheet in the workbook."""
    name: str
    cells: Dict[str, Cell] = Field(default_factory=dict)  # "A1" -> Cell
    merges: List[str] = Field(default_factory=list)       # ["A1:C1", "B5:B10"]
    columnWidths: Dict[int, float] = Field(default_factory=dict)
    rowHeights: Dict[int, float] = Field(default_factory=dict)


class TemplateStructure(BaseModel):
    """The complete structure of an Excel template."""
    sheets: List[Sheet] = Field(default_factory=list)


# Data source mapping structures
class ColumnMapping(BaseModel):
    """Mapping from source column to target column."""
    source_column: str          # Column name from visualization
    target_column: str          # "A", "B", "C", etc.
    header_label: Optional[str] = None  # Display name for Excel header (from custom_labels)
    format: Optional[str] = None  # Number format


class DataSourceMapping(BaseModel):
    """Mapping of a visualization to cells in the spreadsheet."""
    id: str                     # Unique mapping ID
    visualization_id: int       # Source visualization
    sheet_name: str             # Target sheet
    start_cell: str             # "A5" - where data starts
    columns: List[ColumnMapping] = Field(default_factory=list)
    include_header: bool = True
    auto_expand: bool = True    # Expand rows as data grows


# Request/Response schemas

class ExcelTemplateCreate(BaseModel):
    """Schema for creating a new Excel template."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class ExcelTemplateUpdate(BaseModel):
    """Schema for updating an Excel template."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_archived: Optional[bool] = None


class ExcelTemplateResponse(BaseModel):
    """Schema for Excel template response."""
    id: int
    name: str
    description: Optional[str]
    file_name: Optional[str]
    structure: Dict[str, Any]
    is_archived: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ExcelTemplateListResponse(BaseModel):
    """Schema for Excel template list response (lightweight)."""
    id: int
    name: str
    description: Optional[str]
    file_name: Optional[str]
    is_archived: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class TemplateUploadResponse(BaseModel):
    """Response after uploading a template file."""
    message: str
    template_id: int
    file_name: str
    structure: Dict[str, Any]


# Excel Report schemas (updated)

class ExcelReportCreate(BaseModel):
    """Schema for creating a new Excel report from template."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    template_id: int  # Reference to excel_templates
    data_sources: Optional[List[DataSourceMapping]] = None  # Data source mappings


class ExcelReportUpdate(BaseModel):
    """Schema for updating an Excel report."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    sheet_data: Optional[Dict[str, Any]] = None  # Cell modifications
    data_sources: Optional[List[DataSourceMapping]] = None
    is_public: Optional[bool] = None
    is_archived: Optional[bool] = None


class ExcelReportResponse(BaseModel):
    """Schema for Excel report response."""
    id: int
    name: str
    description: Optional[str]
    template_id: Optional[int]
    structure: Optional[Dict[str, Any]] = None  # Template structure
    sheet_data: Dict[str, Any]
    data_sources: List[Dict[str, Any]]
    is_public: bool
    share_token: Optional[str]
    is_archived: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ExcelReportListResponse(BaseModel):
    """Schema for Excel report list response."""
    id: int
    name: str
    description: Optional[str]
    template_id: Optional[int]
    template_name: Optional[str] = None
    is_public: bool
    is_archived: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ExcelReportPreviewRequest(BaseModel):
    """Request for generating a preview with live data."""
    data_sources: List[DataSourceMapping]


class ExcelReportPreviewResponse(BaseModel):
    """Response with preview data filled in."""
    structure: Dict[str, Any]  # Template structure with data filled in


class ExcelReportShareResponse(BaseModel):
    """Response after sharing a report."""
    share_url: str
    share_token: str
    is_public: bool
