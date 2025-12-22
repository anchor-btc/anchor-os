# Project Structure

The Anchor Protocol uses a **monorepo** architecture with clear separation of concerns. Each directory has a specific purpose.

## Root Directory

```
anchor/
├── apps/                    # User-facing applications
├── dashboard/               # Admin dashboard
├── docker/                  # Docker Compose files (modular)
├── infra/                   # Infrastructure configs
├── internal/                # Core internal services
├── libs/                    # Shared libraries
├── scripts/                 # Automation scripts
├── sites/                   # Documentation and landing pages
├── docker-compose.yml       # Main compose file (includes all)
├── Makefile                 # Development commands
├── Cargo.toml               # Rust workspace
└── package.json             # Node.js workspace
```

## Applications (`apps/`)

Each application follows a consistent structure:

```
apps/
├── anchor-canvas/           # Collaborative pixel canvas
│   ├── backend/
│   │   ├── Cargo.toml
│   │   ├── Dockerfile
│   │   ├── migrations/      # App-specific migrations
│   │   └── src/
│   └── frontend/
│       ├── Dockerfile
│       ├── package.json
│       └── src/
├── anchor-domains/          # Decentralized DNS
├── anchor-oracles/          # Oracle network
├── anchor-places/           # Geographic markers
├── anchor-predictions/      # Prediction markets
├── anchor-proofs/           # Proof of existence
├── anchor-threads/          # Social messaging
└── anchor-tokens/           # Token protocol
```

### App Structure Pattern

Every app follows this pattern:

| Path | Description |
|------|-------------|
| `backend/` | Rust backend with Axum |
| `backend/Dockerfile` | Container build instructions |
| `backend/migrations/` | PostgreSQL migrations for this app |
| `backend/src/` | Rust source code |
| `frontend/` | Next.js frontend |
| `frontend/Dockerfile` | Container build instructions |
| `frontend/src/` | React/TypeScript source |

## Dashboard (`dashboard/`)

Central administration interface:

```
dashboard/
├── backend/
│   ├── Cargo.toml
│   ├── Dockerfile
│   ├── migrations/          # Dashboard-specific migrations
│   └── src/
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── components/
        ├── pages/
        └── ...
```

## Docker Configuration (`docker/`)

Modular Docker Compose setup for easier maintenance:

```
docker/
├── compose.core.yml         # Bitcoin, PostgreSQL, Wallet, Indexer
├── compose.electrum.yml     # Electrs, Fulcrum
├── compose.explorers.yml    # Mempool, BTC-RPC Explorer
├── compose.networking.yml   # Tor, Tailscale, Cloudflare
├── compose.monitoring.yml   # Netdata
├── compose.dashboard.yml    # Dashboard frontend/backend
├── compose.apps.yml         # All applications
└── compose.sites.yml        # Docs, landing pages
```

The main `docker-compose.yml` uses the `include` directive to combine all:

```yaml
include:
  - docker/compose.core.yml
  - docker/compose.electrum.yml
  - docker/compose.explorers.yml
  # ... etc
```

## Infrastructure (`infra/`)

Third-party service configurations:

```
infra/
├── bitcoin-core/
│   ├── bitcoin.conf
│   └── Dockerfile
├── electrs/
│   └── Dockerfile
├── fulcrum/
│   ├── Dockerfile
│   └── fulcrum.conf
├── postgres/
│   ├── init.sql             # Base initialization
│   └── README.md
└── tor/
    └── torrc
```

## Internal Services (`internal/`)

Core services not exposed to users:

```
internal/
├── anchor-indexer/          # Blockchain indexer
│   ├── Cargo.toml
│   ├── Dockerfile
│   ├── migrations/
│   └── src/
├── anchor-testnet/          # Testnet block generator
│   ├── Cargo.toml
│   ├── Dockerfile
│   └── src/
└── anchor-wallet/           # Wallet service
    ├── Cargo.toml
    ├── Dockerfile
    └── src/
```

## Shared Libraries (`libs/`)

Reusable code shared across apps:

```
libs/
├── js/
│   ├── anchor-sdk/          # TypeScript SDK for external use
│   └── anchor-ui/           # Shared UI components
└── rust/
    ├── anchor-core/         # Core protocol implementation
    ├── anchor-specs/        # Protocol specifications
    └── anchor-wallet-lib/   # Wallet library
```

## Sites (`sites/`)

Public-facing websites:

```
sites/
├── docs/                    # This documentation (VitePress)
├── landing-os/              # anchorOS.dev landing page
└── landing-protocol/        # anchor.dev landing page
```

## Scripts (`scripts/`)

Automation scripts:

```
scripts/
├── dev-setup.sh             # Initial setup
├── db-migrate.sh            # Run migrations
├── db-reset.sh              # Reset database
├── docker-logs.sh           # View logs
└── clean.sh                 # Cleanup resources
```

See [Scripts Documentation](/development/scripts) for details.

## Database Migrations

Migrations are distributed per app for isolation:

| Service | Migration Path |
|---------|---------------|
| Core Indexer | `internal/anchor-indexer/migrations/` |
| Dashboard | `dashboard/backend/migrations/` |
| Canvas | `apps/anchor-canvas/backend/migrations/` |
| Domains | `apps/anchor-domains/backend/migrations/` |
| Oracles | `apps/anchor-oracles/backend/migrations/` |
| Places | `apps/anchor-places/backend/migrations/` |
| Predictions | `apps/anchor-predictions/backend/migrations/` |
| Proofs | `apps/anchor-proofs/backend/migrations/` |
| Tokens | `apps/anchor-tokens/backend/migrations/` |

PostgreSQL automatically runs these on container startup in order.

## Design Principles

1. **Isolation**: Each app owns its code, migrations, and Dockerfile
2. **Consistency**: All apps follow the same structure pattern
3. **Modularity**: Docker Compose split for easier maintenance
4. **Reusability**: Shared code in `libs/` for DRY principle
5. **Automation**: Scripts and Makefile for common tasks

