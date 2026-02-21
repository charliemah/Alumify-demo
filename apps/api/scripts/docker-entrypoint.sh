#!/bin/sh
set -e
cd /app/apps/api
if [ -n "$DATABASE_URL" ]; then
  npx node-pg-migrate up 2>/dev/null || true
fi
exec node dist/index.js
