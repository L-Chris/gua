#!/bin/sh
set -e

npx prisma migrate deploy

HOSTNAME=0.0.0.0 node .next/standalone/server.js
