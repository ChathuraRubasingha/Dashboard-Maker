from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime
from enum import Enum


class BlockType(str, Enum):
    TEXT = "text"
    VISUALIZATION = "visualization"
    TABLE = "table"
    DIVIDER = "divider"


class TextBlockStyle(BaseModel):
    """Styling for text blocks."""
    fontSize: int = 16
    fontWeight: str = "normal"  # normal, bold
    textAlign: str = "left"  # left, center, right
    color: str = "#000000"


class TextBlockConfig(BaseModel):
    """Configuration for text blocks."""
    content: str = ""
    style: TextBlockStyle = Field(default_factory=TextBlockStyle)


class VisualizationBlockConfig(BaseModel):
    """Configuration for visualization blocks."""
    visualization_id: int
    show_title: bool = True
    show_description: bool = False
    height: int = 300  # Height in pixels


class TableBlockConfig(BaseModel):
    """Configuration for table blocks (full data export)."""
    visualization_id: int
    show_title: bool = True
    export_all_rows: bool = True  # For Excel export
    max_preview_rows: int = 100  # For PDF preview


class DividerBlockConfig(BaseModel):
    """Configuration for divider blocks."""
    style: str = "solid"  # solid, dashed, dotted
    color: str = "#e5e7eb"
    margin: int = 20  # Margin top/bottom in pixels


class ReportBlock(BaseModel):
    """A single block in a report."""
    id: str  # UUID
    type: BlockType
    order: int
    config: Dict[str, Any]  # TextBlockConfig, VisualizationBlockConfig, etc.


class PageSettings(BaseModel):
    """Page settings for PDF export."""
    page_size: str = "A4"  # A4, Letter, Legal
    orientation: str = "portrait"  # portrait, landscape
    margins: Dict[str, int] = Field(default_factory=lambda: {
        "top": 20,
        "right": 20,
        "bottom": 20,
        "left": 20
    })


# Request/Response schemas

class ReportCreate(BaseModel):
    """Schema for creating a new report."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    elements: List[Dict[str, Any]] = Field(default_factory=list)
    blocks: List[ReportBlock] = Field(default_factory=list)
    settings: Optional[PageSettings] = None


class ReportUpdate(BaseModel):
    """Schema for updating a report."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    elements: Optional[List[Dict[str, Any]]] = None
    blocks: Optional[List[ReportBlock]] = None
    settings: Optional[PageSettings] = None
    is_public: Optional[bool] = None
    is_archived: Optional[bool] = None


class ReportResponse(BaseModel):
    """Schema for report response."""
    id: int
    name: str
    description: Optional[str]
    elements: List[Dict[str, Any]]
    blocks: List[Dict[str, Any]]
    settings: Dict[str, Any]
    is_public: bool
    share_token: Optional[str]
    is_archived: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ReportListResponse(BaseModel):
    """Schema for report list response (lightweight)."""
    id: int
    name: str
    description: Optional[str]
    block_count: int
    is_public: bool
    is_archived: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ExportRequest(BaseModel):
    """Schema for export request."""
    format: str = "pdf"  # pdf, excel


class ShareResponse(BaseModel):
    """Schema for share response."""
    share_url: str
    share_token: str
    is_public: bool
