from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
import uuid

from app.models.dashboard import Dashboard, DashboardCard, DashboardFilter
from app.schemas.dashboard import (
    DashboardCreate,
    DashboardUpdate,
    DashboardCardCreate,
    DashboardCardUpdate,
    DashboardFilterCreate,
    DashboardFilterUpdate,
)


class DashboardService:
    """Service for managing dashboard metadata in our database."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ==================== Dashboard Operations ====================

    async def get_dashboards(self, include_archived: bool = False) -> List[Dashboard]:
        """Get all dashboards."""
        query = select(Dashboard)
        if not include_archived:
            query = query.where(Dashboard.is_archived == False)
        query = query.options(selectinload(Dashboard.cards), selectinload(Dashboard.filters))
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_dashboard(self, dashboard_id: int) -> Optional[Dashboard]:
        """Get a single dashboard by ID."""
        query = select(Dashboard).where(Dashboard.id == dashboard_id)
        query = query.options(selectinload(Dashboard.cards), selectinload(Dashboard.filters))
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_dashboard_by_public_uuid(self, public_uuid: str) -> Optional[Dashboard]:
        """Get a public dashboard by its UUID."""
        query = (
            select(Dashboard)
            .where(Dashboard.public_uuid == public_uuid)
            .where(Dashboard.is_public == True)
            .options(selectinload(Dashboard.cards), selectinload(Dashboard.filters))
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_dashboard(self, data: DashboardCreate) -> Dashboard:
        """Create a new dashboard."""
        dashboard = Dashboard(
            name=data.name,
            description=data.description,
            metabase_dashboard_id=data.metabase_dashboard_id,
            layout_config=data.layout_config.model_dump() if data.layout_config else None,
            theme=data.theme,
            custom_css=data.custom_css,
            background_color=data.background_color,
            global_filters=data.global_filters,
            is_public=data.is_public,
        )
        if data.is_public:
            dashboard.public_uuid = str(uuid.uuid4())

        self.db.add(dashboard)
        await self.db.commit()

        # Reload with relationships to avoid lazy loading issues
        return await self.get_dashboard(dashboard.id)

    async def update_dashboard(self, dashboard_id: int, data: DashboardUpdate) -> Optional[Dashboard]:
        """Update a dashboard."""
        dashboard = await self.get_dashboard(dashboard_id)
        if not dashboard:
            return None

        update_data = data.model_dump(exclude_unset=True)

        # Handle layout_config separately if it's a Pydantic model
        if "layout_config" in update_data and update_data["layout_config"]:
            if hasattr(update_data["layout_config"], "model_dump"):
                update_data["layout_config"] = update_data["layout_config"].model_dump()

        # Generate public UUID if making public
        if update_data.get("is_public") and not dashboard.public_uuid:
            update_data["public_uuid"] = str(uuid.uuid4())

        for field, value in update_data.items():
            setattr(dashboard, field, value)

        await self.db.commit()

        # Reload with relationships to avoid lazy loading issues
        return await self.get_dashboard(dashboard_id)

    async def delete_dashboard(self, dashboard_id: int) -> bool:
        """Delete a dashboard."""
        dashboard = await self.get_dashboard(dashboard_id)
        if not dashboard:
            return False

        await self.db.delete(dashboard)
        await self.db.commit()
        return True

    # ==================== Dashboard Card Operations ====================

    async def get_card(self, card_id: int) -> Optional[DashboardCard]:
        """Get a single card by ID."""
        query = select(DashboardCard).where(DashboardCard.id == card_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def add_card(self, dashboard_id: int, data: DashboardCardCreate) -> DashboardCard:
        """Add a card to a dashboard."""
        card = DashboardCard(
            dashboard_id=dashboard_id,
            metabase_question_id=data.metabase_question_id,
            visualization_id=data.visualization_id,
            position_x=data.position_x,
            position_y=data.position_y,
            width=data.width,
            height=data.height,
            z_index=data.z_index,
            custom_styling=data.custom_styling.model_dump() if data.custom_styling else None,
            title_override=data.title_override,
            show_title=data.show_title,
            filter_mappings=data.filter_mappings,
            responsive_layouts=data.responsive_layouts,
        )
        self.db.add(card)
        await self.db.commit()
        await self.db.refresh(card)
        return card

    async def update_card(self, card_id: int, data: DashboardCardUpdate) -> Optional[DashboardCard]:
        """Update a card."""
        card = await self.get_card(card_id)
        if not card:
            return None

        update_data = data.model_dump(exclude_unset=True)

        # Handle custom_styling separately if it's a Pydantic model
        if "custom_styling" in update_data and update_data["custom_styling"]:
            if hasattr(update_data["custom_styling"], "model_dump"):
                update_data["custom_styling"] = update_data["custom_styling"].model_dump()

        for field, value in update_data.items():
            setattr(card, field, value)

        await self.db.commit()
        await self.db.refresh(card)
        return card

    async def update_cards_bulk(self, dashboard_id: int, cards_data: List[Dict[str, Any]]) -> List[DashboardCard]:
        """Update multiple cards at once (for layout changes)."""
        updated_cards = []
        for card_data in cards_data:
            card_id = card_data.pop("id")
            card = await self.get_card(card_id)
            if card and card.dashboard_id == dashboard_id:
                for field, value in card_data.items():
                    if hasattr(card, field):
                        setattr(card, field, value)
                updated_cards.append(card)

        await self.db.commit()
        return updated_cards

    async def delete_card(self, card_id: int) -> bool:
        """Delete a card."""
        card = await self.get_card(card_id)
        if not card:
            return False

        await self.db.delete(card)
        await self.db.commit()
        return True

    # ==================== Dashboard Filter Operations ====================

    async def get_filter(self, filter_id: int) -> Optional[DashboardFilter]:
        """Get a single filter by ID."""
        query = select(DashboardFilter).where(DashboardFilter.id == filter_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def add_filter(self, dashboard_id: int, data: DashboardFilterCreate) -> DashboardFilter:
        """Add a filter to a dashboard."""
        filter_obj = DashboardFilter(
            dashboard_id=dashboard_id,
            name=data.name,
            display_name=data.display_name,
            filter_type=data.filter_type,
            default_value=data.default_value,
            options=data.options,
            options_query_id=data.options_query_id,
            position=data.position,
            width=data.width,
            is_required=data.is_required,
            date_range_type=data.date_range_type,
        )
        self.db.add(filter_obj)
        await self.db.commit()
        await self.db.refresh(filter_obj)
        return filter_obj

    async def update_filter(self, filter_id: int, data: DashboardFilterUpdate) -> Optional[DashboardFilter]:
        """Update a filter."""
        filter_obj = await self.get_filter(filter_id)
        if not filter_obj:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(filter_obj, field, value)

        await self.db.commit()
        await self.db.refresh(filter_obj)
        return filter_obj

    async def delete_filter(self, filter_id: int) -> bool:
        """Delete a filter."""
        filter_obj = await self.get_filter(filter_id)
        if not filter_obj:
            return False

        await self.db.delete(filter_obj)
        await self.db.commit()
        return True

    async def reorder_filters(self, dashboard_id: int, filter_ids: List[int]) -> List[DashboardFilter]:
        """Reorder filters by updating their position."""
        for position, filter_id in enumerate(filter_ids):
            await self.db.execute(
                update(DashboardFilter)
                .where(DashboardFilter.id == filter_id)
                .where(DashboardFilter.dashboard_id == dashboard_id)
                .values(position=position)
            )
        await self.db.commit()

        # Return updated filters
        query = (
            select(DashboardFilter)
            .where(DashboardFilter.dashboard_id == dashboard_id)
            .order_by(DashboardFilter.position)
        )
        result = await self.db.execute(query)
        return result.scalars().all()
