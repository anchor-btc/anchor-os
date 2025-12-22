#!/bin/bash
# =============================================================================
# db-reset.sh - Reset database and run all migrations
# =============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "⚠️  WARNING: This will delete all data in the database!"
echo ""
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo "🛑 Stopping PostgreSQL container..."
cd "$PROJECT_ROOT" && docker compose stop core-postgres

echo "🗑️  Removing PostgreSQL volume..."
docker volume rm anchor_postgres-data 2>/dev/null || true

echo "🚀 Starting PostgreSQL container..."
cd "$PROJECT_ROOT" && docker compose --profile minimum up -d core-postgres

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Wait for postgres to be healthy
for i in {1..30}; do
    if docker exec anchor-core-postgres pg_isready -U anchor -d anchor >/dev/null 2>&1; then
        break
    fi
    echo "   Waiting... ($i/30)"
    sleep 2
done

echo ""
echo "✅ Database reset complete!"
echo ""
echo "Note: Migrations are automatically applied on container startup."
echo "If you need to manually run migrations: ./scripts/db-migrate.sh"

