# Scripts

Automation scripts for common development tasks are located in the `scripts/` directory.

## Available Scripts

| Script | Description |
|--------|-------------|
| `dev-setup.sh` | Initial development environment setup |
| `db-migrate.sh` | Run database migrations manually |
| `db-reset.sh` | Reset database and re-run migrations |
| `docker-logs.sh` | View container logs with colors |
| `clean.sh` | Clean up Docker resources and caches |

## dev-setup.sh

Initial setup for new developers.

```bash
./scripts/dev-setup.sh
# or
make setup
```

**What it does:**
1. Checks for Docker and Docker Compose
2. Creates `.env` file from template (if not exists)
3. Installs npm dependencies
4. Pulls Docker images

**Example output:**
```
🚀 Setting up Anchor development environment...
📋 Checking required tools...
✅ Docker: Docker version 24.0.7
✅ Docker Compose: Docker Compose version v2.23.0
📝 Creating .env file...
✅ Created .env file
📦 Installing npm dependencies...
🐳 Pulling Docker images...

✅ Development environment setup complete!

Next steps:
  1. Start services:  make up
  2. View logs:       make logs s=core-bitcoin
  3. Stop services:   make down
```

## db-migrate.sh

Run database migrations from all apps.

```bash
./scripts/db-migrate.sh
# or
make migrate
```

**How it works:**
- Collects migrations from all app directories
- Runs them in order (by filename prefix)
- Uses local `psql` if available, otherwise runs via Docker

**Example output:**
```
🗃️  Running database migrations...
   Database: postgres://anchor:anchor@localhost:5432/anchor

   → Applying: internal/anchor-indexer/migrations/0001_core_carrier.sql
   → Applying: dashboard/backend/migrations/0010_dashboard_settings.sql
   → Applying: apps/anchor-canvas/backend/migrations/0002_canvas_schema.sql
   ...

✅ Migrations complete: 14/14 applied
```

## db-reset.sh

Reset the database and re-run all migrations.

```bash
./scripts/db-reset.sh
# or
make db-reset
```

::: danger
This will **delete all data** in the database!
:::

**What it does:**
1. Prompts for confirmation
2. Stops PostgreSQL container
3. Removes PostgreSQL volume
4. Starts PostgreSQL (migrations run automatically)

**Example:**
```
⚠️  WARNING: This will delete all data in the database!

Are you sure you want to continue? (y/N) y
🛑 Stopping PostgreSQL container...
🗑️  Removing PostgreSQL volume...
🚀 Starting PostgreSQL container...
⏳ Waiting for PostgreSQL to be ready...

✅ Database reset complete!
```

## docker-logs.sh

View logs for a specific service.

```bash
./scripts/docker-logs.sh <service-name> [lines]
```

**Examples:**
```bash
# Last 100 lines of Bitcoin Core logs
./scripts/docker-logs.sh core-bitcoin

# Last 500 lines of Dashboard API
./scripts/docker-logs.sh anchor-dashboard-backend 500
```

**Without arguments, shows available services:**
```
Usage: ./scripts/docker-logs.sh <service-name> [lines]

Available services:
  core-bitcoin
  core-postgres
  core-wallet
  anchor-dashboard-backend
  anchor-dashboard-frontend
  ...
```

## clean.sh

Clean up Docker resources.

```bash
./scripts/clean.sh [options]
# or
make clean
make clean-all
```

**Options:**

| Flag | Description |
|------|-------------|
| `-v, --volumes` | Remove Docker volumes (deletes data) |
| `-n, --node-modules` | Remove all node_modules directories |
| `-t, --target` | Remove Rust target directory |
| `-a, --all` | All of the above |
| `-h, --help` | Show help |

**Examples:**
```bash
# Just stop containers and prune
./scripts/clean.sh

# Remove everything
./scripts/clean.sh --all

# Only remove node_modules
./scripts/clean.sh --node-modules
```

**Example output:**
```
🧹 Anchor Cleanup Script

🛑 Stopping containers...
🗑️  Removing Docker volumes...
🐳 Pruning Docker resources...
📦 Removing node_modules directories...
   Removed node_modules
🦀 Removing Rust target directory...
   Removed target/

✅ Cleanup complete!
```

## Creating New Scripts

When adding new scripts:

1. Place them in `scripts/`
2. Add execute permission: `chmod +x scripts/my-script.sh`
3. Follow the existing style (shebang, comments, error handling)
4. Add a corresponding Makefile target if appropriate
5. Document in this file

**Script template:**
```bash
#!/bin/bash
# =============================================================================
# my-script.sh - Brief description
# =============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🔧 My script..."

# Your code here

echo "✅ Done!"
```

