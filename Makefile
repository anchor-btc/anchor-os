# =============================================================================
# Anchor Protocol - Makefile
# =============================================================================
# Common commands for development and operations
#
# Usage:
#   make help        - Show available commands
#   make up          - Start default profile
#   make up-full     - Start all services
#   make logs s=X    - View logs for service X
# =============================================================================

.PHONY: help up up-full up-min down build rebuild logs migrate db-reset clean setup

# Default target
help:
	@echo ""
	@echo "╔═══════════════════════════════════════════════════════════════╗"
	@echo "║                    Anchor Protocol                            ║"
	@echo "╚═══════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "Available commands:"
	@echo ""
	@echo "  Docker Compose:"
	@echo "    make up            Start default profile"
	@echo "    make up-full       Start all services (full profile)"
	@echo "    make up-min        Start minimum services"
	@echo "    make down          Stop all services"
	@echo "    make build         Build all containers"
	@echo "    make rebuild       Rebuild specific service (s=service-name)"
	@echo "    make logs          View logs (s=service-name)"
	@echo "    make ps            List running containers"
	@echo ""
	@echo "  Database:"
	@echo "    make migrate       Run database migrations"
	@echo "    make db-reset      Reset database (WARNING: deletes data)"
	@echo ""
	@echo "  Development:"
	@echo "    make setup         Initial development setup"
	@echo "    make clean         Stop containers and prune Docker"
	@echo "    make clean-all     Remove everything (volumes, node_modules, target)"
	@echo ""
	@echo "Examples:"
	@echo "    make up"
	@echo "    make logs s=core-bitcoin"
	@echo "    make rebuild s=dashboard-backend"
	@echo ""

# =============================================================================
# Docker Compose Commands
# =============================================================================

up:
	docker compose --profile default up -d

up-full:
	docker compose --profile full up -d

up-min:
	docker compose --profile minimum up -d

down:
	docker compose down

build:
	docker compose build

rebuild:
ifndef s
	$(error Usage: make rebuild s=<service-name>)
endif
	docker compose build $(s) && docker compose up -d $(s)

logs:
ifndef s
	docker compose logs -f --tail=100
else
	docker compose logs -f --tail=100 $(s)
endif

ps:
	docker compose ps

# =============================================================================
# Database Commands
# =============================================================================

migrate:
	./scripts/db-migrate.sh

db-reset:
	./scripts/db-reset.sh

# =============================================================================
# Development Commands
# =============================================================================

setup:
	./scripts/dev-setup.sh

clean:
	./scripts/clean.sh

clean-all:
	./scripts/clean.sh --all

# =============================================================================
# Service-specific shortcuts
# =============================================================================

.PHONY: bitcoin wallet dashboard threads

bitcoin:
	docker compose --profile core-bitcoin up -d

wallet:
	docker compose --profile core-wallet up -d

dashboard:
	docker compose --profile anchor-dashboard up -d

threads:
	docker compose --profile app-threads up -d

