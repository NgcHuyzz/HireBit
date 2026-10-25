# HireBit

HireBit is a new recruitment platform foundation: React/Vite web, a NestJS modular monolith for business APIs, and a separate FastAPI/Celery AI service. The [architecture blueprint](docs/ARCHITECTURE_BLUEPRINT.md) defines domain ownership and future phases. This repository currently implements Phase 0 infrastructure only.

## Requirements

- Node.js 22.12+ and pnpm 11.25
- Python 3.11+
- Docker Compose for PostgreSQL with pgvector and Redis

## Local development

1. Copy `.env.example` to `.env`, `apps/api/.env.example` to `apps/api/.env`, and `services/ai/.env.example` to `services/ai/.env`.
2. Start dependencies: `docker compose -f infra/docker/docker-compose.yml up -d postgres redis`.
3. Run `pnpm install`, then `pnpm db:generate`.
4. Run `pnpm dev:api` and `pnpm dev:web` in separate terminals.
5. In `services/ai`, create a Python virtual environment, install `pip install -e ".[dev]"`, and run `uvicorn app.main:app --reload --port 8000`.

Or start the entire development stack with `docker compose -f infra/docker/docker-compose.yml up --build`. The Compose images contain a source snapshot; rebuild after edits. The API is at `http://localhost:3000`, web at `http://localhost:5173`, and AI API at `http://localhost:8000`.

## Health and API docs

- Business API: `/api/v1/health/live`, `/api/v1/health/ready`, Swagger at `/api/docs`.
- AI API: `/internal/v1/health/live`, `/internal/v1/health/ready`, OpenAPI at `/docs`.
- Readiness checks PostgreSQL and Redis and returns HTTP 503 when unavailable. Liveness only checks the process.
- Redis DB 0 is reserved for NestJS/BullMQ; Redis DB 1 is reserved for Celery.

## Checks

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm db:validate` check the TypeScript workspace. From `services/ai`, run `ruff check .`, `ruff format --check .`, `mypy app`, and `pytest`.

No authentication, payment, matching, CV parsing, RAG, database business model, or worker job is implemented yet. Domain modules and AI directories mark ownership boundaries for later phases.
