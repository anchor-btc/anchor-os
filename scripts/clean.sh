#!/bin/bash
# =============================================================================
# clean.sh - Clean up Docker resources and caches
# =============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🧹 Anchor Cleanup Script"
echo ""

# Parse arguments
CLEAN_VOLUMES=false
CLEAN_NODE_MODULES=false
CLEAN_TARGET=false
CLEAN_ALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--volumes)
            CLEAN_VOLUMES=true
            shift
            ;;
        -n|--node-modules)
            CLEAN_NODE_MODULES=true
            shift
            ;;
        -t|--target)
            CLEAN_TARGET=true
            shift
            ;;
        -a|--all)
            CLEAN_ALL=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  -v, --volumes       Remove Docker volumes (deletes all data)"
            echo "  -n, --node-modules  Remove node_modules directories"
            echo "  -t, --target        Remove Rust target directory"
            echo "  -a, --all           Remove everything (volumes + node_modules + target)"
            echo "  -h, --help          Show this help message"
            echo ""
            echo "Without options, only stops containers and prunes Docker."
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

if $CLEAN_ALL; then
    CLEAN_VOLUMES=true
    CLEAN_NODE_MODULES=true
    CLEAN_TARGET=true
fi

# Stop containers
echo "🛑 Stopping containers..."
cd "$PROJECT_ROOT" && docker compose down

# Remove volumes if requested
if $CLEAN_VOLUMES; then
    echo "🗑️  Removing Docker volumes..."
    cd "$PROJECT_ROOT" && docker compose down -v
fi

# Prune Docker
echo "🐳 Pruning Docker resources..."
docker system prune -f

# Remove node_modules if requested
if $CLEAN_NODE_MODULES; then
    echo "📦 Removing node_modules directories..."
    find "$PROJECT_ROOT" -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null || true
    echo "   Removed node_modules"
fi

# Remove target if requested
if $CLEAN_TARGET; then
    echo "🦀 Removing Rust target directory..."
    rm -rf "$PROJECT_ROOT/target"
    echo "   Removed target/"
fi

echo ""
echo "✅ Cleanup complete!"

