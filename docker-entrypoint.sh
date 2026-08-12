#!/bin/sh
set -e

PRISMA="./node_modules/.bin/prisma"

# Wait for DB to be reachable; --skip-generate avoids runtime npm install
echo "Waiting for database..."
until $PRISMA db push --skip-generate; do
  echo "Database is unavailable - sleeping"
  sleep 3
done
echo "Database is ready."

# Prefer migration-history tracking; fall back to db push for P3005 (no migration history)
if $PRISMA migrate deploy --skip-generate; then
  echo "Migrations applied."
else
  echo "migrate deploy failed (no migration history), applying with db push..."
  $PRISMA db push --skip-generate
fi

echo "Starting Next.js server..."
exec node server.js
