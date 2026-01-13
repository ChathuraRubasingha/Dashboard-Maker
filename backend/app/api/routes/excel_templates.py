from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from io import BytesIO

from app.core.database import get_db
from app.core.security import verify_api_key
from app.services.excel_template_service import ExcelTemplateService, ExcelReportService
from app.services.visualization import VisualizationService
from app.schemas.excel_template import (
    ExcelTemplateCreate,
    ExcelTemplateUpdate,
    ExcelTemplateResponse,
    ExcelTemplateListResponse,
    TemplateUploadResponse,
    ExcelReportCreate,
    ExcelReportUpdate,
    ExcelReportResponse,
    ExcelReportListResponse,
    ExcelReportShareResponse,
)

router = APIRouter()


# ============ Template Endpoints ============

@router.get("/templates", response_model=List[ExcelTemplateListResponse])
async def list_templates(
    include_archived: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_api_key)
):
    """List all Excel templates."""
    service = ExcelTemplateService(db)
    templates = await service.get_templates(include_archived=include_archived)
    return templates


@router.post("/templates", response_model=ExcelTemplateResponse)
async def create_template(
    data: ExcelTemplateCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_api_key)
):
    """Create a new Excel template."""
    service = ExcelTemplateService(db)
    template = await service.create_template(data)
    return template


@router.get("/templates/{template_id}", response_model=ExcelTemplateResponse)
async def get_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_api_key)
):
    """Get a single Excel template by ID."""
    service = ExcelTemplateService(db)
    template = await service.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.put("/templates/{template_id}", response_model=ExcelTemplateResponse)
async def update_template(
    template_id: int,
    data: ExcelTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_api_key)
):
    """Update an Excel template."""
    service = ExcelTemplateService(db)
    template = await service.update_template(template_id, data)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_api_key)
):
    """Delete an Excel template."""
    service = ExcelTemplateService(db)
    success = await service.delete_template(template_id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted successfully"}


@router.post("/templates/{template_id}/upload", response_model=TemplateUploadResponse)
async def upload_template_file(
    template_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_api_key)
):
    """Upload an Excel file for a template."""
    # Validate file type
    if not file.filename or not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only .xlsx and .xls files are allowed."
        )

    service = ExcelTemplateService(db)
    try:
        template = await service.upload_template_file(template_id, file)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        return TemplateUploadResponse(
            message="Template uploaded and parsed successfully",
            template_id=template.id,
            file_name=template.file_name or "",
            structure=template.structure or {}
        )
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse template: {str(e)}")


# ============ Report Endpoints ============

@router.get("/reports", response_model=List[ExcelReportListResponse])
async def list_reports(
    include_archived: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_api_key)
):
    """List all Excel reports."""
    service = ExcelReportService(db)
    template_service = ExcelTemplateService(db)
    reports = await service.get_reports(include_archived=include_archived)

    # Add template names
    result = []
    for report in reports:
        report_data = {
            "id": report.id,
            "name": report.name,
            "description": report.description,
            "template_id": report.template_id,
            "template_name": None,
            "is_public": report.is_public,
            "is_archived": report.is_archived,
            "created_at": report.created_at,
            "updated_at": report.updated_at,
        }
        if report.template_id:
            template = await template_service.get_template(report.template_id)
            if template:
                report_data["template_name"] = template.name
        result.append(report_data)

    return result


@router.post("/reports", response_model=ExcelReportResponse)
async def create_report(
    data: ExcelReportCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_api_key)
):
    """Create a new Excel report from template."""
    # Verify template exists
    template_service = ExcelTemplateService(db)
    template = await template_service.get_template(data.template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    service = ExcelReportService(db)
    report = await service.create_report(data)

    return ExcelReportResponse(
        id=report.id,
        name=report.name,
        description=report.description,
        template_id=report.template_id,
        structure=template.structure,
        sheet_data=report.sheet_data or {},
        data_sources=report.data_sources or [],
        is_public=report.is_public,
        share_token=report.share_token,
        is_archived=report.is_archived,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


@router.get("/reports/{report_id}", response_model=ExcelReportResponse)
async def get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_api_key)
):
    """Get a single Excel report by ID."""
    service = ExcelReportService(db)
    report = await service.get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Get template structure
    structure = None
    if report.template_id:
        template_service = ExcelTemplateService(db)
        template = await template_service.get_template(report.template_id)
        if template:
            structure = template.structure

    return ExcelReportResponse(
        id=report.id,
        name=report.name,
        description=report.description,
        template_id=report.template_id,
        structure=structure,
        sheet_data=report.sheet_data or {},
        data_sources=report.data_sources or [],
        is_public=report.is_public,
        share_token=report.share_token,
        is_archived=report.is_archived,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


@router.put("/reports/{report_id}", response_model=ExcelReportResponse)
async def update_report(
    report_id: int,
    data: ExcelReportUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_api_key)
):
    """Update an Excel report."""
    service = ExcelReportService(db)
    report = await service.update_report(report_id, data)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Get template structure
    structure = None
    if report.template_id:
        template_service = ExcelTemplateService(db)
        template = await template_service.get_template(report.template_id)
        if template:
            structure = template.structure

    return ExcelReportResponse(
        id=report.id,
        name=report.name,
        description=report.description,
        template_id=report.template_id,
        structure=structure,
        sheet_data=report.sheet_data or {},
        data_sources=report.data_sources or [],
        is_public=report.is_public,
        share_token=report.share_token,
        is_archived=report.is_archived,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


@router.delete("/reports/{report_id}")
async def delete_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_api_key)
):
    """Delete an Excel report."""
    service = ExcelReportService(db)
    success = await service.delete_report(report_id)
    if not success:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"message": "Report deleted successfully"}


@router.post("/reports/{report_id}/share", response_model=ExcelReportShareResponse)
async def share_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_api_key)
):
    """Generate or regenerate a share link for a report."""
    service = ExcelReportService(db)
    report = await service.generate_share_token(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return ExcelReportShareResponse(
        share_url=f"/shared/excel-report/{report.share_token}",
        share_token=report.share_token,
        is_public=report.is_public,
    )


@router.delete("/reports/{report_id}/share")
async def revoke_report_share(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_api_key)
):
    """Revoke sharing for a report."""
    service = ExcelReportService(db)
    report = await service.revoke_share(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"message": "Share link revoked"}


@router.post("/reports/{report_id}/download")
async def download_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_api_key)
):
    """Download Excel report with data filled in."""
    import logging
    logger = logging.getLogger(__name__)

    service = ExcelReportService(db)
    report = await service.get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    logger.info(f"Downloading report {report_id}: {report.name}")
    logger.info(f"Data sources: {report.data_sources}")

    # Get visualization data for all data sources
    visualization_data: Dict[int, List[Dict[str, Any]]] = {}
    if report.data_sources:
        viz_service = VisualizationService(db)
        for ds in report.data_sources:
            viz_id = ds.get("visualization_id")
            if viz_id:
                try:
                    logger.info(f"Fetching data for visualization {viz_id}")
                    data = await viz_service.execute_visualization(viz_id)
                    if data and "rows" in data:
                        visualization_data[viz_id] = data["rows"]
                        logger.info(f"Got {len(data['rows'])} rows for viz {viz_id}")
                    else:
                        logger.warning(f"No data returned for visualization {viz_id}")
                except Exception as e:
                    logger.error(f"Error fetching visualization {viz_id}: {e}")

    logger.info(f"Visualization data keys: {list(visualization_data.keys())}")

    try:
        excel_bytes = await service.generate_excel(report_id, visualization_data)
        if not excel_bytes:
            raise HTTPException(status_code=500, detail="Failed to generate Excel file")

        filename = f"{report.name.replace(' ', '_')}.xlsx"
        return StreamingResponse(
            BytesIO(excel_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except RuntimeError as e:
        logger.error(f"Error generating Excel: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/shared/{share_token}", response_model=ExcelReportResponse)
async def get_shared_report(
    share_token: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a public shared report by share token."""
    service = ExcelReportService(db)
    report = await service.get_report_by_share_token(share_token)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or not public")

    # Get template structure
    structure = None
    if report.template_id:
        template_service = ExcelTemplateService(db)
        template = await template_service.get_template(report.template_id)
        if template:
            structure = template.structure

    return ExcelReportResponse(
        id=report.id,
        name=report.name,
        description=report.description,
        template_id=report.template_id,
        structure=structure,
        sheet_data=report.sheet_data or {},
        data_sources=report.data_sources or [],
        is_public=report.is_public,
        share_token=report.share_token,
        is_archived=report.is_archived,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )
