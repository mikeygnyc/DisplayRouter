#!/usr/bin/env bash
set -euo pipefail

export ADMIN_TOKEN=${ADMIN_TOKEN:-dev-admin-token}
export DISPLAY_SECRET=${DISPLAY_SECRET:-dev-display-secret}
export API_KEY_SALT=${API_KEY_SALT:-dev-salt}
export DATABASE_URL=${DATABASE_URL:-sqlite:///./display_router.db}

uvicorn router.main:app --host 0.0.0.0 --port 8000
