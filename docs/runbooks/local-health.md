# Local health checks

Start PostgreSQL and Redis with Docker Compose, then run the API and AI service. Check `/api/v1/health/live` and `/internal/v1/health/live` first. If a readiness endpoint returns 503, inspect `DATABASE_URL` or `AI_DATABASE_URL` and the corresponding Redis URL, then run `docker compose -f infra/docker/docker-compose.yml ps`.
