from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Custom Analytics Platform"
    DEBUG: bool = True

    # API Key for this application
    API_KEY: str = "your-api-key-change-in-production"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/analytics_metadata"

    # Metabase Configuration
    METABASE_URL: str = "http://localhost:3000"
    METABASE_API_KEY: str = ""
    METABASE_EMBEDDING_SECRET_KEY: str = ""

    # CORS
    CORS_ORIGINS: str = '["http://localhost:5173","http://localhost:3001"]'

    @property
    def cors_origins_list(self) -> List[str]:
        return json.loads(self.CORS_ORIGINS)

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
