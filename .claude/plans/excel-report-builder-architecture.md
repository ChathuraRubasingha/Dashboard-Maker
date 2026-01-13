# Excel Report Builder - Architecture Plan

## Overview

A comprehensive Excel-based report builder that allows users to:
1. Upload Excel templates with placeholders (Title, Topic, etc.)
2. Save templates to the database
3. Open templates in an interactive Excel grid builder
4. Map and insert data tables from saved visualizations
5. Preview live data in the sheet
6. Save as reports
7. Download as Excel files and share

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  Template Upload │  │  Excel Grid      │  │  Data Panel              │  │
│  │  - File picker   │  │  - Sheet view    │  │  - Available tables      │  │
│  │  - Preview       │  │  - Cell editing  │  │  - Drag & drop           │  │
│  │  - Save template │  │  - Formatting    │  │  - Column mapping        │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Excel Grid Component (using Handsontable or AG-Grid)                 │  │
│  │  - Spreadsheet-like interface                                         │  │
│  │  - Formula support                                                    │  │
│  │  - Merge cells                                                        │  │
│  │  - Styling (fonts, colors, borders)                                   │  │
│  │  - Multiple sheets support                                            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (FastAPI)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  Template API    │  │  Report API      │  │  Data API                │  │
│  │  POST /templates │  │  POST /reports   │  │  GET /visualizations     │  │
│  │  GET /templates  │  │  GET /reports    │  │  GET /viz/{id}/data      │  │
│  │  DELETE          │  │  PUT /reports    │  │                          │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Excel Service (openpyxl)                                             │  │
│  │  - Parse uploaded templates                                           │  │
│  │  - Extract structure (cells, styles, formulas)                        │  │
│  │  - Generate Excel files with data                                     │  │
│  │  - Handle formatting preservation                                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE (PostgreSQL)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  excel_templates                                                      │  │
│  │  - id, name, description                                              │  │
│  │  - file_path (stored .xlsx)                                           │  │
│  │  - structure (JSON - cells, styles, sheets)                           │  │
│  │  - created_at, updated_at                                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  excel_reports                                                        │  │
│  │  - id, name, description                                              │  │
│  │  - template_id (FK)                                                   │  │
│  │  - sheet_data (JSON - modified cells, data mappings)                  │  │
│  │  - data_sources (JSON - [{viz_id, cell_range, columns}])              │  │
│  │  - is_public, share_token                                             │  │
│  │  - created_at, updated_at                                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### 1. Excel Templates Table (New)

```sql
CREATE TABLE excel_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Original file storage
    file_path VARCHAR(500),           -- Path to stored .xlsx file
    file_name VARCHAR(255),           -- Original filename

    -- Parsed structure for frontend rendering
    structure JSONB DEFAULT '{}',     -- {sheets: [{name, cells, merges, styles}]}

    -- Metadata
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### 2. Excel Reports Table (Updated)

```sql
CREATE TABLE excel_reports (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Template reference
    template_id INTEGER REFERENCES excel_templates(id),

    -- Sheet modifications (cells edited by user)
    sheet_data JSONB DEFAULT '{}',    -- {sheets: [{name, cells: {A1: {value, style}}}]}

    -- Data source mappings
    data_sources JSONB DEFAULT '[]',  -- [{viz_id, sheet, start_cell, columns, include_header}]

    -- Sharing
    is_public BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(64) UNIQUE,

    -- Metadata
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);
```

---

## Data Structures

### Template Structure JSON

```typescript
interface TemplateStructure {
  sheets: Sheet[];
}

interface Sheet {
  name: string;
  cells: Record<string, Cell>;     // "A1" -> Cell
  merges: string[];                 // ["A1:C1", "B5:B10"]
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
}

interface Cell {
  value: string | number | null;
  formula?: string;                 // "=SUM(A1:A10)"
  style: CellStyle;
}

interface CellStyle {
  font?: {
    name?: string;
    size?: number;
    bold?: boolean;
    italic?: boolean;
    color?: string;
  };
  fill?: {
    color?: string;
  };
  border?: {
    top?: BorderStyle;
    bottom?: BorderStyle;
    left?: BorderStyle;
    right?: BorderStyle;
  };
  alignment?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'middle' | 'bottom';
    wrapText?: boolean;
  };
  numberFormat?: string;           // "#,##0.00"
}
```

### Data Source Mapping

```typescript
interface DataSourceMapping {
  id: string;                      // Unique mapping ID
  visualization_id: number;        // Source visualization
  sheet_name: string;              // Target sheet
  start_cell: string;              // "A5" - where data starts
  columns: ColumnMapping[];        // Which columns to include
  include_header: boolean;         // Include column headers
  auto_expand: boolean;            // Expand rows as data grows
}

interface ColumnMapping {
  source_column: string;           // Column name from visualization
  target_column: string;           // "A", "B", "C"
  format?: string;                 // Number format
}
```

---

## User Flow

### Flow 1: Create Template

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Upload    │────▶│   Parse     │────▶│   Preview   │────▶│    Save     │
│   .xlsx     │     │  Template   │     │  Structure  │     │  Template   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                    │                   │                   │
      ▼                    ▼                   ▼                   ▼
  User selects      Backend extracts     Frontend shows     Stored in DB
  Excel file        cells, styles,       grid preview       with structure
                    formulas, merges
```

### Flow 2: Build Report from Template

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Select    │────▶│   Load in   │────▶│  Add Data   │────▶│   Preview   │
│  Template   │     │ Excel Grid  │     │   Tables    │     │    Data     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                    │                   │                   │
      ▼                    ▼                   ▼                   ▼
  User picks        Grid renders        Drag tables to       Live data
  saved template    template cells      specific cells       fills cells
                                                                   │
                                                                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Edit     │◀────│    Save     │◀────│   Share     │◀────│  Download   │
│    Cells    │     │   Report    │     │   Report    │     │   Excel     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

---

## API Endpoints

### Template APIs

```
POST   /api/v1/excel-templates
       - Upload and parse Excel template
       - Returns: template_id, parsed structure

GET    /api/v1/excel-templates
       - List all templates

GET    /api/v1/excel-templates/{id}
       - Get template with full structure

DELETE /api/v1/excel-templates/{id}
       - Delete template
```

### Report APIs

```
POST   /api/v1/excel-reports
       - Create report from template
       - Body: {name, template_id}

GET    /api/v1/excel-reports/{id}
       - Get report with template structure + modifications

PUT    /api/v1/excel-reports/{id}
       - Update report (cell edits, data mappings)
       - Body: {sheet_data, data_sources}

POST   /api/v1/excel-reports/{id}/preview
       - Generate preview with live data
       - Returns: sheet structure with filled data

POST   /api/v1/excel-reports/{id}/download
       - Generate and download Excel file
       - Returns: .xlsx file blob

POST   /api/v1/excel-reports/{id}/share
       - Generate share link
```

---

## Frontend Components

### 1. Template Management

```
/excel-templates (list page)
├── TemplateCard
│   ├── Preview thumbnail
│   ├── Name, description
│   └── Actions (Edit, Delete, Create Report)
└── UploadTemplateModal
    ├── File dropzone
    ├── Name input
    └── Preview grid
```

### 2. Excel Grid Builder

```
/excel-reports/{id}/builder
├── Toolbar
│   ├── Save button
│   ├── Download button
│   ├── Share button
│   ├── Undo/Redo
│   └── Format tools (bold, align, etc.)
├── Sheet Tabs
│   └── Tab per sheet
├── Excel Grid (main area)
│   ├── Column headers (A, B, C...)
│   ├── Row numbers (1, 2, 3...)
│   ├── Cells (editable)
│   └── Selection highlight
└── Right Panel
    ├── Data Sources
    │   ├── Available Visualizations
    │   └── Drag handle
    ├── Inserted Tables
    │   ├── Table info (viz name, cell range)
    │   ├── Column selector
    │   └── Remove button
    └── Cell Properties
        ├── Value/Formula
        ├── Format
        └── Style options
```

### 3. Component Library Choice

**Recommended: Handsontable (MIT for non-commercial, paid for commercial)**
- Full spreadsheet functionality
- Excel-like experience
- Copy/paste support
- Formula support
- React wrapper available

**Alternative: AG-Grid Community**
- Free for basic use
- Good performance
- Limited Excel features

**Alternative: Luckysheet (Open Source)**
- Full Excel clone
- Free
- Chinese documentation (may need translation)

---

## Implementation Phases

### Phase 1: Template Management (Week 1)
- [ ] Create excel_templates table migration
- [ ] Template upload API with openpyxl parsing
- [ ] Template list/detail APIs
- [ ] Frontend template list page
- [ ] Upload modal with preview

### Phase 2: Excel Grid Component (Week 2)
- [ ] Install and configure Handsontable
- [ ] Create ExcelGrid component
- [ ] Render template structure in grid
- [ ] Cell editing and styling
- [ ] Sheet tabs navigation

### Phase 3: Data Integration (Week 3)
- [ ] Data sources panel
- [ ] Drag & drop table insertion
- [ ] Column mapping dialog
- [ ] Live data preview
- [ ] Auto-expand for dynamic data

### Phase 4: Report Management (Week 4)
- [ ] Save report with modifications
- [ ] Excel file generation with data
- [ ] Download functionality
- [ ] Share link generation
- [ ] Report list and management

---

## File Structure

```
frontend/src/
├── pages/
│   ├── ExcelTemplates.tsx        # Template list
│   ├── ExcelReportBuilder.tsx    # Main builder page
│   └── SharedExcelReport.tsx     # Public view
├── components/
│   └── excel/
│       ├── ExcelGrid.tsx         # Main grid component
│       ├── SheetTabs.tsx         # Sheet navigation
│       ├── Toolbar.tsx           # Formatting toolbar
│       ├── DataSourcePanel.tsx   # Right panel
│       ├── ColumnMapper.tsx      # Column mapping modal
│       └── TemplateUpload.tsx    # Upload component
├── services/
│   └── excelService.ts           # API calls
└── types/
    └── excel.ts                  # TypeScript types

backend/app/
├── models/
│   ├── excel_template.py         # Template model
│   └── excel_report.py           # Report model (updated)
├── schemas/
│   └── excel.py                  # Pydantic schemas
├── services/
│   └── excel_service.py          # Excel processing
└── api/routes/
    ├── excel_templates.py        # Template routes
    └── excel_reports.py          # Report routes
```

---

## Key Technical Decisions

### 1. Template Storage
- Store original .xlsx file for accurate regeneration
- Parse and store structure as JSON for frontend rendering
- Preserve all formatting, formulas, and merges

### 2. Data Mapping
- Map visualization columns to Excel columns
- Support multiple data sources per sheet
- Handle dynamic row expansion

### 3. Excel Generation
- Use openpyxl for server-side generation
- Apply template styles to data cells
- Preserve formulas and recalculate

### 4. Real-time Preview
- Fetch live data from visualizations
- Render in grid without generating file
- Update on data source changes

---

## Security Considerations

1. **File Upload Validation**
   - Validate file type (.xlsx only)
   - Limit file size (e.g., 10MB)
   - Scan for macros/malicious content

2. **Data Access**
   - Ensure user has access to visualization data
   - Validate data source mappings

3. **Share Links**
   - Use secure random tokens
   - Allow revocation
   - Optional: password protection

---

## Next Steps

1. Review and approve this architecture
2. Set up Handsontable or chosen grid library
3. Begin Phase 1 implementation
