#!/bin/bash
# =============================================================================
# docker-logs.sh - View Docker container logs with colors
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

SERVICE="$1"
LINES="${2:-100}"

if [ -z "$SERVICE" ]; then
    echo "Usage: $0 <service-name> [lines]"
    echo ""
    echo "Available services:"
    cd "$PROJECT_ROOT" && docker compose ps --format "table {{.Name}}" 2>/dev/null | tail -n +2 | sed 's/anchor-/  /'
    echo ""
    echo "Examples:"
    echo "  $0 core-bitcoin        # Last 100 lines of Bitcoin Core logs"
    echo "  $0 core-postgres 500   # Last 500 lines of PostgreSQL logs"
    echo "  $0 dashboard-backend   # Last 100 lines of Dashboard API logs"
    exit 1
fi

cd "$PROJECT_ROOT" && docker compose logs -f --tail="$LINES" "$SERVICE"

