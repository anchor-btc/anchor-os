#!/bin/bash
# =============================================================================
# dev-setup.sh - Initial development environment setup
# =============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Setting up Anchor development environment..."

# Check required tools
echo "📋 Checking required tools..."
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }
command -v docker compose version >/dev/null 2>&1 || { echo "❌ Docker Compose V2 is required but not installed."; exit 1; }

echo "✅ Docker: $(docker --version)"
echo "✅ Docker Compose: $(docker compose version)"

# Create .env if it doesn't exist
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "📝 Creating .env file..."
    cat > "$PROJECT_ROOT/.env" << 'EOF'
# Anchor Protocol - Environment Variables
# Copy this to .env and adjust as needed

# Bitcoin Core
BITCOIN_RPC_USER=anchor
BITCOIN_RPC_PASSWORD=anchor
BITCOIN_NETWORK=regtest

# PostgreSQL
POSTGRES_USER=anchor
POSTGRES_PASSWORD=anchor
POSTGRES_DB=anchor
DATABASE_URL=postgres://anchor:anchor@localhost:5432/anchor

# Optional: Cloudflare Tunnel
# CLOUDFLARE_TUNNEL_TOKEN=your-token-here
EOF
    echo "✅ Created .env file"
else
    echo "✅ .env file already exists"
fi

# Install npm dependencies if package.json exists
if [ -f "$PROJECT_ROOT/package.json" ]; then
    echo "📦 Installing npm dependencies..."
    cd "$PROJECT_ROOT" && npm install
fi

# Pull Docker images
echo "🐳 Pulling Docker images..."
cd "$PROJECT_ROOT" && docker compose pull --ignore-pull-failures 2>/dev/null || true

echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start services:  make up"
echo "  2. View logs:       make logs s=core-bitcoin"
echo "  3. Stop services:   make down"
echo ""

