#!/usr/bin/env bash
# Builds the app, starts a production server on a scratch port, runs the
# integration suite (and the stress test with --stress), then tears down.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-3210}"
BASE_URL="http://localhost:$PORT"

npm run build

npx next start -p "$PORT" &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  curl -sf -o /dev/null "$BASE_URL" && break
  sleep 0.5
done

API_BASE_URL="$BASE_URL" npx vitest run -c vitest.integration.config.ts

if [[ "${1:-}" == "--stress" ]]; then
  node scripts/stress.mjs "$BASE_URL"
fi
