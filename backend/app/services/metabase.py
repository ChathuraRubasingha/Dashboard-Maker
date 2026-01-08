import httpx
import jwt
import time
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

from app.core.config import settings


class MetabaseService:
    """
    Service for interacting with Metabase REST API.
    Acts as a proxy between our backend and Metabase.
    """

    def __init__(self, api_key: Optional[str] = None, session_token: Optional[str] = None):
        self.base_url = settings.METABASE_URL
        self.api_key = api_key or settings.METABASE_API_KEY
        self.session_token = session_token
        self.embedding_secret = settings.METABASE_EMBEDDING_SECRET_KEY

    def _get_headers(self) -> Dict[str, str]:
        """Get authentication headers for Metabase API requests."""
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["X-API-KEY"] = self.api_key
        elif self.session_token:
            headers["X-Metabase-Session"] = self.session_token
        return headers

    async def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Make an HTTP request to Metabase API."""
        url = f"{self.base_url}{endpoint}"
        headers = self._get_headers()

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                method=method,
                url=url,
                headers=headers,
                json=data,
                params=params,
            )
            response.raise_for_status()
            return response.json() if response.content else {}

    # ==================== Authentication ====================

    async def authenticate(self, username: str, password: str) -> Dict[str, Any]:
        """Authenticate with Metabase and get session token."""
        response = await self._request(
            "POST",
            "/api/session",
            data={"username": username, "password": password},
        )
        self.session_token = response.get("id")
        return response

    async def get_current_user(self) -> Dict[str, Any]:
        """Get current authenticated user info."""
        return await self._request("GET", "/api/user/current")

    # ==================== Database Management ====================

    async def get_databases(self) -> List[Dict[str, Any]]:
        """Get list of all databases."""
        response = await self._request("GET", "/api/database")
        return response.get("data", response) if isinstance(response, dict) else response

    async def get_database(self, database_id: int) -> Dict[str, Any]:
        """Get single database details."""
        return await self._request("GET", f"/api/database/{database_id}")

    async def get_database_metadata(self, database_id: int) -> Dict[str, Any]:
        """Get database metadata including tables and fields."""
        return await self._request("GET", f"/api/database/{database_id}/metadata")

    async def create_database(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new database connection."""
        return await self._request("POST", "/api/database", data=data)

    async def update_database(self, database_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update database connection settings."""
        return await self._request("PUT", f"/api/database/{database_id}", data=data)

    async def delete_database(self, database_id: int) -> Dict[str, Any]:
        """Delete a database connection."""
        return await self._request("DELETE", f"/api/database/{database_id}")

    async def sync_database_schema(self, database_id: int) -> Dict[str, Any]:
        """Trigger schema sync for a database."""
        return await self._request("POST", f"/api/database/{database_id}/sync_schema")

    async def validate_database(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Test database connection without saving."""
        return await self._request("POST", "/api/database/validate", data=data)

    # ==================== Query Execution ====================

    async def execute_query(self, query: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a query (native SQL or MBQL)."""
        return await self._request("POST", "/api/dataset", data=query)

    async def execute_native_query(self, database_id: int, sql: str) -> Dict[str, Any]:
        """Execute a native SQL query."""
        query = {
            "database": database_id,
            "type": "native",
            "native": {"query": sql},
        }
        return await self.execute_query(query)

    async def execute_mbql_query(self, database_id: int, mbql: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an MBQL query."""
        query = {
            "database": database_id,
            "type": "query",
            "query": mbql,
        }
        return await self.execute_query(query)

    # ==================== Questions (Visualizations) ====================

    async def get_questions(
        self, collection_id: Optional[int] = None, archived: bool = False
    ) -> List[Dict[str, Any]]:
        """Get list of questions/cards."""
        params = {}
        if collection_id:
            params["collection_id"] = collection_id
        response = await self._request("GET", "/api/card", params=params)
        return response

    async def get_question(self, question_id: int) -> Dict[str, Any]:
        """Get single question details."""
        return await self._request("GET", f"/api/card/{question_id}")

    async def create_question(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new question/card."""
        return await self._request("POST", "/api/card", data=data)

    async def update_question(self, question_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a question/card."""
        return await self._request("PUT", f"/api/card/{question_id}", data=data)

    async def delete_question(self, question_id: int) -> Dict[str, Any]:
        """Delete a question/card."""
        return await self._request("DELETE", f"/api/card/{question_id}")

    async def execute_question(self, question_id: int, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute a saved question and get results."""
        endpoint = f"/api/card/{question_id}/query"
        return await self._request("POST", endpoint, data=params or {})

    # ==================== Dashboards ====================

    async def get_dashboards(self) -> List[Dict[str, Any]]:
        """Get list of all dashboards."""
        return await self._request("GET", "/api/dashboard")

    async def get_dashboard(self, dashboard_id: int) -> Dict[str, Any]:
        """Get single dashboard with all cards."""
        return await self._request("GET", f"/api/dashboard/{dashboard_id}")

    async def create_dashboard(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new dashboard."""
        return await self._request("POST", "/api/dashboard", data=data)

    async def update_dashboard(self, dashboard_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update dashboard metadata."""
        return await self._request("PUT", f"/api/dashboard/{dashboard_id}", data=data)

    async def delete_dashboard(self, dashboard_id: int) -> Dict[str, Any]:
        """Delete a dashboard."""
        return await self._request("DELETE", f"/api/dashboard/{dashboard_id}")

    async def add_dashboard_card(self, dashboard_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """Add a card to a dashboard."""
        return await self._request("POST", f"/api/dashboard/{dashboard_id}/cards", data=data)

    async def update_dashboard_cards(self, dashboard_id: int, cards: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Update cards on a dashboard (positions, etc.)."""
        return await self._request("PUT", f"/api/dashboard/{dashboard_id}/cards", data={"cards": cards})

    async def remove_dashboard_card(self, dashboard_id: int, dashcard_id: int) -> Dict[str, Any]:
        """Remove a card from a dashboard."""
        return await self._request("DELETE", f"/api/dashboard/{dashboard_id}/cards", data={"dashcardId": dashcard_id})

    # ==================== Collections ====================

    async def get_collections(self) -> List[Dict[str, Any]]:
        """Get list of all collections."""
        return await self._request("GET", "/api/collection")

    async def get_collection(self, collection_id: int) -> Dict[str, Any]:
        """Get single collection details."""
        return await self._request("GET", f"/api/collection/{collection_id}")

    async def create_collection(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new collection."""
        return await self._request("POST", "/api/collection", data=data)

    async def get_collection_items(self, collection_id: int) -> Dict[str, Any]:
        """Get items in a collection."""
        return await self._request("GET", f"/api/collection/{collection_id}/items")

    # ==================== Embedding ====================

    def generate_embed_token(
        self,
        resource_type: str,
        resource_id: int,
        params: Optional[Dict[str, Any]] = None,
        exp_minutes: int = 10,
    ) -> str:
        """
        Generate a signed JWT token for embedding.

        Args:
            resource_type: "question" or "dashboard"
            resource_id: The ID of the question or dashboard
            params: Filter parameters to lock in the embed
            exp_minutes: Token expiration time in minutes
        """
        payload = {
            "resource": {resource_type: resource_id},
            "params": params or {},
            "exp": int(time.time()) + (exp_minutes * 60),
        }
        token = jwt.encode(payload, self.embedding_secret, algorithm="HS256")
        return token

    def get_embed_url(
        self,
        resource_type: str,
        resource_id: int,
        params: Optional[Dict[str, Any]] = None,
        theme: str = "light",
        bordered: bool = True,
        titled: bool = True,
    ) -> str:
        """
        Generate full embed URL for a question or dashboard.

        Args:
            resource_type: "question" or "dashboard"
            resource_id: The ID of the question or dashboard
            params: Filter parameters
            theme: "light" or "dark"
            bordered: Show border around embed
            titled: Show title in embed
        """
        token = self.generate_embed_token(resource_type, resource_id, params)
        embed_url = f"{self.base_url}/embed/{resource_type}/{token}"

        # Add display options
        query_params = []
        if not bordered:
            query_params.append("bordered=false")
        if not titled:
            query_params.append("titled=false")
        if theme == "dark":
            query_params.append("theme=night")

        if query_params:
            embed_url += "#" + "&".join(query_params)

        return embed_url

    # ==================== Tables and Fields ====================

    async def get_table(self, table_id: int) -> Dict[str, Any]:
        """Get table details."""
        return await self._request("GET", f"/api/table/{table_id}")

    async def get_table_metadata(self, table_id: int) -> Dict[str, Any]:
        """Get table metadata including fields."""
        return await self._request("GET", f"/api/table/{table_id}/query_metadata")

    async def update_field(self, field_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update field metadata (e.g., set FK relationships)."""
        return await self._request("PUT", f"/api/field/{field_id}", data=data)

    # ==================== Health Check ====================

    async def health_check(self) -> bool:
        """Check if Metabase is healthy and accessible."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/health")
                return response.status_code == 200
        except Exception:
            return False
