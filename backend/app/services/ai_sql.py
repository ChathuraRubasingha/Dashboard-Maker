import httpx
from typing import Optional, Dict, Any, List
import json

from app.core.config import settings


class AISQLService:
    """
    Service for AI-powered SQL generation using Ollama (local LLM).
    Converts natural language queries to SQL using database schema context.
    """

    def __init__(self):
        # Ollama runs locally on port 11434 by default
        self.ollama_url = getattr(settings, 'OLLAMA_URL', 'http://localhost:11434')
        self.model = getattr(settings, 'OLLAMA_MODEL', 'llama3.2')  # or codellama, mistral, etc.

    async def generate_sql(
        self,
        natural_language: str,
        schema_context: Dict[str, Any],
        database_type: str = "postgresql"
    ) -> Dict[str, Any]:
        """
        Generate SQL from natural language using the database schema context.

        Args:
            natural_language: The user's query in plain English
            schema_context: Database schema information (tables, columns, types)
            database_type: The type of database (postgresql, mysql, etc.)

        Returns:
            Dict with 'sql' query and 'explanation'
        """
        # Build the prompt with schema context
        prompt = self._build_prompt(natural_language, schema_context, database_type)

        try:
            response = await self._call_ollama(prompt)
            return self._parse_response(response)
        except Exception as e:
            return {
                "sql": None,
                "explanation": f"Failed to generate SQL: {str(e)}",
                "error": True
            }

    def _build_prompt(
        self,
        natural_language: str,
        schema_context: Dict[str, Any],
        database_type: str
    ) -> str:
        """Build the prompt for the LLM with schema context."""

        # Format schema information
        schema_text = self._format_schema(schema_context)

        prompt = f"""You are an expert SQL query generator. Generate a {database_type} SQL query based on the user's request and the provided database schema.

DATABASE SCHEMA:
{schema_text}

USER REQUEST:
{natural_language}

INSTRUCTIONS:
1. Generate ONLY a valid {database_type} SQL query that answers the user's request
2. Use proper table and column names from the schema
3. Include appropriate JOINs if data from multiple tables is needed
4. Add WHERE clauses, GROUP BY, ORDER BY as needed
5. Use aliases for readability when helpful

Respond in the following JSON format:
{{
    "sql": "YOUR SQL QUERY HERE",
    "explanation": "Brief explanation of what the query does"
}}

Generate the SQL query:"""

        return prompt

    def _format_schema(self, schema_context: Dict[str, Any]) -> str:
        """Format the schema context into a readable string for the LLM."""
        lines = []

        tables = schema_context.get("tables", [])
        for table in tables:
            table_name = table.get("name", "unknown")
            schema_name = table.get("schema", "public")
            full_name = f"{schema_name}.{table_name}" if schema_name else table_name

            lines.append(f"\nTable: {full_name}")
            lines.append("Columns:")

            fields = table.get("fields", [])
            for field in fields:
                field_name = field.get("name", "unknown")
                field_type = field.get("base_type", "unknown")
                # Clean up type names
                field_type = field_type.replace("type/", "")

                pk = " (PRIMARY KEY)" if field.get("pk") else ""
                fk = ""
                if field.get("fk_target_field_id"):
                    fk = f" (FK -> {field.get('fk_target_table', 'unknown')})"

                lines.append(f"  - {field_name}: {field_type}{pk}{fk}")

        return "\n".join(lines)

    async def _call_ollama(self, prompt: str) -> str:
        """Call the Ollama API to generate a response."""
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,  # Low temperature for more deterministic SQL
                        "num_predict": 1000,
                    }
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")

    def _parse_response(self, response: str) -> Dict[str, Any]:
        """Parse the LLM response to extract SQL and explanation."""
        # Try to parse as JSON
        try:
            # Find JSON in the response
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end > start:
                json_str = response[start:end]
                parsed = json.loads(json_str)
                return {
                    "sql": parsed.get("sql", "").strip(),
                    "explanation": parsed.get("explanation", ""),
                    "error": False
                }
        except json.JSONDecodeError:
            pass

        # Fallback: try to extract SQL from code blocks
        sql = self._extract_sql_from_text(response)
        if sql:
            return {
                "sql": sql,
                "explanation": "SQL query generated from natural language",
                "error": False
            }

        # Last resort: return raw response
        return {
            "sql": response.strip(),
            "explanation": "Could not parse structured response",
            "error": False
        }

    def _extract_sql_from_text(self, text: str) -> Optional[str]:
        """Extract SQL from markdown code blocks or plain text."""
        # Try to find SQL in code blocks
        import re

        # Match ```sql ... ``` or ``` ... ```
        patterns = [
            r"```sql\n?(.*?)\n?```",
            r"```\n?(.*?)\n?```",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if match:
                return match.group(1).strip()

        # Look for SELECT statement
        select_match = re.search(
            r"(SELECT\s+.+?;)",
            text,
            re.DOTALL | re.IGNORECASE
        )
        if select_match:
            return select_match.group(1).strip()

        return None

    async def check_ollama_status(self) -> Dict[str, Any]:
        """Check if Ollama is running and the model is available."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                # Check if Ollama is running
                response = await client.get(f"{self.ollama_url}/api/tags")
                if response.status_code != 200:
                    return {
                        "available": False,
                        "error": "Ollama is not responding"
                    }

                # Check if our model is available
                data = response.json()
                models = [m.get("name", "").split(":")[0] for m in data.get("models", [])]

                model_available = self.model.split(":")[0] in models

                return {
                    "available": True,
                    "model": self.model,
                    "model_available": model_available,
                    "available_models": models
                }
        except httpx.ConnectError:
            return {
                "available": False,
                "error": "Cannot connect to Ollama. Make sure Ollama is running (ollama serve)"
            }
        except Exception as e:
            return {
                "available": False,
                "error": str(e)
            }

    async def suggest_queries(
        self,
        schema_context: Dict[str, Any],
        count: int = 5
    ) -> List[str]:
        """
        Suggest natural language queries based on the schema.
        Useful for showing users what questions they can ask.
        """
        schema_text = self._format_schema(schema_context)

        prompt = f"""Based on the following database schema, suggest {count} useful natural language questions that a business user might want to ask:

DATABASE SCHEMA:
{schema_text}

Generate {count} practical business questions that can be answered with SQL queries on this database.
Return them as a simple numbered list, one question per line.
Make the questions specific and actionable.

Questions:"""

        try:
            response = await self._call_ollama(prompt)
            # Parse numbered list
            lines = response.strip().split("\n")
            suggestions = []
            for line in lines:
                # Remove numbering and clean up
                cleaned = line.strip()
                if cleaned and cleaned[0].isdigit():
                    # Remove number prefix like "1." or "1)"
                    cleaned = cleaned.lstrip("0123456789.)")
                    cleaned = cleaned.strip()
                if cleaned:
                    suggestions.append(cleaned)
            return suggestions[:count]
        except Exception:
            return []
