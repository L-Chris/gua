#!/bin/sh
set -e

npx prisma migrate deploy

npm run subtitle:backfill:worker &
worker_pid=$!

cleanup() {
    kill "$worker_pid" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

HOSTNAME=0.0.0.0 node .next/standalone/server.js
