#!/bin/bash
# =============================================================================
# db-migrate.sh - Run all database migrations
# =============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

DATABASE_URL="${DATABASE_URL:-postgres://anchor:anchor@localhost:5432/anchor}"

# Migration directories in order
MIGRATION_DIRS=(
    "internal/anchor-indexer/migrations"
    "dashboard/backend/migrations"
    "apps/anchor-canvas/backend/migrations"
    "apps/anchor-places/backend/migrations"
    "apps/anchor-domains/backend/migrations"
    "apps/anchor-proofs/backend/migrations"
    "apps/anchor-tokens/backend/migrations"
    "apps/anchor-oracles/backend/migrations"
    "apps/anchor-predictions/backend/migrations"
)

echo "🗃️  Running database migrations..."
echo "   Database: $DATABASE_URL"
echo ""

# Check if psql is available
if ! command -v psql >/dev/null 2>&1; then
    echo "⚠️  psql not found locally. Running via Docker..."
    PSQL_CMD="docker exec -i anchor-core-postgres psql -U anchor -d anchor"
else
    PSQL_CMD="psql $DATABASE_URL"
fi

TOTAL=0
APPLIED=0

for dir in "${MIGRATION_DIRS[@]}"; do
    full_path="$PROJECT_ROOT/$dir"
    if [ -d "$full_path" ]; then
        for sql in "$full_path"/*.sql; do
            if [ -f "$sql" ]; then
                TOTAL=$((TOTAL + 1))
                filename=$(basename "$sql")
                echo "   → Applying: $dir/$filename"
                if [ "$PSQL_CMD" = "docker exec -i anchor-core-postgres psql -U anchor -d anchor" ]; then
                    cat "$sql" | $PSQL_CMD -q 2>/dev/null && APPLIED=$((APPLIED + 1)) || echo "     ⚠️  Already applied or error"
                else
                    $PSQL_CMD -f "$sql" -q 2>/dev/null && APPLIED=$((APPLIED + 1)) || echo "     ⚠️  Already applied or error"
                fi
            fi
        done
    fi
done

echo ""
echo "✅ Migrations complete: $APPLIED/$TOTAL applied"

