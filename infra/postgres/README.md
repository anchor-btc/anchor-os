# PostgreSQL Database Schemas

This directory contains all database migrations and schemas for the Anchor Protocol.

## Directory Structure

```
infra/postgres/
├── init.sql                    # Base extensions and initial setup
├── migrations/                 # All database schemas (centralized)
│   ├── 0001_core_carrier.sql   # Core protocol carrier column
│   ├── 0002_canvas_schema.sql  # Anchor Canvas (collaborative pixel art)
│   ├── 0003_places_schema.sql  # Anchor Places (geo-anchored content)
│   ├── 0004_domains_schema.sql # Anchor Domains (decentralized DNS)
│   ├── 0005_proofs_schema.sql  # Anchor Proofs (proof of existence)
│   ├── 0006_anchor_tokens_schema.sql # Anchor Tokens
│   ├── 0010_dashboard_settings.sql # Dashboard settings
│   ├── 0011_dashboard_tor.sql   # Dashboard Tor config
│   ├── 0012_dashboard_electrum.sql # Dashboard Electrum
│   ├── 0013_dashboard_installation.sql # Installation config
│   ├── 0014_dashboard_profile.sql # User profile
│   ├── 0015_dashboard_notifications.sql # Notifications
│   ├── 0020_oracles_schema.sql  # Anchor Oracles
│   └── 0021_predictions_schema.sql # Anchor Predictions (Lottery)
└── README.md                   # This file
```

## Numbering Convention

Migrations use a 4-digit numbering system with gaps for different domains:

| Range | Domain | Description |
|-------|--------|-------------|
| `0001-0009` | Core Protocol | Base protocol schemas (indexer, carriers) |
| `0010-0019` | Dashboard | Admin dashboard settings |
| `0020-0029` | Oracles/Predictions | Oracle network and lottery |
| `0030-0039` | Canvas/Pixel | Collaborative pixel canvas |
| `0040-0049` | Places/Map | Geo-anchored content |
| `0050-0059` | Domains/DNS | Decentralized DNS |
| `0060-0069` | Proofs | Proof of Existence |
| `0070-0079` | Tokens | UTXO-based tokens |
| `0080-0089` | Threads | Decentralized messaging |
| `0090-0099` | Reserved | Future apps |

## Database Instances

The Anchor Protocol uses multiple PostgreSQL instances:

### Main Database (`core-postgres`)
- **Database:** `anchor`
- **Schemas:** 0001-0006 (core protocol)
- **Used by:** indexer, wallet, apps reading protocol data

### Dashboard Database (embedded in core-postgres)
- **Schemas:** 0010-0015 (dashboard settings)
- **Used by:** dashboard backend

### App-Specific Databases
Some apps have isolated PostgreSQL instances for data separation:

| App | Container | Database | Schema |
|-----|-----------|----------|--------|
| Oracles | `app-oracles-postgres` | `anchor_oracles` | 0020 |
| Predictions | `app-predictions-postgres` | `anchor_lottery` | 0021 |

## How Migrations Are Applied

### Core Database
Migrations are mounted as volumes and executed by PostgreSQL on first boot:

```yaml
volumes:
  - ./infra/postgres/init.sql:/docker-entrypoint-initdb.d/01-init.sql
  - ./infra/postgres/migrations:/docker-entrypoint-initdb.d/migrations
```

### Dashboard
The dashboard backend applies its migrations at runtime using SQLx:

```rust
sqlx::query(include_str!("../migrations/001_system_settings.sql"))
    .execute(&pool)
    .await?;
```

### App Databases
App-specific databases use individual migration files:

```yaml
# Oracles
volumes:
  - ./infra/postgres/migrations/0020_oracles_schema.sql:/docker-entrypoint-initdb.d/01-init.sql

# Predictions  
volumes:
  - ./infra/postgres/migrations/0021_predictions_schema.sql:/docker-entrypoint-initdb.d/01-init.sql
```

## Adding New Migrations

1. Choose the appropriate range for your domain
2. Create a new file with the next number: `NNNN_descriptive_name.sql`
3. Use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`
4. Update this README with the new migration
5. Test with a fresh database: `docker compose down -v && docker compose up -d core-postgres`

## Fresh Install

To reset all databases and apply migrations from scratch:

```bash
# Stop all containers and remove volumes
docker compose down -v

# Start PostgreSQL (migrations will run automatically)
docker compose up -d core-postgres

# Check logs
docker compose logs -f core-postgres
```

