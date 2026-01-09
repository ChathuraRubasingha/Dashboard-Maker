from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import secrets

from app.models.report import Report
from app.schemas.report import (
    ReportCreate,
    ReportUpdate,
)


class ReportService:
    """Service for managing reports."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_reports(self, include_archived: bool = False) -> List[Report]:
        """Get all reports."""
        query = select(Report)
        if not include_archived:
            query = query.where(Report.is_archived == False)
        query = query.order_by(Report.updated_at.desc().nullsfirst(), Report.created_at.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_report(self, report_id: int) -> Optional[Report]:
        """Get a single report by ID."""
        query = select(Report).where(Report.id == report_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_report_by_share_token(self, share_token: str) -> Optional[Report]:
        """Get a public report by its share token."""
        query = (
            select(Report)
            .where(Report.share_token == share_token)
            .where(Report.is_public == True)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_report(self, data: ReportCreate) -> Report:
        """Create a new report."""
        blocks_data = [block.model_dump() for block in data.blocks] if data.blocks else []
        settings_data = data.settings.model_dump() if data.settings else {
            "page_size": "A4",
            "orientation": "portrait",
            "margins": {"top": 20, "right": 20, "bottom": 20, "left": 20}
        }

        report = Report(
            name=data.name,
            description=data.description,
            blocks=blocks_data,
            settings=settings_data,
        )
        self.db.add(report)
        await self.db.commit()
        await self.db.refresh(report)
        return report

    async def update_report(self, report_id: int, data: ReportUpdate) -> Optional[Report]:
        """Update a report."""
        report = await self.get_report(report_id)
        if not report:
            return None

        update_data = data.model_dump(exclude_unset=True)

        # Handle blocks conversion
        if "blocks" in update_data and update_data["blocks"]:
            update_data["blocks"] = [
                block.model_dump() if hasattr(block, "model_dump") else block
                for block in update_data["blocks"]
            ]

        # Handle settings conversion
        if "settings" in update_data and update_data["settings"]:
            if hasattr(update_data["settings"], "model_dump"):
                update_data["settings"] = update_data["settings"].model_dump()

        for field, value in update_data.items():
            setattr(report, field, value)

        await self.db.commit()
        await self.db.refresh(report)
        return report

    async def delete_report(self, report_id: int) -> bool:
        """Delete a report."""
        report = await self.get_report(report_id)
        if not report:
            return False

        await self.db.delete(report)
        await self.db.commit()
        return True

    async def generate_share_token(self, report_id: int) -> Optional[Report]:
        """Generate or regenerate a share token for a report."""
        report = await self.get_report(report_id)
        if not report:
            return None

        report.share_token = secrets.token_urlsafe(32)
        report.is_public = True

        await self.db.commit()
        await self.db.refresh(report)
        return report

    async def revoke_share(self, report_id: int) -> Optional[Report]:
        """Revoke sharing for a report."""
        report = await self.get_report(report_id)
        if not report:
            return None

        report.share_token = None
        report.is_public = False

        await self.db.commit()
        await self.db.refresh(report)
        return report

    async def duplicate_report(self, report_id: int, new_name: Optional[str] = None) -> Optional[Report]:
        """Duplicate a report."""
        original = await self.get_report(report_id)
        if not original:
            return None

        duplicate = Report(
            name=new_name or f"{original.name} (Copy)",
            description=original.description,
            blocks=original.blocks.copy() if original.blocks else [],
            settings=original.settings.copy() if original.settings else {},
            is_public=False,
            share_token=None,
        )

        self.db.add(duplicate)
        await self.db.commit()
        await self.db.refresh(duplicate)
        return duplicate
