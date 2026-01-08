from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.visualization import Visualization, VisualizationCustomization
from app.schemas.visualization import (
    VisualizationCreate,
    VisualizationUpdate,
    VisualizationCustomizationCreate,
    VisualizationCustomizationUpdate,
)


class VisualizationService:
    """Service for managing visualization metadata in our database."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ==================== Visualization Operations ====================

    async def get_visualizations(self, include_archived: bool = False) -> List[Visualization]:
        """Get all visualizations."""
        query = select(Visualization)
        if not include_archived:
            query = query.where(Visualization.is_archived == False)
        query = query.options(selectinload(Visualization.customization))
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_visualization(self, visualization_id: int) -> Optional[Visualization]:
        """Get a single visualization by ID."""
        query = select(Visualization).where(Visualization.id == visualization_id)
        query = query.options(selectinload(Visualization.customization))
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_visualization_by_metabase_id(self, metabase_question_id: int) -> Optional[Visualization]:
        """Get visualization by Metabase question ID."""
        query = select(Visualization).where(
            Visualization.metabase_question_id == metabase_question_id
        )
        query = query.options(selectinload(Visualization.customization))
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_visualization(self, data: VisualizationCreate) -> Visualization:
        """Create a new visualization."""
        visualization = Visualization(
            name=data.name,
            description=data.description,
            metabase_question_id=data.metabase_question_id,
            database_id=data.database_id,
            query_type=data.query_type,
            native_query=data.native_query,
            mbql_query=data.mbql_query,
            visualization_type=data.visualization_type,
            visualization_settings=data.visualization_settings,
        )
        self.db.add(visualization)
        await self.db.commit()

        # Create customization if provided
        if data.customization:
            await self.create_customization(visualization.id, data.customization)

        # Reload with relationship to avoid lazy loading issues
        return await self.get_visualization(visualization.id)

    async def update_visualization(self, visualization_id: int, data: VisualizationUpdate) -> Optional[Visualization]:
        """Update a visualization."""
        visualization = await self.get_visualization(visualization_id)
        if not visualization:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(visualization, field, value)

        await self.db.commit()

        # Reload with relationship to avoid lazy loading issues
        return await self.get_visualization(visualization_id)

    async def delete_visualization(self, visualization_id: int) -> bool:
        """Delete a visualization."""
        visualization = await self.get_visualization(visualization_id)
        if not visualization:
            return False

        await self.db.delete(visualization)
        await self.db.commit()
        return True

    # ==================== Customization Operations ====================

    async def get_customization(self, visualization_id: int) -> Optional[VisualizationCustomization]:
        """Get customization for a visualization."""
        query = select(VisualizationCustomization).where(
            VisualizationCustomization.visualization_id == visualization_id
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_customization(
        self,
        visualization_id: int,
        data: VisualizationCustomizationCreate,
    ) -> VisualizationCustomization:
        """Create customization for a visualization."""
        customization = VisualizationCustomization(
            visualization_id=visualization_id,
            **data.model_dump(),
        )
        self.db.add(customization)
        await self.db.commit()
        await self.db.refresh(customization)
        return customization

    async def update_customization(
        self,
        visualization_id: int,
        data: VisualizationCustomizationUpdate,
    ) -> Optional[VisualizationCustomization]:
        """Update customization for a visualization."""
        customization = await self.get_customization(visualization_id)
        if not customization:
            # Create new customization if it doesn't exist
            create_data = VisualizationCustomizationCreate(**data.model_dump(exclude_unset=True))
            return await self.create_customization(visualization_id, create_data)

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(customization, field, value)

        await self.db.commit()
        await self.db.refresh(customization)
        return customization

    async def delete_customization(self, visualization_id: int) -> bool:
        """Delete customization for a visualization."""
        customization = await self.get_customization(visualization_id)
        if not customization:
            return False

        await self.db.delete(customization)
        await self.db.commit()
        return True
