from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import io

from app.core.database import get_db
from app.core.security import verify_api_key
from app.services.excel_report import ExcelReportService
from app.schemas.excel_report import (
    ExcelTemplateReportCreate,
    ExcelTemplateReportUpdate,
    ExcelTemplateReportResponse,
    ExcelTemplateReportListResponse,
    TemplateUploadResponse,
    PlaceholderMappingRequest,
    ShareResponse,
)

router = APIRouter()


# ==================== Excel Template Report CRUD Endpoints ====================


@router.get("", response_model=List[ExcelTemplateReportListResponse])
async def list_excel_reports(
    include_archived: bool = False,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Get all Excel template reports."""
    service = ExcelReportService(db)
    reports = await service.get_reports(include_archived)

    # Convert to list response
    return [
        ExcelTemplateReportListResponse(
            id=r.id,
            name=r.name,
            description=r.description,
            template_filename=r.template_filename,
            placeholder_count=len(r.placeholders) if r.placeholders else 0,
            mapped_count=len(r.mappings) if r.mappings else 0,
            is_public=r.is_public,
            is_archived=r.is_archived,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in reports
    ]


@router.get("/{report_id}", response_model=ExcelTemplateReportResponse)
async def get_excel_report(
    report_id: int,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Get a single Excel template report by ID."""
    service = ExcelReportService(db)
    report = await service.get_report(report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Excel report not found",
        )
    return report


@router.get("/shared/{share_token}", response_model=ExcelTemplateReportResponse)
async def get_shared_excel_report(
    share_token: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a shared Excel template report by token (no authentication required)."""
    service = ExcelReportService(db)
    report = await service.get_report_by_share_token(share_token)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Excel report not found or not shared",
        )
    return report


@router.post("", response_model=ExcelTemplateReportResponse, status_code=status.HTTP_201_CREATED)
async def create_excel_report(
    data: ExcelTemplateReportCreate,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Create a new Excel template report."""
    service = ExcelReportService(db)
    report = await service.create_report(data)
    return report


@router.put("/{report_id}", response_model=ExcelTemplateReportResponse)
async def update_excel_report(
    report_id: int,
    data: ExcelTemplateReportUpdate,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Update an Excel template report."""
    service = ExcelReportService(db)
    report = await service.update_report(report_id, data)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Excel report not found",
        )
    return report


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_excel_report(
    report_id: int,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Delete an Excel template report."""
    service = ExcelReportService(db)
    deleted = await service.delete_report(report_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Excel report not found",
        )


# ==================== Template Upload Endpoints ====================


@router.post("/{report_id}/upload-template", response_model=TemplateUploadResponse)
async def upload_template(
    report_id: int,
    file: UploadFile = File(...),
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload an Excel template file.

    The template should contain placeholders in the format:
    - {{table:name}} - For table data (fills multiple rows/columns)
    - {{value:name}} - For single values
    - {{chart:name}} - For chart images (coming soon)
    """
    # Validate file type
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Excel files (.xlsx, .xls) are allowed",
        )

    # Read file content
    file_content = await file.read()

    service = ExcelReportService(db)
    try:
        placeholders, filename = await service.upload_template(
            report_id, file_content, file.filename
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

    return TemplateUploadResponse(
        message="Template uploaded successfully",
        filename=filename,
        placeholders=placeholders,
    )


# ==================== Mapping Endpoints ====================


@router.put("/{report_id}/mappings", response_model=ExcelTemplateReportResponse)
async def update_mappings(
    report_id: int,
    data: PlaceholderMappingRequest,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Update placeholder to data source mappings."""
    service = ExcelReportService(db)
    report = await service.update_mappings(report_id, data.mappings)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Excel report not found",
        )
    return report


# ==================== Generate/Download Endpoints ====================


@router.post("/{report_id}/generate")
async def generate_excel(
    report_id: int,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate an Excel file from the template with filled data.

    This endpoint fetches data for all mapped placeholders and fills them
    into the template, returning the generated Excel file.
    """
    service = ExcelReportService(db)
    report = await service.get_report(report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Excel report not found",
        )

    if not report.template_file_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No template uploaded for this report",
        )

    # Data fetcher function that will be called for each mapping
    # In a real implementation, this would fetch data from Metabase
    async def data_fetcher(mapping: dict) -> list:
        """
        Fetch data based on the mapping configuration.

        In production, this would:
        1. If type is 'visualization': Execute the visualization's query via Metabase
        2. If type is 'saved_query': Execute the saved query via Metabase
        3. If type is 'inline_query': Execute the SQL directly via Metabase
        """
        # TODO: Integrate with Metabase service to fetch actual data
        # For now, return placeholder data
        mapping_type = mapping.get('type')

        if mapping_type == 'visualization':
            # Return sample data structure
            return [
                ['Column 1', 'Column 2', 'Column 3'],
                ['Value 1', 100, 'A'],
                ['Value 2', 200, 'B'],
                ['Value 3', 300, 'C'],
            ]
        elif mapping_type == 'value':
            return [[12345]]  # Single value
        else:
            return []

    try:
        file_bytes, filename = await service.generate_excel(report_id, data_fetcher)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

    # Return as downloadable file
    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/{report_id}/preview")
async def preview_excel(
    report_id: int,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """
    Preview the Excel template with sample data.

    Returns a preview with first 5 rows of data for each table placeholder.
    """
    service = ExcelReportService(db)
    report = await service.get_report(report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Excel report not found",
        )

    # Return placeholder information with preview capability
    return {
        "report_id": report.id,
        "name": report.name,
        "template_filename": report.template_filename,
        "placeholders": report.placeholders,
        "mappings": report.mappings,
        "preview_available": bool(report.template_file_path),
    }


# ==================== Share Endpoints ====================


@router.post("/{report_id}/share", response_model=ShareResponse)
async def share_excel_report(
    report_id: int,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Generate a share link for an Excel template report."""
    service = ExcelReportService(db)
    report = await service.generate_share_token(report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Excel report not found",
        )

    return ShareResponse(
        share_url=f"/excel-reports/shared/{report.share_token}",
        share_token=report.share_token,
        is_public=report.is_public,
    )


@router.delete("/{report_id}/share", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_excel_share(
    report_id: int,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Revoke sharing for an Excel template report."""
    service = ExcelReportService(db)
    report = await service.revoke_share(report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Excel report not found",
        )


# ==================== Duplicate Endpoint ====================


@router.post("/{report_id}/duplicate", response_model=ExcelTemplateReportResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_excel_report(
    report_id: int,
    name: str = None,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Duplicate an Excel template report."""
    service = ExcelReportService(db)
    report = await service.duplicate_report(report_id, name)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Excel report not found",
        )
    return report
