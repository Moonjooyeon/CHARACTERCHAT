#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
state="$(mktemp -d /tmp/onseo-runtime-XXXXXX)"
export XDG_CONFIG_HOME="$state/config"
export QA_BASE="http://127.0.0.1:5196"
mkdir -p "$XDG_CONFIG_HOME"
cat drizzle/*.sql > "$state/schema.sql"
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to "$state/state" --file "$state/schema.sql" > "$state/migration.log" 2>&1
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js dev --config dist/server/wrangler.json --local --persist-to "$state/state" --ip 127.0.0.1 --port 5196 --inspector-port 0 > "$state/runtime.log" 2>&1 &
pid=$!
trap 'kill "$pid" 2>/dev/null || true' EXIT
ready=false
for i in $(seq 1 30); do if curl -s -o /dev/null "$QA_BASE/api/app"; then ready=true; break; fi; sleep 1; done
if [ "$ready" != true ]; then tail -30 "$state/runtime.log"; exit 1; fi
node scripts/verify-runtime.mjs
node scripts/verify-library-runtime.mjs

node scripts/verify-wallet-runtime.mjs

node scripts/verify-attendance-runtime.mjs
