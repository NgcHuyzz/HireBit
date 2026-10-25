#!/usr/bin/env sh
set -eu
curl --fail http://localhost:3000/api/v1/health/live
curl --fail http://localhost:3000/api/v1/health/ready
curl --fail http://localhost:8000/internal/v1/health/live
curl --fail http://localhost:8000/internal/v1/health/ready
