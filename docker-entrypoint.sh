#!/bin/sh
echo "Initializing database..."
npx ts-node src/scripts/db-init.ts

echo "Starting application..."
npx ts-node src/index.ts