from fastapi import APIRouter

from app.api.routes import dashboards, visualizations, metabase, reports, excel_reports, ai_sql

api_router = APIRouter()

api_router.include_router(dashboards.router, prefix="/dashboards", tags=["Dashboards"])
api_router.include_router(visualizations.router, prefix="/visualizations", tags=["Visualizations"])
api_router.include_router(metabase.router, prefix="/metabase", tags=["Metabase Proxy"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(excel_reports.router, prefix="/excel-reports", tags=["Excel Reports"])
api_router.include_router(ai_sql.router, prefix="/ai-sql", tags=["AI SQL Generation"])
