#!/bin/bash
set -e

# Wait for the database to be ready
until npx prisma db push --preview-feature || npx prisma migrate deploy; do
  echo "Database is unavailable - sleeping"
  sleep 3
done

echo "Database is ready. Running migrations..."
# Run migrations (prefer migrate deploy, fallback to db push)
if npx prisma migrate deploy; then
  echo "Migrations applied."
else
  echo "migrate deploy failed, trying db push..."
  npx prisma db push
fi

echo "Starting Next.js server..."
exec npm start
