# Makefile

The project includes a Makefile for common development commands. Run `make help` to see all available commands.

## Quick Reference

```bash
make help          # Show all commands
make up            # Start default profile
make up-full       # Start all services
make up-min        # Start minimum services
make down          # Stop all services
make logs s=X      # View logs for service X
make rebuild s=X   # Rebuild and restart service X
make migrate       # Run database migrations
make clean         # Clean Docker resources
```

## Docker Compose Commands

### Starting Services

```bash
# Default profile (standard development)
make up

# Full profile (all services)
make up-full

# Minimum profile (core only)
make up-min
```

### Stopping Services

```bash
make down
```

### Building

```bash
# Build all containers
make build

# Rebuild specific service
make rebuild s=dashboard-backend
make rebuild s=app-threads-frontend
```

### Viewing Logs

```bash
# All services
make logs

# Specific service
make logs s=core-bitcoin
make logs s=anchor-dashboard-backend
```

### Container Status

```bash
make ps
```

## Database Commands

### Run Migrations

```bash
make migrate
```

Executes migrations from all apps in order.

### Reset Database

```bash
make db-reset
```

::: danger
This deletes all data! Use with caution.
:::

## Development Commands

### Initial Setup

```bash
make setup
```

Runs `dev-setup.sh` to prepare the development environment.

### Cleanup

```bash
# Stop containers and prune Docker
make clean

# Remove everything (volumes, node_modules, target)
make clean-all
```

## Service Shortcuts

Quick commands for common services:

```bash
make bitcoin      # Start Bitcoin Core only
make wallet       # Start Wallet service only
make dashboard    # Start Dashboard only
make threads      # Start Threads app only
```

## Using Variables

Some commands accept a service parameter:

```bash
# View logs for a service
make logs s=core-bitcoin

# Rebuild a service
make rebuild s=dashboard-backend
```

If you forget the parameter, Make will show an error:

```bash
$ make rebuild
Makefile:XX: *** Usage: make rebuild s=<service-name>.  Stop.
```

## Examples

### Full Development Workflow

```bash
# Initial setup
make setup

# Start services
make up

# View dashboard
open http://localhost:8000

# Check logs while developing
make logs s=dashboard-backend

# After code changes
make rebuild s=dashboard-backend

# When done
make down
```

### Reset Everything

```bash
# Stop and remove all data
make clean-all

# Fresh start
make up
```

### Debugging a Service

```bash
# Start minimum services
make up-min

# Check if Bitcoin is ready
make logs s=core-bitcoin

# Check wallet status
make logs s=core-wallet

# View PostgreSQL logs
make logs s=core-postgres
```

## Customizing

The Makefile is located at the project root. Add your own targets:

```makefile
# Add to Makefile
.PHONY: my-command

my-command:
	@echo "Running my command..."
	# Your command here
```

Then use:

```bash
make my-command
```

## Troubleshooting

### Command Not Found

If `make` is not installed:

```bash
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt-get install build-essential

# Fedora
sudo dnf install make
```

### Permission Denied

If scripts fail with permission errors:

```bash
chmod +x scripts/*.sh
```

### Docker Issues

If Docker commands fail:

```bash
# Check Docker is running
docker info

# Check Docker Compose version
docker compose version

# Must be v2.20+ for include directive
```

