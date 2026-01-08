# Custom Analytics Platform

A custom analytics platform that uses Metabase as a headless analytics engine with a fully custom React frontend.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Dashboard   │  │ Visualization│  │   Database   │     │
│  │  Builder     │  │   Designer   │  │   Manager    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↕ REST API
┌─────────────────────────────────────────────────────────────┐
│                   FastAPI Backend                           │
│         (Metadata Storage + Metabase Proxy)                 │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌──────────────────┬──────────────────────────────────────────┐
│    PostgreSQL    │              Metabase                    │
│   (Metadata DB)  │         (Analytics Engine)               │
└──────────────────┴──────────────────────────────────────────┘
```

## Features

- **Dashboard Builder**: Drag-and-drop dashboard creation with customizable layouts
- **Visualization Designer**: Build queries visually and create charts
- **Database Manager**: Connect and manage multiple data sources
- **Custom Metadata Layer**: Store UI layouts and customizations beyond Metabase's capabilities
- **Embedding Support**: Embed Metabase visualizations with signed tokens

## Tech Stack

### Backend
- FastAPI (Python 3.11+)
- PostgreSQL (metadata storage)
- SQLAlchemy (async ORM)
- Alembic (migrations)

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Query
- Zustand (state management)
- Recharts (charts)
- react-grid-layout (dashboard layouts)

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for local development)

### Quick Start with Docker

1. Clone the repository:
```bash
cd custom-analytics-platform
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Start all services:
```bash
docker-compose up -d
```

4. Access the applications:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - Metabase: http://localhost:3000
   - API Docs: http://localhost:8000/docs

### Local Development

#### Backend

1. Create virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Copy and configure environment:
```bash
cp .env.example .env
# Edit .env with your settings
```

4. Run migrations:
```bash
alembic upgrade head
```

5. Start the server:
```bash
uvicorn app.main:app --reload --port 8000
```

#### Frontend

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start development server:
```bash
npm run dev
```

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Main Endpoints

#### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get JWT token

#### Dashboards
- `GET /api/v1/dashboards` - List dashboards
- `POST /api/v1/dashboards` - Create dashboard
- `GET /api/v1/dashboards/{id}` - Get dashboard
- `PUT /api/v1/dashboards/{id}` - Update dashboard
- `DELETE /api/v1/dashboards/{id}` - Delete dashboard

#### Metabase Proxy
- `GET /api/v1/metabase/databases` - List databases
- `POST /api/v1/metabase/query` - Execute query
- `GET /api/v1/metabase/questions` - List questions
- `GET /api/v1/metabase/embed/question/{id}/url` - Get embed URL

## Project Structure

```
custom-analytics-platform/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/        # API endpoints
│   │   ├── core/              # Config, database, security
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic
│   │   └── main.py            # FastAPI app
│   ├── alembic/               # Database migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   ├── store/             # Zustand stores
│   │   ├── types/             # TypeScript types
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `SECRET_KEY` | JWT secret key | - |
| `METABASE_URL` | Metabase instance URL | http://localhost:3000 |
| `METABASE_API_KEY` | Metabase API key | - |
| `METABASE_EMBEDDING_SECRET_KEY` | Metabase embedding secret | - |
| `CORS_ORIGINS` | Allowed CORS origins | ["http://localhost:5173"] |

## License

MIT
