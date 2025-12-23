# Anchor Canvas

A collaborative pixel canvas on Bitcoin using the Anchor protocol. Similar to Reddit Place, but permanent and decentralized on the Bitcoin blockchain.

## Overview

Anchor Canvas allows users to paint pixels on a shared canvas by creating Bitcoin transactions. Each pixel is permanently recorded on the blockchain, creating a collaborative artwork that lives forever.

| Property | Value |
|----------|-------|
| **Canvas Size** | 4580 x 4580 (~21 million pixels) |
| **Protocol Kind** | [State (Kind 2)](/kinds/state) |
| **Carriers** | OP_RETURN, Witness Data, Inscription |

## Features

- **Paint Tool** - Select and paint individual pixels with any color
- **Brush Tool** - Adjustable brush size (1-21 pixels)
- **Image Import** - Upload and convert images to pixels
- **Smart Carrier Selection** - Auto-selects best carrier based on pixel count
- **Pending Pixels** - Visual feedback while waiting for confirmation
- **Pixel History** - View the history of changes for any pixel

## Quick Start

### Run with Docker Compose

```bash
# From the anchor root directory
docker compose --profile app-canvas up -d

# View logs
docker compose logs -f app-canvas-backend app-canvas-frontend
```

| Service | Port | Description |
|---------|------|-------------|
| Canvas Frontend | 3200 | Web interface |
| Canvas Backend | 3201 | REST API & Indexer |

**Access Anchor Canvas:** `http://localhost:3200`

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────┐
│  Frontend (Next.js) │────▶│  Backend (Rust)     │────▶│  PostgreSQL │
│     Port 3200       │     │     Port 3201       │     │             │
└─────────────────────┘     └──────────┬──────────┘     └─────────────┘
                                       │
                                       ▼
                            ┌─────────────────────┐
                            │    Bitcoin Core     │
                            │      (Indexer)      │
                            └─────────────────────┘
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/stats` | GET | Canvas statistics |
| `/canvas` | GET | Full canvas binary data |
| `/canvas/preview` | GET | Canvas preview PNG |
| `/canvas/region` | GET | Region PNG (?x,y,w,h) |
| `/canvas/tile/{z}/{x}/{y}` | GET | Map tile PNG |
| `/pixel/{x}/{y}` | GET | Pixel info & history |
| `/recent` | GET | Recent pixel changes |

## Protocol

Anchor Canvas uses **State messages (Kind 2)** from the Anchor protocol.

### Pixel Format

Each pixel is encoded in 7 bytes:

| Field | Size | Type | Description |
|-------|------|------|-------------|
| X | 2 bytes | u16 BE | X coordinate (0-4579) |
| Y | 2 bytes | u16 BE | Y coordinate (0-4579) |
| R | 1 byte | u8 | Red (0-255) |
| G | 1 byte | u8 | Green (0-255) |
| B | 1 byte | u8 | Blue (0-255) |

### Payload Format

```
[num_pixels: u32 BE][pixel_0][pixel_1]...[pixel_n]
```

### Example

Red pixel at coordinates (100, 200):

```
00000001 0064 00C8 FF 00 00
│        │    │    │  │  └── B: 0
│        │    │    │  └───── G: 0
│        │    │    └──────── R: 255
│        │    └───────────── Y: 200
│        └────────────────── X: 100
└─────────────────────────── Count: 1
```

For complete protocol details, see [State Kind (Kind 2)](/kinds/state).

## Development

### Backend (Rust)

```bash
cd apps/anchor-canvas/backend
cargo build
cargo run
```

### Frontend (Next.js)

```bash
cd apps/anchor-canvas/frontend
npm install
npm run dev
```

## See Also

- [State Kind (Kind 2)](/kinds/state) - Protocol specification
- [Carriers](/concepts/carriers) - OP_RETURN, Witness Data, Inscription
- [SDK API Reference](/sdk/api-reference) - SDK implementation details

