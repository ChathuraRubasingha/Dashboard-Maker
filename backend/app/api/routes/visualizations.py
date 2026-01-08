from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.core.security import verify_api_key
from app.services.visualization import VisualizationService
from app.schemas.visualization import (
    VisualizationCreate,
    VisualizationUpdate,
    VisualizationResponse,
    VisualizationCustomizationUpdate,
    VisualizationCustomizationResponse,
)

router = APIRouter()


@router.get("", response_model=List[VisualizationResponse])
async def list_visualizations(
    include_archived: bool = False,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Get all visualizations."""
    service = VisualizationService(db)
    visualizations = await service.get_visualizations(include_archived)
    return visualizations


@router.get("/{visualization_id}", response_model=VisualizationResponse)
async def get_visualization(
    visualization_id: int,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Get a single visualization by ID."""
    service = VisualizationService(db)
    visualization = await service.get_visualization(visualization_id)
    if not visualization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visualization not found",
        )
    return visualization


@router.get("/metabase/{metabase_question_id}", response_model=VisualizationResponse)
async def get_visualization_by_metabase_id(
    metabase_question_id: int,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Get visualization by Metabase question ID."""
    service = VisualizationService(db)
    visualization = await service.get_visualization_by_metabase_id(metabase_question_id)
    if not visualization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visualization not found",
        )
    return visualization


@router.post("", response_model=VisualizationResponse, status_code=status.HTTP_201_CREATED)
async def create_visualization(
    data: VisualizationCreate,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Create a new visualization."""
    service = VisualizationService(db)
    visualization = await service.create_visualization(data)
    return visualization


@router.put("/{visualization_id}", response_model=VisualizationResponse)
async def update_visualization(
    visualization_id: int,
    data: VisualizationUpdate,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Update a visualization."""
    service = VisualizationService(db)
    visualization = await service.update_visualization(visualization_id, data)
    if not visualization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visualization not found",
        )
    return visualization


@router.delete("/{visualization_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_visualization(
    visualization_id: int,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Delete a visualization."""
    service = VisualizationService(db)
    deleted = await service.delete_visualization(visualization_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visualization not found",
        )


# ==================== Customization Endpoints ====================


@router.get("/{visualization_id}/customization", response_model=VisualizationCustomizationResponse)
async def get_customization(
    visualization_id: int,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Get customization for a visualization."""
    service = VisualizationService(db)

    # Verify visualization exists
    visualization = await service.get_visualization(visualization_id)
    if not visualization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visualization not found",
        )

    customization = await service.get_customization(visualization_id)
    if not customization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customization not found",
        )
    return customization


@router.put("/{visualization_id}/customization", response_model=VisualizationCustomizationResponse)
async def update_customization(
    visualization_id: int,
    data: VisualizationCustomizationUpdate,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Update (or create) customization for a visualization."""
    service = VisualizationService(db)

    # Verify visualization exists
    visualization = await service.get_visualization(visualization_id)
    if not visualization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visualization not found",
        )

    customization = await service.update_customization(visualization_id, data)
    return customization


@router.delete("/{visualization_id}/customization", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customization(
    visualization_id: int,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Delete customization for a visualization (reset to defaults)."""
    service = VisualizationService(db)

    # Verify visualization exists
    visualization = await service.get_visualization(visualization_id)
    if not visualization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visualization not found",
        )

    deleted = await service.delete_customization(visualization_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customization not found",
        )
