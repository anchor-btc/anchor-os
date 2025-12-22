# Anchor Places

A Bitcoin-powered map markers application using the Anchor Protocol. Pin messages on a world map, stored forever on the Bitcoin blockchain.

## Features

- **Pin Messages on Bitcoin**: Create geo-located markers that are permanently stored on the blockchain
- **Coordinate Ownership**: First marker at any coordinate "owns" that location
- **Categories**: Organize markers by type (General, Tourism, Commerce, Event, Warning, Historic)
- **Replies**: Comment on markers using Anchor Protocol threading
- **My Places**: View all markers you've created
- **Search**: Full-text search across all marker messages
- **Real-time**: Markers appear on the map as soon as they're confirmed

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│    Backend      │────▶│   PostgreSQL    │
│   (Next.js +    │     │  (Rust/Axum)    │     │                 │
│    Leaflet)     │     │                 │     └─────────────────┘
└─────────────────┘     └────────┬────────┘
                                │
                                ▼
                       ┌─────────────────┐     ┌─────────────────┐
                       │    Indexer      │────▶│  Bitcoin Node   │
                       │                 │     │                 │
                       └─────────────────┘     └─────────────────┘
```

## Anchor Protocol Schema

Markers use `AnchorKind::Custom(5)` (GeoMarker) with the following binary payload:

| Field | Type | Size | Description |
|-------|------|------|-------------|
| category | u8 | 1 byte | Category ID (0-5) |
| latitude | f32 | 4 bytes | Latitude (float32) |
| longitude | f32 | 4 bytes | Longitude (float32) |
| message_len | u8 | 1 byte | Message length |
| message | utf8 | variable | Message content |

**Total overhead**: 10 bytes + message (fits in OP_RETURN for messages up to 64 chars)

## Ownership Rule

The first marker at any exact coordinate "owns" that location:

1. **First Pin Wins**: When you create the first marker at a specific lat/long, you own that spot
2. **Automatic Replies**: If someone creates a new marker at coordinates where one already exists, it becomes a reply to the original marker
3. **Exact Matching**: Coordinates must match exactly (same float32 values)

## Categories

| ID | Name | Icon | Color |
|----|------|------|-------|
| 0 | General | map-pin | #FF6B35 |
| 1 | Tourism | camera | #3B82F6 |
| 2 | Commerce | shopping-bag | #10B981 |
| 3 | Event | calendar | #8B5CF6 |
| 4 | Warning | alert-triangle | #EF4444 |
| 5 | Historic | landmark | #F59E0B |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for frontend development)
- Rust 1.75+ (for backend development)

### Running with Docker

```bash
# From the root anchor directory
docker compose up app-places-backend app-places-frontend
```

This will start:
- Anchor Places Backend on port 3301
- Anchor Places Frontend on port 3300

### Development

#### Backend

```bash
cd apps/anchor-places/backend
cargo run
```

#### Frontend

```bash
cd apps/anchor-places/frontend
npm install
npm run dev
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/stats` | Map statistics |
| GET | `/categories` | List categories |
| GET | `/markers` | List recent markers |
| GET | `/markers/bounds` | Get markers in viewport |
| GET | `/markers/search` | Search markers by message |
| GET | `/markers/my` | Get markers by creator address |
| GET | `/markers/:txid/:vout` | Get marker with replies |
| POST | `/markers` | Create new marker |
| POST | `/markers/:txid/:vout/reply` | Reply to marker |

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | postgres://...localhost:5432/anchor | PostgreSQL connection |
| BITCOIN_RPC_URL | http://127.0.0.1:18443 | Bitcoin Core RPC |
| BITCOIN_RPC_USER | user | RPC username |
| BITCOIN_RPC_PASSWORD | pass | RPC password |
| WALLET_URL | http://localhost:3001 | Anchor Wallet API |
| HOST | 0.0.0.0 | Server bind address |
| PORT | 3301 | Server port |
| POLL_INTERVAL_SECS | 5 | Indexer poll interval |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| NEXT_PUBLIC_API_URL | http://localhost:3301 | Backend API URL |
| NEXT_PUBLIC_WALLET_URL | http://localhost:3001 | Wallet API URL |
| NEXT_PUBLIC_BLOCK_EXPLORER_URL | http://localhost:4000 | Block explorer URL |

## License

MIT License - See LICENSE file for details.
