# Anchor Places

Anchor Places is a Bitcoin-powered location markers application. Users can pin locations on a world map with messages, and the first marker at any coordinate "owns" that location.

## Overview

- **Protocol Kind**: GeoMarker (Kind 5)
- **Carriers**: OP_RETURN, Inscription, WitnessData
- **Frontend**: Next.js with Leaflet maps
- **Backend**: Rust (Axum) with PostgreSQL
- **Spec Crate**: `anchor-specs` (GeoMarkerSpec)

## Features

- **Create Markers**: Pin any location on the world map with a message
- **Categories**: Organize markers by type (General, Tourism, Commerce, Event, Warning, Historic)
- **Replies**: Comment on existing markers
- **Search**: Full-text search across all markers
- **Geospatial Queries**: Load markers within viewport bounds
- **My Places**: View all markers you've created across all your wallet addresses
- **Creator Tracking**: Each marker tracks which address created it

## Ownership Rule

The first marker created at any exact coordinate "owns" that location:

1. **First Pin Wins**: When you create the first marker at a specific lat/long, you own that spot
2. **Automatic Replies**: If someone creates a new marker at coordinates where one already exists, it becomes a reply to the original marker
3. **Exact Matching**: Coordinates must match exactly (same float32 values)

```
┌─────────────────────────────────────────────────────────────────┐
│                    New GeoMarker Transaction                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │  Check if marker exists │
                 │  at exact coordinates   │
                 └────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
     ┌─────────────────┐            ┌─────────────────┐
     │  No existing    │            │  Marker exists  │
     │  marker         │            │  at location    │
     └─────────────────┘            └─────────────────┘
              │                               │
              ▼                               ▼
     ┌─────────────────┐            ┌─────────────────┐
     │  Create new     │            │  Create as      │
     │  marker         │            │  reply to first │
     └─────────────────┘            └─────────────────┘
```

## Categories

| ID | Category | Description |
|----|----------|-------------|
| 0 | General | Generic location marker |
| 1 | Tourism | Tourist attractions and points of interest |
| 2 | Commerce | Businesses and merchants |
| 3 | Event | Events and gatherings |
| 4 | Warning | Hazard or caution areas |
| 5 | Historic | Historical landmarks |
| 6-255 | Custom | Application-defined |

## API Endpoints

### Query Markers

```bash
# Get markers in viewport
GET /markers/bounds?lat_min=40&lat_max=41&lng_min=-74&lng_max=-73

# Search markers
GET /markers/search?q=bitcoin+coffee

# Get marker with replies
GET /markers/{txid}/{vout}

# Get recent markers
GET /markers?per_page=100
```

### My Places

```bash
# Get markers created by a specific address
GET /markers/my?address=bcrt1q...&category=0&limit=100
```

### Create Markers

```bash
# Create a new marker
POST /markers
{
  "category": 1,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "message": "Great coffee shop, accepts Bitcoin!",
  "carrier": 0
}

# Reply to a marker
POST /markers/{txid}/{vout}/reply
{
  "message": "Best espresso in NYC!"
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                       │
│                     Leaflet.js Map Interface                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Rust/Axum)                        │
├─────────────────────────────────────────────────────────────────┤
│  handlers/     │  db/          │  services/    │  indexer.rs   │
│  - markers     │  - markers    │  - wallet     │  - block scan │
│  - categories  │  - replies    │    client     │  - ownership  │
│  - system      │  - categories │               │    rule       │
│  - my-places   │  - creator    │               │  - creator    │
│                │    address    │               │    tracking   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌───────────┐   ┌───────────┐   ┌───────────┐
       │ PostgreSQL│   │  Bitcoin  │   │  Anchor   │
       │           │   │   Core    │   │  Wallet   │
       └───────────┘   └───────────┘   └───────────┘
```

## Integration with anchor-specs

The backend uses `anchor-specs` for all GeoMarker operations:

```rust
use anchor_specs::geomarker::GeoMarkerSpec;
use anchor_specs::KindSpec;

// Create and validate a marker
let spec = GeoMarkerSpec::new(category, latitude, longitude, message);
spec.validate()?;

// Encode for transmission
let payload = spec.to_bytes();

// Parse from blockchain
let spec = GeoMarkerSpec::from_bytes(&body)?;
```

This ensures consistent validation and encoding across all Anchor applications.

## Technical Details

### Payload Format

See [GeoMarker Kind Documentation](/kinds/geomarker) for the complete payload specification.

### Coordinate Precision

Using float32 provides approximately 7 significant digits, which translates to:

| Precision | Accuracy |
|-----------|----------|
| 0.00001° | ~1.1 meters |
| 0.0001° | ~11 meters |
| 0.001° | ~111 meters |

This precision is sufficient for pinpointing specific locations on a map.

### Database Schema

```sql
-- Markers table
CREATE TABLE markers (
    id SERIAL PRIMARY KEY,
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL,
    category_id SMALLINT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    message TEXT NOT NULL,
    creator_address TEXT,        -- Tracks who created the marker
    block_hash BYTEA,
    block_height INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (txid, vout)
);

-- Replies table
CREATE TABLE marker_replies (
    id SERIAL PRIMARY KEY,
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL,
    parent_txid BYTEA NOT NULL,
    parent_vout INTEGER NOT NULL,
    message TEXT NOT NULL,
    block_hash BYTEA,
    block_height INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (txid, vout)
);

-- Index for coordinate lookup (ownership rule)
CREATE INDEX idx_markers_coordinates ON markers (latitude, longitude);

-- Index for creator address (My Places feature)
CREATE INDEX idx_markers_creator_address ON markers (creator_address);
```

### Creator Address Extraction

The indexer extracts the creator address from the transaction:

1. **From change output**: If the transaction has a non-OP_RETURN output, use that address
2. **From input witness**: For OP_RETURN-only transactions, derive the P2WPKH address from the input's public key

## Running Locally

```bash
# Start all services
docker compose --profile app-places up -d

# Or start individually
docker compose up -d app-places-backend app-places-frontend

# Access the application
open http://localhost:3300
```

## Ports

| Service | Port |
|---------|------|
| Frontend | 3300 |
| Backend API | 3301 |

## See Also

- [GeoMarker Kind (Kind 5)](/kinds/geomarker) - Payload specification
- [Anchor Canvas](/apps/canvas) - Collaborative pixel canvas
- [Carrier Types](/protocol/carriers) - Data embedding options
