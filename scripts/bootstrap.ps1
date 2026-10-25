$ErrorActionPreference = 'Stop'
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
if (-not (Test-Path apps/api/.env)) { Copy-Item apps/api/.env.example apps/api/.env }
if (-not (Test-Path services/ai/.env)) { Copy-Item services/ai/.env.example services/ai/.env }
pnpm install
pnpm db:generate
Write-Host 'Start dependencies: docker compose -f infra/docker/docker-compose.yml up -d postgres redis'
