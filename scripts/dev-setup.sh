#!/bin/bash
# =============================================================================
# dev-setup.sh - Install all dependencies (npm + cargo)
# =============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Setting up Anchor development environment..."
echo ""

# Check required tools
echo "📋 Checking required tools..."
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed."; exit 1; }

echo "✅ Docker: $(docker --version)"
echo "✅ Node: $(node --version)"
echo "✅ npm: $(npm --version)"

# Check for Rust (optional for Docker-only setup)
if command -v cargo >/dev/null 2>&1; then
    echo "✅ Cargo: $(cargo --version)"
    HAS_CARGO=true
else
    echo "⚠️  Cargo not found - Rust builds will only work in Docker"
    HAS_CARGO=false
fi

echo ""

# Create .env if it doesn't exist
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "📝 Creating .env file..."
    cat > "$PROJECT_ROOT/.env" << 'EOF'
# Anchor Protocol - Environment Variables
BITCOIN_RPC_USER=anchor
BITCOIN_RPC_PASSWORD=anchor
BITCOIN_NETWORK=regtest
POSTGRES_USER=anchor
POSTGRES_PASSWORD=anchor
POSTGRES_DB=anchor
DATABASE_URL=postgres://anchor:anchor@localhost:5432/anchor
EOF
    echo "✅ Created .env file"
fi

# =============================================================================
# NPM INSTALLS
# =============================================================================
echo ""
echo "📦 Installing npm dependencies..."
echo "================================="

# All directories with package.json
NPM_DIRS=(
    "."
    "dashboard/frontend"
    "sites/docs"
    "sites/landing-os"
    "sites/landing-protocol"
    "libs/js/anchor-sdk"
    "libs/js/anchor-ui"
    "e2e"
    "apps/anchor-threads/frontend"
    "apps/anchor-canvas/frontend"
    "apps/anchor-places/frontend"
    "apps/anchor-domains/frontend"
    "apps/anchor-domains/extension"
    "apps/anchor-proofs/frontend"
    "apps/anchor-tokens/frontend"
    "apps/anchor-oracles/frontend"
    "apps/anchor-predictions/frontend"
)

for dir in "${NPM_DIRS[@]}"; do
    if [ -f "$PROJECT_ROOT/$dir/package.json" ]; then
        echo "  📁 $dir"
        cd "$PROJECT_ROOT/$dir" && npm install --silent 2>/dev/null || npm install
    fi
done

echo "✅ npm dependencies installed"

# =============================================================================
# CARGO BUILD (optional)
# =============================================================================
if [ "$HAS_CARGO" = true ]; then
    echo ""
    echo "🦀 Building Rust workspace..."
    echo "=============================="
    cd "$PROJECT_ROOT"
    cargo build --release 2>&1 | tail -5 || echo "⚠️  Cargo build had issues (this is OK for Docker-only setup)"
    echo "✅ Cargo build complete"
fi

# =============================================================================
# DOCKER PULL
# =============================================================================
echo ""
echo "🐳 Pulling Docker base images..."
cd "$PROJECT_ROOT" && docker compose pull --ignore-pull-failures 2>/dev/null || true

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ Development environment setup complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  make up-min    Start minimum (core + dashboard)"
echo "  make up        Start with all apps"
echo "  make logs      View logs"
echo ""
