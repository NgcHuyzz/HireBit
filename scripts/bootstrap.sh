#!/usr/bin/env sh
set -eu
[ -f .env ] || cp .env.example .env
[ -f apps/api/.env ] || cp apps/api/.env.example apps/api/.env
[ -f services/ai/.env ] || cp services/ai/.env.example services/ai/.env
pnpm install
pnpm db:generate
echo 'Start dependencies: docker compose -f infra/docker/docker-compose.yml up -d postgres redis'
