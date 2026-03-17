#!/bin/sh
set -e

echo "Waiting for database..."
until node -e "const net = require('net'); const s = net.createConnection({host:'${DB_HOST:-db}',port:5432}); s.on('connect',()=>{s.end();process.exit(0)}); s.on('error',()=>process.exit(1));" 2>/dev/null; do
  sleep 1
done
echo "Database is ready."

echo "Applying database schema..."
node ./node_modules/prisma/build/index.js db push --skip-generate || echo "Schema push encountered an issue, continuing..."

echo "Seeding database..."
node ./prisma/seed.js || echo "Seed skipped or already applied."

echo "Starting Next.js..."
exec node server.js
