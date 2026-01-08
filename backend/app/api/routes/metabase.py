from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List, Optional

from app.core.security import verify_api_key
from app.services.metabase import MetabaseService
from app.schemas.metabase import (
    MetabaseDatabase,
    MetabaseQuery,
    MetabaseQueryResult,
    MetabaseDatabaseCreate,
    MetabaseQuestionCreate,
    MetabaseQuestion,
    MetabaseDashboardCreate,
    MetabaseDashboard,
    MetabaseDashcardCreate,
)

router = APIRouter()


def get_metabase_service() -> MetabaseService:
    """Get Metabase service instance."""
    return MetabaseService()


# ==================== Health Check ====================


@router.get("/health")
async def metabase_health():
    """Check if Metabase is accessible."""
    service = get_metabase_service()
    is_healthy = await service.health_check()
    if not is_healthy:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Metabase is not accessible",
        )
    return {"status": "healthy"}


# ==================== Database Endpoints ====================


@router.get("/databases", response_model=List[Dict[str, Any]])
async def list_databases(
    _api_key: str = Depends(verify_api_key),
):
    """Get list of all databases from Metabase."""
    service = get_metabase_service()
    try:
        databases = await service.get_databases()
        return databases
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch databases from Metabase: {str(e)}",
        )


@router.get("/databases/{database_id}")
async def get_database(
    database_id: int,
    _api_key: str = Depends(verify_api_key),
):
    """Get single database details."""
    service = get_metabase_service()
    try:
        database = await service.get_database(database_id)
        return database
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch database from Metabase: {str(e)}",
        )


@router.get("/databases/{database_id}/metadata")
async def get_database_metadata(
    database_id: int,
    _api_key: str = Depends(verify_api_key),
):
    """Get database metadata including tables and fields."""
    service = get_metabase_service()
    try:
        metadata = await service.get_database_metadata(database_id)
        return metadata
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch database metadata: {str(e)}",
        )


@router.post("/databases", status_code=status.HTTP_201_CREATED)
async def create_database(
    data: MetabaseDatabaseCreate,
    _api_key: str = Depends(verify_api_key),
):
    """Create a new database connection in Metabase."""
    service = get_metabase_service()
    try:
        database = await service.create_database(data.model_dump())
        return database
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to create database in Metabase: {str(e)}",
        )


@router.put("/databases/{database_id}")
async def update_database(
    database_id: int,
    data: Dict[str, Any],
    _api_key: str = Depends(verify_api_key),
):
    """Update database connection in Metabase."""
    service = get_metabase_service()
    try:
        database = await service.update_database(database_id, data)
        return database
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to update database in Metabase: {str(e)}",
        )


@router.delete("/databases/{database_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_database(
    database_id: int,
    _api_key: str = Depends(verify_api_key),
):
    """Delete database connection in Metabase."""
    service = get_metabase_service()
    try:
        await service.delete_database(database_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to delete database in Metabase: {str(e)}",
        )


@router.post("/databases/{database_id}/sync")
async def sync_database(
    database_id: int,
    _api_key: str = Depends(verify_api_key),
):
    """Trigger schema sync for a database."""
    service = get_metabase_service()
    try:
        result = await service.sync_database_schema(database_id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to sync database schema: {str(e)}",
        )


@router.post("/databases/validate")
async def validate_database(
    data: MetabaseDatabaseCreate,
    _api_key: str = Depends(verify_api_key),
):
    """Test database connection without saving."""
    service = get_metabase_service()
    try:
        result = await service.validate_database(data.model_dump())
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Database validation failed: {str(e)}",
        )


# ==================== Query Endpoints ====================


@router.post("/query")
async def execute_query(
    query: MetabaseQuery,
    _api_key: str = Depends(verify_api_key),
):
    """Execute a query against Metabase."""
    service = get_metabase_service()
    try:
        result = await service.execute_query(query.model_dump(exclude_none=True))
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Query execution failed: {str(e)}",
        )


@router.post("/query/native")
async def execute_native_query(
    database_id: int,
    sql: str,
    _api_key: str = Depends(verify_api_key),
):
    """Execute a native SQL query."""
    service = get_metabase_service()
    try:
        result = await service.execute_native_query(database_id, sql)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Query execution failed: {str(e)}",
        )


# ==================== Question Endpoints ====================


@router.get("/questions")
async def list_questions(
    collection_id: Optional[int] = None,
    _api_key: str = Depends(verify_api_key),
):
    """Get list of questions from Metabase."""
    service = get_metabase_service()
    try:
        questions = await service.get_questions(collection_id)
        return questions
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch questions: {str(e)}",
        )


@router.get("/questions/{question_id}")
async def get_question(
    question_id: int,
    _api_key: str = Depends(verify_api_key),
):
    """Get single question details."""
    service = get_metabase_service()
    try:
        question = await service.get_question(question_id)
        return question
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch question: {str(e)}",
        )


@router.post("/questions", status_code=status.HTTP_201_CREATED)
async def create_question(
    data: MetabaseQuestionCreate,
    _api_key: str = Depends(verify_api_key),
):
    """Create a new question in Metabase."""
    service = get_metabase_service()
    try:
        question = await service.create_question(data.model_dump())
        return question
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to create question: {str(e)}",
        )


@router.put("/questions/{question_id}")
async def update_question(
    question_id: int,
    data: Dict[str, Any],
    _api_key: str = Depends(verify_api_key),
):
    """Update a question in Metabase."""
    service = get_metabase_service()
    try:
        question = await service.update_question(question_id, data)
        return question
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to update question: {str(e)}",
        )


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: int,
    _api_key: str = Depends(verify_api_key),
):
    """Delete a question in Metabase."""
    service = get_metabase_service()
    try:
        await service.delete_question(question_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to delete question: {str(e)}",
        )


@router.post("/questions/{question_id}/execute")
async def execute_question(
    question_id: int,
    params: Optional[Dict[str, Any]] = None,
    _api_key: str = Depends(verify_api_key),
):
    """Execute a saved question and get results."""
    service = get_metabase_service()
    try:
        result = await service.execute_question(question_id, params)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to execute question: {str(e)}",
        )


# ==================== Metabase Dashboard Endpoints ====================


@router.get("/mb-dashboards")
async def list_metabase_dashboards(
    _api_key: str = Depends(verify_api_key),
):
    """Get list of dashboards from Metabase."""
    service = get_metabase_service()
    try:
        dashboards = await service.get_dashboards()
        return dashboards
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch dashboards: {str(e)}",
        )


@router.get("/mb-dashboards/{dashboard_id}")
async def get_metabase_dashboard(
    dashboard_id: int,
    _api_key: str = Depends(verify_api_key),
):
    """Get single dashboard from Metabase."""
    service = get_metabase_service()
    try:
        dashboard = await service.get_dashboard(dashboard_id)
        return dashboard
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch dashboard: {str(e)}",
        )


@router.post("/mb-dashboards", status_code=status.HTTP_201_CREATED)
async def create_metabase_dashboard(
    data: MetabaseDashboardCreate,
    _api_key: str = Depends(verify_api_key),
):
    """Create a new dashboard in Metabase."""
    service = get_metabase_service()
    try:
        dashboard = await service.create_dashboard(data.model_dump())
        return dashboard
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to create dashboard: {str(e)}",
        )


@router.post("/mb-dashboards/{dashboard_id}/cards")
async def add_card_to_metabase_dashboard(
    dashboard_id: int,
    data: MetabaseDashcardCreate,
    _api_key: str = Depends(verify_api_key),
):
    """Add a card to a Metabase dashboard."""
    service = get_metabase_service()
    try:
        result = await service.add_dashboard_card(dashboard_id, data.model_dump())
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to add card to dashboard: {str(e)}",
        )


# ==================== Embedding Endpoints ====================


@router.get("/embed/question/{question_id}/url")
async def get_question_embed_url(
    question_id: int,
    theme: str = "light",
    bordered: bool = True,
    titled: bool = True,
    _api_key: str = Depends(verify_api_key),
):
    """Get embed URL for a question."""
    service = get_metabase_service()
    try:
        url = service.get_embed_url(
            resource_type="question",
            resource_id=question_id,
            theme=theme,
            bordered=bordered,
            titled=titled,
        )
        return {"embed_url": url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate embed URL: {str(e)}",
        )


@router.get("/embed/dashboard/{dashboard_id}/url")
async def get_dashboard_embed_url(
    dashboard_id: int,
    theme: str = "light",
    bordered: bool = True,
    titled: bool = True,
    _api_key: str = Depends(verify_api_key),
):
    """Get embed URL for a dashboard."""
    service = get_metabase_service()
    try:
        url = service.get_embed_url(
            resource_type="dashboard",
            resource_id=dashboard_id,
            theme=theme,
            bordered=bordered,
            titled=titled,
        )
        return {"embed_url": url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate embed URL: {str(e)}",
        )


# ==================== Collections ====================


@router.get("/collections")
async def list_collections(
    _api_key: str = Depends(verify_api_key),
):
    """Get list of collections from Metabase."""
    service = get_metabase_service()
    try:
        collections = await service.get_collections()
        return collections
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch collections: {str(e)}",
        )


@router.post("/collections", status_code=status.HTTP_201_CREATED)
async def create_collection(
    data: Dict[str, Any],
    _api_key: str = Depends(verify_api_key),
):
    """Create a new collection in Metabase."""
    service = get_metabase_service()
    try:
        collection = await service.create_collection(data)
        return collection
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to create collection: {str(e)}",
        )
