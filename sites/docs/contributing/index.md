# Contributing

Set up a local development environment for the Anchor Protocol.

## Prerequisites

- **Docker** 24+ with Docker Compose V2
- **Node.js** 18+
- **Rust** 1.75+ (for backend development)
- **Git**

## Quick Start

```bash
# Clone the repository
git clone https://github.com/anchor-btc/anchor-os.git
cd anchor

# Initial setup
make setup

# Start services
make up

# View dashboard
open http://localhost:8000
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Apps                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Threads │ │ Canvas  │ │ Domains │ │ Tokens  │  ...      │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │
│       └───────────┴─────┬─────┴───────────┘                 │
│                    ┌────┴────┐                              │
│                    │ Wallet  │                              │
│                    │  API    │                              │
│                    └────┬────┘                              │
│       ┌─────────────────┼─────────────────┐                 │
│  ┌────┴────┐      ┌────┴────┐      ┌────┴────┐             │
│  │ Bitcoin │      │ Indexer │      │Postgres │             │
│  │  Core   │      │         │      │         │             │
│  └─────────┘      └─────────┘      └─────────┘             │
└─────────────────────────────────────────────────────────────┘
```

## Key Technologies

| Layer | Technology |
|-------|------------|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Rust, Axum, Tokio |
| Database | PostgreSQL |
| Blockchain | Bitcoin Core (regtest/mainnet) |
| Infrastructure | Docker Compose |

## Project Structure

```
anchor/
├── apps/              # User-facing applications
├── dashboard/         # Admin dashboard
├── docker/            # Docker Compose files
├── infra/             # Infrastructure configs
├── internal/          # Core internal services
├── libs/              # Shared libraries
├── sites/             # Documentation and landing pages
└── Makefile           # Development commands
```

## Docker Profiles

```bash
# Minimum - core infrastructure only
make up-min

# Default - standard development
make up

# Full - all services including explorers
make up-full
```

## Key Services

| Service | Port | Description |
|---------|------|-------------|
| Dashboard | 8000 | Admin UI |
| Bitcoin RPC | 18443 | Bitcoin Core (regtest) |
| Wallet API | 8001 | REST API |
| PostgreSQL | 5432 | Database |
| Mempool | 4000 | Block explorer |

## Common Commands

```bash
# View logs
docker compose logs -f core-bitcoin

# Rebuild a service
make rebuild s=dashboard-backend

# Stop all services
docker compose down

# Reset all data
docker compose down -v
```

## Getting Help

- [GitHub Issues](https://github.com/anchor-btc/anchor-os/issues)
- [GitHub Discussions](https://github.com/anchor-btc/anchor-os/discussions)
- [Discord](https://discord.gg/mrzgrFt5)
- [Telegram](https://t.me/+s7sBoBaI3XNmOTgx)
- [X / Twitter](https://x.com/AnchorProt26203)

