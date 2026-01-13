from typing import List, Optional, Dict, Any
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
from app.services.metabase import MetabaseService


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

    # ==================== Query Execution ====================

    async def execute_visualization(self, visualization_id: int) -> Optional[Dict[str, Any]]:
        """
        Execute a visualization's query and return the results.

        Supports three methods:
        1. Execute via Metabase question ID (if linked)
        2. Execute stored MBQL query directly
        3. Execute stored native SQL query directly

        Returns:
            Dict with 'rows' key containing list of row dicts, or None if failed
        """
        visualization = await self.get_visualization(visualization_id)
        if not visualization:
            return None

        try:
            metabase = MetabaseService()
            result = None

            # Method 1: Execute via Metabase question ID (if linked)
            if visualization.metabase_question_id:
                result = await metabase.execute_question(visualization.metabase_question_id)

            # Method 2: Execute stored MBQL query directly (same as Widget Report)
            elif visualization.query_type == "mbql" and visualization.mbql_query and visualization.database_id:
                stored_query = visualization.mbql_query

                # Handle different MBQL query formats
                if isinstance(stored_query, dict):
                    database_id = stored_query.get("database", visualization.database_id)
                    query_data = stored_query.get("query", stored_query)
                else:
                    database_id = visualization.database_id
                    query_data = stored_query

                result = await metabase.execute_mbql_query(database_id, query_data)

            # Method 3: Execute stored native SQL query directly
            elif visualization.query_type == "native" and visualization.native_query and visualization.database_id:
                result = await metabase.execute_native_query(
                    visualization.database_id,
                    visualization.native_query
                )

            # No valid data source
            else:
                print(f"Visualization {visualization_id} has no valid data source")
                return None

            # Metabase returns data in format: { "data": { "rows": [...], "cols": [...] } }
            if not result or "data" not in result:
                return None

            data = result["data"]
            cols = data.get("cols", [])
            rows = data.get("rows", [])

            # Convert rows from arrays to dicts using column names
            column_names = [col.get("name", f"col_{i}") for i, col in enumerate(cols)]
            row_dicts = []
            for row in rows:
                row_dict = {}
                for i, value in enumerate(row):
                    if i < len(column_names):
                        row_dict[column_names[i]] = value
                row_dicts.append(row_dict)

            return {"rows": row_dicts}
        except Exception as e:
            print(f"Error executing visualization {visualization_id}: {e}")
            return None
