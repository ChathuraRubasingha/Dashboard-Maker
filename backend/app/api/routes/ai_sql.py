from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from app.core.database import get_db
from app.core.security import verify_api_key
from app.services.ai_sql import AISQLService
from app.services.metabase import MetabaseService


router = APIRouter()


# ==================== Request/Response Schemas ====================


class GenerateSQLRequest(BaseModel):
    """Request schema for generating SQL from natural language."""
    query: str = Field(..., min_length=3, max_length=1000, description="Natural language query")
    database_id: int = Field(..., description="Metabase database ID to query")


class GenerateSQLResponse(BaseModel):
    """Response schema for generated SQL."""
    sql: Optional[str] = None
    explanation: str
    error: bool = False


class SuggestQueriesRequest(BaseModel):
    """Request schema for suggesting queries."""
    database_id: int = Field(..., description="Metabase database ID")
    count: int = Field(default=5, ge=1, le=10, description="Number of suggestions")


class SuggestQueriesResponse(BaseModel):
    """Response schema for query suggestions."""
    suggestions: List[str]


class OllamaStatusResponse(BaseModel):
    """Response schema for Ollama status check."""
    available: bool
    model: Optional[str] = None
    model_available: Optional[bool] = None
    available_models: Optional[List[str]] = None
    error: Optional[str] = None


# ==================== Helper Functions ====================


async def get_database_schema(database_id: int) -> Dict[str, Any]:
    """
    Fetch database schema from Metabase.
    Returns a structured schema with tables and fields.
    """
    metabase = MetabaseService()
    metadata = await metabase.get_database_metadata(database_id)

    # Extract tables and fields
    tables = []
    for table in metadata.get("tables", []):
        if table.get("visibility_type") == "hidden":
            continue

        table_info = {
            "id": table.get("id"),
            "name": table.get("name"),
            "schema": table.get("schema"),
            "display_name": table.get("display_name"),
            "fields": []
        }

        for field in table.get("fields", []):
            if field.get("visibility_type") == "hidden":
                continue

            field_info = {
                "id": field.get("id"),
                "name": field.get("name"),
                "display_name": field.get("display_name"),
                "base_type": field.get("base_type"),
                "semantic_type": field.get("semantic_type"),
                "pk": field.get("semantic_type") == "type/PK",
                "fk_target_field_id": field.get("fk_target_field_id"),
            }

            # If it's a foreign key, try to get target table name
            if field_info["fk_target_field_id"]:
                for t in metadata.get("tables", []):
                    for f in t.get("fields", []):
                        if f.get("id") == field_info["fk_target_field_id"]:
                            field_info["fk_target_table"] = t.get("name")
                            break

            table_info["fields"].append(field_info)

        tables.append(table_info)

    return {
        "database_id": database_id,
        "database_name": metadata.get("name", "Unknown"),
        "tables": tables
    }


# ==================== Endpoints ====================


@router.get("/status", response_model=OllamaStatusResponse)
async def check_ollama_status(
    _api_key: str = Depends(verify_api_key),
):
    """
    Check if Ollama is running and the model is available.
    """
    service = AISQLService()
    status = await service.check_ollama_status()
    return OllamaStatusResponse(**status)


@router.post("/generate", response_model=GenerateSQLResponse)
async def generate_sql(
    request: GenerateSQLRequest,
    _api_key: str = Depends(verify_api_key),
):
    """
    Generate SQL from natural language using AI.

    The AI uses the database schema to generate accurate SQL queries.
    Requires Ollama to be running locally.
    """
    # Check Ollama status first
    service = AISQLService()
    ollama_status = await service.check_ollama_status()

    if not ollama_status.get("available"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ollama_status.get("error", "Ollama is not available")
        )

    if not ollama_status.get("model_available"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Model '{service.model}' is not available. Available models: {ollama_status.get('available_models', [])}"
        )

    # Get database schema
    try:
        schema_context = await get_database_schema(request.database_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch database schema: {str(e)}"
        )

    # Generate SQL
    result = await service.generate_sql(
        natural_language=request.query,
        schema_context=schema_context,
        database_type="postgresql"  # TODO: detect from database metadata
    )

    return GenerateSQLResponse(**result)


@router.post("/suggest", response_model=SuggestQueriesResponse)
async def suggest_queries(
    request: SuggestQueriesRequest,
    _api_key: str = Depends(verify_api_key),
):
    """
    Suggest natural language queries based on the database schema.

    Useful for showing users what questions they can ask about their data.
    """
    # Check Ollama status first
    service = AISQLService()
    ollama_status = await service.check_ollama_status()

    if not ollama_status.get("available"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ollama_status.get("error", "Ollama is not available")
        )

    # Get database schema
    try:
        schema_context = await get_database_schema(request.database_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch database schema: {str(e)}"
        )

    # Generate suggestions
    suggestions = await service.suggest_queries(
        schema_context=schema_context,
        count=request.count
    )

    return SuggestQueriesResponse(suggestions=suggestions)


@router.post("/execute-generated")
async def execute_generated_sql(
    request: GenerateSQLRequest,
    _api_key: str = Depends(verify_api_key),
):
    """
    Generate SQL from natural language and execute it.

    This is a convenience endpoint that combines generation and execution.
    Returns both the generated SQL and the query results.
    """
    # First generate the SQL
    service = AISQLService()
    ollama_status = await service.check_ollama_status()

    if not ollama_status.get("available"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ollama_status.get("error", "Ollama is not available")
        )

    # Get database schema
    try:
        schema_context = await get_database_schema(request.database_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch database schema: {str(e)}"
        )

    # Generate SQL
    result = await service.generate_sql(
        natural_language=request.query,
        schema_context=schema_context,
        database_type="postgresql"
    )

    if result.get("error") or not result.get("sql"):
        return {
            "sql": result.get("sql"),
            "explanation": result.get("explanation"),
            "error": True,
            "results": None
        }

    # Execute the generated SQL
    try:
        metabase = MetabaseService()
        query_result = await metabase.execute_native_query(
            database_id=request.database_id,
            sql=result["sql"]
        )

        return {
            "sql": result["sql"],
            "explanation": result["explanation"],
            "error": False,
            "results": query_result
        }
    except Exception as e:
        return {
            "sql": result["sql"],
            "explanation": result["explanation"],
            "error": True,
            "error_message": str(e),
            "results": None
        }
