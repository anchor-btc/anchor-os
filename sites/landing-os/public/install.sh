#!/bin/bash
#
#  ⚓ ANCHOR OS - Quick Install Script
#  https://github.com/anchor-btc/anchor-os
#
#  Run with: curl -fsSL http://os.anchor-protocol.com/install.sh | bash
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
ORANGE='\033[0;33m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# ASCII Art Logo
echo ""
echo -e "${ORANGE}"
cat << "EOF"
               ___
              /   \
             |  o  |
              \   /
       ________) (________
      |                   |
      '------.     .------'
              |   |
              |   |
              |   |
              |   |
   /\         |   |         /\
  /_ \        /   \        / _\
    \ '.    .'     '.    .' /
     \  '--'         '--'  /
      '.                 .'
        '._           _.'
           `'-.   .-'`
               \ /
                `

EOF
echo -e "${NC}"
echo -e "${BOLD}               A N C H O R   O S${NC}"
echo -e "         ${ORANGE}Your Bitcoin Stack. Your Rules.${NC}"
echo ""
echo -e "    ═══════════════════════════════════════════════"
echo ""

# Check requirements
echo -e "${BLUE}[1/5]${NC} Checking requirements..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗${NC} Docker is not installed."
    echo -e "  Please install Docker first: ${YELLOW}https://docs.docker.com/get-docker/${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker is installed"

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo -e "${RED}✗${NC} Docker Compose is not available."
    echo -e "  Please install Docker Compose: ${YELLOW}https://docs.docker.com/compose/install/${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker Compose is available"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}✗${NC} Git is not installed."
    echo -e "  Please install Git first."
    exit 1
fi
echo -e "${GREEN}✓${NC} Git is installed"

# Set installation directory
INSTALL_DIR="${ANCHOR_INSTALL_DIR:-$HOME/anchor}"

echo ""
echo -e "${BLUE}[2/5]${NC} Cloning Anchor OS to ${YELLOW}${INSTALL_DIR}${NC}..."

# Clone or update repository
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}!${NC} Directory exists. Updating..."
    cd "$INSTALL_DIR"
    git pull origin main --quiet
else
    git clone --quiet https://github.com/anchor-btc/anchor-os.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi
echo -e "${GREEN}✓${NC} Repository ready"

# Copy environment file
echo ""
echo -e "${BLUE}[3/5]${NC} Setting up configuration..."

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓${NC} Created .env file from template"
    fi
else
    echo -e "${YELLOW}!${NC} .env file already exists, skipping"
fi

# Start services
echo ""
echo -e "${BLUE}[4/5]${NC} Starting Anchor OS services..."
echo -e "${YELLOW}  This may take a few minutes on first run...${NC}"
echo ""

docker compose --profile minimum up -d

# Wait for services
echo ""
echo -e "${BLUE}[5/5]${NC} Waiting for services to be ready..."
sleep 5

# Success message
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ⚓ ANCHOR OS INSTALLED SUCCESSFULLY!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}Dashboard:${NC}     ${YELLOW}http://localhost:8000${NC}"
echo -e "  ${BOLD}Documentation:${NC} ${YELLOW}https://docs.anchor-protocol.com${NC}"
echo ""
echo -e "  ${BOLD}Quick Commands:${NC}"
echo -e "    cd ${INSTALL_DIR}"
echo -e "    docker compose logs -f        ${BLUE}# View logs${NC}"
echo -e "    docker compose ps             ${BLUE}# Check status${NC}"
echo -e "    docker compose down           ${BLUE}# Stop all services${NC}"
echo ""
echo -e "${ORANGE}  ⚡ Your sovereign Bitcoin stack is now running!${NC}"
echo ""

