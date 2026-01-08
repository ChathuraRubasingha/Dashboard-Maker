from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.core.security import verify_api_key
from app.services.dashboard import DashboardService
from app.schemas.dashboard import (
    DashboardCreate,
    DashboardUpdate,
    DashboardResponse,
    DashboardCardCreate,
    DashboardCardUpdate,
    DashboardCardResponse,
    DashboardFilterCreate,
    DashboardFilterUpdate,
    DashboardFilterResponse,
    BulkCardUpdate,
)

router = APIRouter()


# ==================== Dashboard Endpoints ====================


@router.get("", response_model=List[DashboardResponse])
async def list_dashboards(
    include_archived: bool = False,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Get all dashboards."""
    service = DashboardService(db)
    dashboards = await service.get_dashboards(include_archived)
    return dashboards


@router.get("/{dashboard_id}", response_model=DashboardResponse)
async def get_dashboard(
    dashboard_id: int,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Get a single dashboard by ID."""
    service = DashboardService(db)
    dashboard = await service.get_dashboard(dashboard_id)
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found",
        )
    return dashboard


@router.get("/public/{public_uuid}", response_model=DashboardResponse)
async def get_public_dashboard(
    public_uuid: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a public dashboard by UUID (no authentication required)."""
    service = DashboardService(db)
    dashboard = await service.get_dashboard_by_public_uuid(public_uuid)
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found",
        )
    return dashboard


@router.post("", response_model=DashboardResponse, status_code=status.HTTP_201_CREATED)
async def create_dashboard(
    data: DashboardCreate,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Create a new dashboard."""
    service = DashboardService(db)
    dashboard = await service.create_dashboard(data)
    return dashboard


@router.put("/{dashboard_id}", response_model=DashboardResponse)
async def update_dashboard(
    dashboard_id: int,
    data: DashboardUpdate,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Update a dashboard."""
    service = DashboardService(db)
    dashboard = await service.update_dashboard(dashboard_id, data)
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found",
        )
    return dashboard


@router.delete("/{dashboard_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dashboard(
    dashboard_id: int,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Delete a dashboard."""
    service = DashboardService(db)
    deleted = await service.delete_dashboard(dashboard_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found",
        )


# ==================== Dashboard Card Endpoints ====================


@router.post("/{dashboard_id}/cards", response_model=DashboardCardResponse, status_code=status.HTTP_201_CREATED)
async def add_card(
    dashboard_id: int,
    data: DashboardCardCreate,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Add a card to a dashboard."""
    service = DashboardService(db)

    # Verify dashboard exists
    dashboard = await service.get_dashboard(dashboard_id)
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found",
        )

    card = await service.add_card(dashboard_id, data)
    return card


@router.put("/{dashboard_id}/cards/{card_id}", response_model=DashboardCardResponse)
async def update_card(
    dashboard_id: int,
    card_id: int,
    data: DashboardCardUpdate,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Update a card on a dashboard."""
    service = DashboardService(db)

    # Verify dashboard exists
    dashboard = await service.get_dashboard(dashboard_id)
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found",
        )

    card = await service.update_card(card_id, data)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found",
        )
    return card


@router.put("/{dashboard_id}/cards", response_model=List[DashboardCardResponse])
async def update_cards_bulk(
    dashboard_id: int,
    data: BulkCardUpdate,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple cards at once (for layout changes)."""
    service = DashboardService(db)

    # Verify dashboard exists
    dashboard = await service.get_dashboard(dashboard_id)
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found",
        )

    cards = await service.update_cards_bulk(dashboard_id, data.cards)
    return cards


@router.delete("/{dashboard_id}/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_card(
    dashboard_id: int,
    card_id: int,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Remove a card from a dashboard."""
    service = DashboardService(db)

    # Verify dashboard exists
    dashboard = await service.get_dashboard(dashboard_id)
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found",
        )

    deleted = await service.delete_card(card_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found",
        )


# ==================== Dashboard Filter Endpoints ====================


@router.post("/{dashboard_id}/filters", response_model=DashboardFilterResponse, status_code=status.HTTP_201_CREATED)
async def add_filter(
    dashboard_id: int,
    data: DashboardFilterCreate,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Add a filter to a dashboard."""
    service = DashboardService(db)

    # Verify dashboard exists
    dashboard = await service.get_dashboard(dashboard_id)
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found",
        )

    filter_obj = await service.add_filter(dashboard_id, data)
    return filter_obj


@router.put("/{dashboard_id}/filters/{filter_id}", response_model=DashboardFilterResponse)
async def update_filter(
    dashboard_id: int,
    filter_id: int,
    data: DashboardFilterUpdate,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Update a filter on a dashboard."""
    service = DashboardService(db)

    # Verify dashboard exists
    dashboard = await service.get_dashboard(dashboard_id)
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found",
        )

    filter_obj = await service.update_filter(filter_id, data)
    if not filter_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Filter not found",
        )
    return filter_obj


@router.delete("/{dashboard_id}/filters/{filter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_filter(
    dashboard_id: int,
    filter_id: int,
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Remove a filter from a dashboard."""
    service = DashboardService(db)

    # Verify dashboard exists
    dashboard = await service.get_dashboard(dashboard_id)
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found",
        )

    deleted = await service.delete_filter(filter_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Filter not found",
        )


@router.put("/{dashboard_id}/filters/reorder", response_model=List[DashboardFilterResponse])
async def reorder_filters(
    dashboard_id: int,
    filter_ids: List[int],
    _api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Reorder filters on a dashboard."""
    service = DashboardService(db)

    # Verify dashboard exists
    dashboard = await service.get_dashboard(dashboard_id)
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found",
        )

    filters = await service.reorder_filters(dashboard_id, filter_ids)
    return filters
