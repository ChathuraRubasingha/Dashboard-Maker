from fastapi import APIRouter

from app.api.routes import dashboards, visualizations, metabase, reports

api_router = APIRouter()

api_router.include_router(dashboards.router, prefix="/dashboards", tags=["Dashboards"])
api_router.include_router(visualizations.router, prefix="/visualizations", tags=["Visualizations"])
api_router.include_router(metabase.router, prefix="/metabase", tags=["Metabase Proxy"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
