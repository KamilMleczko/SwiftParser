#!/bin/sh

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to start..."
until nc -z mongodb 27017; do
  sleep 1
done
echo "MongoDB started"

# Run database initialization script using ts-node
echo "Initializing database..."
npx ts-node src/scripts/db-init.ts

# Start the application
echo "Starting application..."
npx ts-node src/index.ts