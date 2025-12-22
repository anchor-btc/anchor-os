# Docker Setup

The Anchor Protocol uses Docker Compose with a modular configuration split across multiple files for easier maintenance.

## File Structure

```
docker-compose.yml           # Main file (includes all others)
docker/
├── compose.core.yml         # Bitcoin, PostgreSQL, Wallet, Indexer, Testnet
├── compose.electrum.yml     # Electrs, Fulcrum
├── compose.explorers.yml    # Mempool, BTC-RPC Explorer, Esplora, Bitfeed
├── compose.networking.yml   # Tor, Tailscale, Cloudflare
├── compose.monitoring.yml   # Netdata
├── compose.dashboard.yml    # Dashboard frontend/backend
├── compose.apps.yml         # All applications
└── compose.sites.yml        # Docs, landing pages
```

## Profiles

Docker Compose profiles allow you to start different sets of services:

### Minimum Profile

Core infrastructure only - fastest startup:

```bash
docker compose --profile minimum up -d
# or
make up-min
```

**Services included:**
- `core-bitcoin` - Bitcoin Core (regtest)
- `core-postgres` - PostgreSQL database
- `core-indexer` - Blockchain indexer
- `core-wallet` - Wallet API
- `core-testnet` - Block generator
- `networking-tor` - Tor proxy
- `anchor-dashboard-*` - Dashboard
- `anchor-docs` - Documentation
- `app-threads-*` - Threads app

### Default Profile

Standard development environment:

```bash
docker compose --profile default up -d
# or
make up
```

**Additional services:**
- `core-electrs` - Electrum server
- `explorer-mempool-*` - Mempool explorer
- `anchor-landing-*` - Landing pages

### Full Profile

All services including explorers and monitoring:

```bash
docker compose --profile full up -d
# or
make up-full
```

**Additional services:**
- All explorers (Esplora, Bitfeed, BTC-RPC)
- All apps (Canvas, Domains, Tokens, etc.)
- Monitoring (Netdata)
- Additional networking options

### Single Service Profiles

Start specific services:

```bash
# Just Bitcoin Core
docker compose --profile core-bitcoin up -d

# Just the Dashboard
docker compose --profile anchor-dashboard up -d

# Just Threads app
docker compose --profile app-threads up -d
```

## Available Services

### Core Services

| Service | Port | Description |
|---------|------|-------------|
| `core-bitcoin` | 18443 | Bitcoin Core RPC (regtest) |
| `core-postgres` | 5432 | PostgreSQL database |
| `core-wallet` | 8001 | Wallet REST API |
| `core-testnet` | 8002 | Testnet controller |
| `core-indexer` | - | Blockchain indexer (no port) |

### Electrum Servers

| Service | Port | Description |
|---------|------|-------------|
| `core-electrs` | 50001 | Electrs (default) |
| `core-fulcrum` | 50001 | Fulcrum (alternative) |

::: warning
Only one Electrum server can run at a time (same port).
:::

### Block Explorers

| Service | Port | Description |
|---------|------|-------------|
| `explorer-mempool-web` | 4000 | Mempool.space |
| `explorer-btc-rpc` | 4010 | BTC-RPC Explorer |
| `explorer-bitfeed-web` | 4020 | Bitfeed visualizer |
| `explorer-esplora` | 4030 | Blockstream Esplora |

### Dashboard

| Service | Port | Description |
|---------|------|-------------|
| `anchor-dashboard-frontend` | 8000 | Dashboard UI |
| `anchor-dashboard-backend` | 8010 | Dashboard API |

### Applications

| Service | Frontend Port | Backend Port |
|---------|--------------|--------------|
| Threads | 3100 | 3101 |
| Canvas | 3200 | 3201 |
| Places | 3300 | 3301 |
| Domains | 3400 | 3401 |
| Proofs | 3500 | 3501 |
| Tokens | 3600 | 3601 |
| Oracles | 3700 | 3701 |
| Predictions | 3800 | 3801 |

### Sites

| Service | Port | Description |
|---------|------|-------------|
| `anchor-docs` | 3900 | Documentation |
| `anchor-landing-protocol` | 3950 | Protocol landing |
| `anchor-landing-os` | 3951 | OS landing |

## Common Commands

```bash
# Start default profile
docker compose --profile default up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f core-bitcoin

# Rebuild a service
docker compose build app-threads-backend
docker compose up -d app-threads-backend

# Remove volumes (WARNING: deletes data)
docker compose down -v
```

## Building Services

After code changes, rebuild the affected service:

```bash
# Rebuild and restart
make rebuild s=dashboard-backend

# Or manually
docker compose build dashboard-backend
docker compose up -d dashboard-backend
```

## Volumes

Persistent data is stored in named volumes:

| Volume | Description |
|--------|-------------|
| `bitcoin-data` | Bitcoin blockchain data |
| `postgres-data` | PostgreSQL database |
| `wallet-data` | Wallet keys and state |
| `electrs-data` | Electrs index |
| `fulcrum-data` | Fulcrum index |
| `tor-data` | Tor hidden service keys |

To reset all data:

```bash
docker compose down -v
# or
make clean-all
```

## Networks

All services connect to `anchor-network` bridge network for inter-service communication.

Services reference each other by name:
- `http://core-bitcoin:18443` - Bitcoin RPC
- `http://core-wallet:8001` - Wallet API
- `postgres://anchor:anchor@core-postgres:5432/anchor` - Database

## Environment Variables

Key environment variables:

```bash
# Bitcoin
BITCOIN_RPC_URL=http://core-bitcoin:18443
BITCOIN_RPC_USER=anchor
BITCOIN_RPC_PASSWORD=anchor

# PostgreSQL
DATABASE_URL=postgres://anchor:anchor@core-postgres:5432/anchor

# Services
WALLET_URL=http://core-wallet:8001
```

See individual compose files for complete environment configuration.

