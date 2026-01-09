from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import io

from app.core.database import get_db
from app.core.security import verify_api_key
from app.services.report import ReportService
from app.schemas.report import (
    ReportCreate,
    ReportUpdate,
    ReportResponse,
    ReportListResponse,
    ExportRequest,
    ShareResponse,
)

router = APIRouter()


# ==================== Report CRUD Endpoints ====================


@router.get("", response_model=List[ReportListResponse])
async def list_reports(
    include_archived: bool = False,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Get all reports."""
    service = ReportService(db)
    reports = await service.get_reports(include_archived)

    # Convert to list response with block_count
    return [
        ReportListResponse(
            id=r.id,
            name=r.name,
            description=r.description,
            block_count=len(r.blocks) if r.blocks else 0,
            is_public=r.is_public,
            is_archived=r.is_archived,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in reports
    ]


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Get a single report by ID."""
    service = ReportService(db)
    report = await service.get_report(report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )
    return report


@router.get("/shared/{share_token}", response_model=ReportResponse)
async def get_shared_report(
    share_token: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a shared report by token (no authentication required)."""
    service = ReportService(db)
    report = await service.get_report_by_share_token(share_token)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or not shared",
        )
    return report


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    data: ReportCreate,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Create a new report."""
    service = ReportService(db)
    report = await service.create_report(data)
    return report


@router.put("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: int,
    data: ReportUpdate,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Update a report."""
    service = ReportService(db)
    report = await service.update_report(report_id, data)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )
    return report


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: int,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Delete a report."""
    service = ReportService(db)
    deleted = await service.delete_report(report_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )


# ==================== Share Endpoints ====================


@router.post("/{report_id}/share", response_model=ShareResponse)
async def share_report(
    report_id: int,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Generate a share link for a report."""
    service = ReportService(db)
    report = await service.generate_share_token(report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )

    # The frontend will construct the full URL
    return ShareResponse(
        share_url=f"/reports/shared/{report.share_token}",
        share_token=report.share_token,
        is_public=report.is_public,
    )


@router.delete("/{report_id}/share", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_share(
    report_id: int,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Revoke sharing for a report."""
    service = ReportService(db)
    report = await service.revoke_share(report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )


# ==================== Duplicate Endpoint ====================


@router.post("/{report_id}/duplicate", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_report(
    report_id: int,
    name: str = None,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Duplicate a report."""
    service = ReportService(db)
    report = await service.duplicate_report(report_id, name)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )
    return report


# ==================== Export Endpoints ====================


@router.post("/{report_id}/export/pdf")
async def export_pdf(
    report_id: int,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Export report as PDF."""
    service = ReportService(db)
    report = await service.get_report(report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )

    # TODO: Implement PDF generation with puppeteer/weasyprint
    # For now, return a placeholder response
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="PDF export coming soon. Use the frontend print dialog for now.",
    )


@router.post("/{report_id}/export/excel")
async def export_excel(
    report_id: int,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Export report data as Excel."""
    service = ReportService(db)
    report = await service.get_report(report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )

    # TODO: Implement Excel generation with openpyxl
    # This will extract all visualization data and export as Excel with multiple sheets
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Excel export coming soon.",
    )
