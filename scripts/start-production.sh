#!/bin/sh
set -e

npx prisma migrate deploy

# Start daily sync worker in the background
npx tsx scripts/daily-sync-worker.ts &

HOSTNAME=0.0.0.0 node .next/standalone/server.js
