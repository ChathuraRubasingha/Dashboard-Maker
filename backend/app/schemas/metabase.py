from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class MetabaseField(BaseModel):
    id: int
    name: str
    display_name: str
    base_type: str
    semantic_type: Optional[str] = None
    description: Optional[str] = None
    table_id: int
    fk_target_field_id: Optional[int] = None


class MetabaseTable(BaseModel):
    id: int
    name: str
    display_name: str
    schema_name: Optional[str] = None
    description: Optional[str] = None
    db_id: int
    fields: List[MetabaseField] = []


class MetabaseDatabase(BaseModel):
    id: int
    name: str
    engine: str
    description: Optional[str] = None
    is_sample: bool = False
    tables: List[MetabaseTable] = []


class MetabaseDatabaseCreate(BaseModel):
    name: str
    engine: str  # postgres, mysql, mongo, bigquery, etc.
    details: Dict[str, Any]  # Connection details (host, port, dbname, user, password)
    is_full_sync: bool = True
    is_on_demand: bool = False
    auto_run_queries: bool = True


class MetabaseQuery(BaseModel):
    database: int
    type: str = "native"  # native or query (MBQL)
    native: Optional[Dict[str, Any]] = None  # {"query": "SELECT * FROM table"}
    query: Optional[Dict[str, Any]] = None  # MBQL query object


class MetabaseQueryResult(BaseModel):
    data: Dict[str, Any]  # {rows: [], cols: []}
    row_count: int
    status: str
    json_query: Optional[Dict[str, Any]] = None


class MetabaseQuestionCreate(BaseModel):
    name: str
    display: str  # table, bar, line, pie, area, etc.
    dataset_query: MetabaseQuery
    visualization_settings: Dict[str, Any] = {}
    description: Optional[str] = None
    collection_id: Optional[int] = None


class MetabaseQuestion(BaseModel):
    id: int
    name: str
    display: str
    description: Optional[str] = None
    dataset_query: Dict[str, Any]
    visualization_settings: Dict[str, Any]
    collection_id: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class MetabaseDashboardCreate(BaseModel):
    name: str
    description: Optional[str] = None
    collection_id: Optional[int] = None
    parameters: List[Dict[str, Any]] = []


class MetabaseDashboard(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    collection_id: Optional[int] = None
    parameters: List[Dict[str, Any]] = []
    dashcards: List[Dict[str, Any]] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class MetabaseDashcardCreate(BaseModel):
    card_id: int  # Question ID
    row: int = 0
    col: int = 0
    size_x: int = 4
    size_y: int = 4
    parameter_mappings: List[Dict[str, Any]] = []


class MetabaseEmbedToken(BaseModel):
    resource: Dict[str, int]  # {"question": 123} or {"dashboard": 456}
    params: Dict[str, Any] = {}
    exp: Optional[int] = None  # Expiration timestamp
