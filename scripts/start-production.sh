#!/bin/sh
set -e

npx prisma migrate deploy

# Start daily sync worker in the background
npx tsx scripts/daily-sync-worker.ts &

# Start auto-comment worker in the background
npx tsx scripts/auto-comment-worker.ts &

HOSTNAME=0.0.0.0 node .next/standalone/server.js
