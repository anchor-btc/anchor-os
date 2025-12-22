# ANCHOR Protocol

A minimalist metaprotocol for recording chained messages on the Bitcoin blockchain.

## Overview

ANCHOR enables embedding messages in Bitcoin transactions that can reference previous messages through compact 64-bit anchors. This creates a graph of related messages that can be used for:

- Threaded conversations (forum/social network style)
- Version history
- Governance and voting flows
- State protocols and games
- Other coordination schemes on Bitcoin

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Docker Compose                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐             │
│  │ Bitcoin Core │  │  PostgreSQL  │  │    Next.js Web     │             │
│  │   (regtest)  │  │              │  │    (Explorer)      │             │
│  └──────────────┘  └──────────────┘  └────────────────────┘             │
│         │                 │                     │                       │
│         │     ┌───────────┼─────────────────────┤                       │
│         ▼     ▼           ▼                     ▼                       │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐             │
│  │   Indexer    │  │    Wallet    │  │   Explorer API     │             │
│  │   (Rust)     │  │    (Rust)    │  │      (Rust)        │             │
│  └──────────────┘  └──────────────┘  └────────────────────┘             │
│         │                 │                                             │
│         │                 ├─────────────────────────────────┐           │
│         │                 │                                 │           │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌────────────────────┐ │           │
│  │   Testnet    │  │   PixelMap   │  │   PixelMap Web     │ │           │
│  │   (Rust)     │  │   Backend    │  │    (Next.js)       │ │           │
│  └──────────────┘  └──────────────┘  └────────────────────┘ │           │
│                                                              │           │
│  Apps use shared Bitcoin, PostgreSQL, and Wallet services ──┘           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
anchor/
├── docker-compose.yml          # Orchestrates all services
├── docker/
│   ├── bitcoin/                # Bitcoin Core regtest setup
│   └── postgres/               # Database schema & migrations
│
├── libs/                       # 📦 PUBLIC SDKs (for third-party developers)
│   ├── rust/
│   │   ├── anchor-core/        # Core library (types, parsing, carriers)
│   │   ├── anchor-specs/       # Protocol specs for all message kinds
│   │   └── anchor-wallet-lib/  # Rust Wallet SDK
│   └── js/
│       └── anchor-sdk/         # TypeScript SDK (Node.js + Browser)
│
├── internal/                   # 🔒 INTERNAL SERVICES (not for external use)
│   ├── anchor-indexer/         # Blockchain indexer
│   ├── anchor-wallet/          # Transaction creation API
│   └── anchor-testnet/         # Test transaction generator
│
├── admin/                      # 🛠️ ADMIN TOOLS (node operators)
│   ├── dashboard/              # Node management dashboard
│   │   ├── backend/
│   │   └── frontend/
│   └── backup/                 # Backup service
│       └── backend/
│
├── sites/                      # 🌐 PUBLIC WEBSITES
│   ├── docs/                   # Protocol documentation (VitePress)
│   ├── landing-protocol/       # anchorprotocol.com
│   └── landing-os/             # anchoros.com
│
├── apps/                       # ANCHOR Protocol applications
│   ├── anchor-threads/         # Threaded conversations
│   ├── anchor-canvas/          # Collaborative pixel canvas
│   ├── anchor-places/          # Geographic markers
│   ├── anchor-domains/         # DNS on Bitcoin
│   ├── anchor-proofs/          # Proof of existence
│   ├── anchor-tokens/          # Token operations
│   ├── anchor-oracles/         # Oracle attestations
│   └── anchor-predictions/     # Prediction markets
│
└── Cargo.toml                  # Rust workspace
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Rust 1.87+ (for local development)
- Node.js 20+ (for frontend development)

### Running with Docker

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| Bitcoin RPC | 18443 | Bitcoin Core regtest node |
| PostgreSQL | 5432 | Database |
| Wallet API | 3001 | Transaction creation (multi-carrier) |
| Explorer API | 3002 | Data querying |
| Explorer Web | 3000 | Web interface |
| Testnet | - | Auto-generates ANCHOR transactions |
| **PixelMap Backend** | 3004 | Pixel canvas API & indexer |
| **PixelMap Web** | 3005 | Collaborative canvas interface |

### Testnet Generator

The testnet service automatically creates ANCHOR transactions on regtest to test the full stack:

- Creates root messages (new threads)
- Creates replies to existing messages (60% probability)
- Mines blocks to confirm transactions
- Runs in a continuous loop with random delays (5-15 seconds)

This allows you to see the indexer and explorer working with real data.

#### Testnet Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `WALLET_URL` | `http://wallet:3001` | Wallet service URL |
| `MIN_INTERVAL_SECS` | `5` | Minimum delay between messages |
| `MAX_INTERVAL_SECS` | `15` | Maximum delay between messages |
| `BLOCKS_PER_CYCLE` | `1` | Blocks to mine after each message |
| `INITIAL_BLOCKS` | `101` | Initial blocks to mine for funding |

#### Watching Testnet Activity

```bash
# Watch testnet logs
docker compose logs -f testnet

# Check indexed messages
curl http://localhost:3002/stats | jq .

# View threads in explorer
open http://localhost:3000
```

Sample testnet output:
```
🚀 Starting ANCHOR Testnet Generator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Wallet URL: http://wallet:3001
⏱️  Interval: 5s - 15s
⛏️  Blocks per cycle: 1
✅ Wallet service is ready
⛏️  Mining 101 initial blocks for funding...
✅ Mined 101 blocks
💰 Wallet balance: 50 BTC
🔄 Starting transaction generation loop...
━━━ Cycle 1 ━━━
📨 Created root message: 5772945f3533fb39:0
⛏️  Mined 1 block(s)
━━━ Cycle 2 ━━━
📨 Created reply message: e40f83ea06adb1a2:0
   ↳ Reply to: 5772945f3533fb39:0
```

## ANCHOR Protocol v1

### Message Format

Each ANCHOR message has the following structure:

```
┌─────────────┬──────────┬──────────────────┬────────────────┬─────────────┐
│ Magic (4B)  │ Kind (1B)│ Anchor Count (1B)│ Anchors (9B×N) │ Body (var)  │
└─────────────┴──────────┴──────────────────┴────────────────┴─────────────┘
```

- **Magic**: `0xA11C0001` (ANCHOR v1)
- **Kind**: Message type (0=generic, 1=text, 2-255=reserved)
- **Anchor Count**: Number of parent references (0-255)
- **Anchors**: Each anchor is 9 bytes (8-byte txid prefix + 1-byte vout)
- **Body**: Arbitrary message content

### Multi-Carrier Support

ANCHOR messages can be embedded using different Bitcoin transaction structures (carriers):

| Carrier | Max Size | Prunable | UTXO Impact | Fee Discount | Status |
|---------|----------|----------|-------------|--------------|--------|
| **OP_RETURN** | 80 bytes | Yes | No | None | Active (default) |
| **Witness Data** | ~520 KB | Yes | No | **75%** | Active |
| **Inscription** | **~3.9 MB** | Yes | No | 75% | Active |
| **Stamps** | ~8 KB | **No** | **Yes** | None | Active |
| **Taproot Annex** | 10 KB | Yes | No | 75% | Reserved |

The Inscription carrier can hold almost an entire Bitcoin block (~4MB with witness discount), enabling massive data payloads like images or large datasets.

#### Carrier Selection

The SDK automatically selects the best carrier based on:
- Payload size
- Permanence requirements
- Fee preferences

```rust
use anchor_core::carrier::{CarrierSelector, CarrierPreferences};

let selector = CarrierSelector::new();

// For permanent storage (Stamps)
let prefs = CarrierPreferences::permanent();

// For large data (Inscription/Witness)
let prefs = CarrierPreferences::large_data();

// Auto-select based on message
let (carrier_type, output) = selector.encode(&message, &prefs)?;
```

### Anchor Resolution

Anchors use a 64-bit prefix of the parent's txid, providing:
- Compact references (9 bytes vs 33 bytes)
- Extremely low collision probability (~1 in 37 million at 1M messages)
- Graceful degradation (collisions are local, not catastrophic)

## API Endpoints

### Explorer API (port 3002)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/stats` | GET | Protocol statistics |
| `/messages` | GET | List all messages (paginated) |
| `/messages/:txid/:vout` | GET | Get specific message |
| `/roots` | GET | List thread roots (paginated) |
| `/threads/:txid/:vout` | GET | Get full thread |
| `/replies/:txid/:vout` | GET | Get replies to a message |

### Wallet API (port 3001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/wallet/balance` | GET | Get wallet balance |
| `/wallet/address` | GET | Get new receiving address |
| `/wallet/utxos` | GET | List unspent outputs |
| `/wallet/create-message` | POST | Create ANCHOR transaction |
| `/wallet/broadcast` | POST | Broadcast raw transaction |
| `/wallet/mine` | POST | Mine blocks (regtest only) |

#### Create Message Parameters

```json
{
  "kind": 1,                    // Message kind (1=text, 2=state, etc.)
  "body": "Hello, ANCHOR!",     // Message body (string or hex)
  "body_is_hex": false,         // Is body hex-encoded?
  "anchors": [],                // Optional parent references
  "carrier": 0,                 // Carrier type (0=OP_RETURN, 1=Inscription, 4=WitnessData)
  "fee_rate": 1                 // Fee rate in sat/vB (default: 1)
}
```

## SDKs

See the [libs/](libs/) directory for full SDK documentation.

### TypeScript SDK (`@AnchorProtocol/sdk`)

Works in Node.js and browsers.

```bash
npm install @AnchorProtocol/sdk
```

```typescript
import { AnchorWallet, WalletConfig } from "@AnchorProtocol/sdk";

// Connect to Bitcoin Core (Node.js)
const wallet = new AnchorWallet(
  WalletConfig.regtest("http://localhost:18443", "user", "pass")
);

// Create a message
const result = await wallet.createRootMessage("Hello, ANCHOR!");
console.log("Created:", result.txid);

// Reply to a message
await wallet.createReply("This is a reply!", result.txid, 0);
```

Browser-only (encoding/parsing):

```typescript
import { encodeTextMessage, parseAnchorPayload } from "@AnchorProtocol/sdk/browser";

const payload = encodeTextMessage("Hello!");
const message = parseAnchorPayload(payload);
```

### Rust SDK (`anchor-wallet-lib`)

The `anchor-wallet-lib` crate provides a Rust SDK for building ANCHOR protocol wallets.

### Installation

```toml
[dependencies]
anchor-wallet-lib = { path = "libs/rust/anchor-wallet-lib" }
# Or when published:
# anchor-wallet-lib = "0.1"
```

### Quick Start

```rust
use anchor_wallet_lib::{AnchorWallet, WalletConfig};

// Connect to Bitcoin Core
let config = WalletConfig::regtest("http://127.0.0.1:18443", "user", "pass");
let wallet = AnchorWallet::new(config)?;

// Create a root message (new thread)
let txid = wallet.create_root_message("Hello, ANCHOR!")?;
println!("Created: {}", txid);

// Reply to a message
let reply_txid = wallet.create_reply("This is a reply!", &parent_txid, 0)?;

// Check balance
let balance = wallet.get_balance()?;
println!("Balance: {} sats", balance.total);

// List UTXOs
let utxos = wallet.list_utxos()?;

// Mine blocks (regtest)
wallet.mine_blocks(1)?;
```

### Custom Transaction Building

For hardware wallets or custom signing flows:

```rust
use anchor_wallet_lib::{TransactionBuilder, AnchorKind};

let builder = TransactionBuilder::new()
    .kind(AnchorKind::Text)
    .body_text("Custom message")
    .anchor(parent_txid, 0)
    .input(utxo_txid, 0, 50000)
    .change_script(change_script)
    .fee_rate(2.0);

let anchor_tx = builder.build()?;
let hex = anchor_tx.to_hex();
// Sign externally, then broadcast
```

### Network Configuration

```rust
// Mainnet
let config = WalletConfig::mainnet("http://127.0.0.1:8332", "user", "pass");

// Testnet
let config = WalletConfig::testnet("http://127.0.0.1:18332", "user", "pass");

// Signet
let config = WalletConfig::signet("http://127.0.0.1:38332", "user", "pass");

// Regtest
let config = WalletConfig::regtest("http://127.0.0.1:18443", "user", "pass")
    .with_wallet("mywallet")
    .with_fee_rate(1.0);
```

## Applications

All apps are in the [apps/](apps/) directory. Each app has its own backend (Rust) and frontend (Next.js).

| App | Port | Description |
|-----|------|-------------|
| **Anchor Threads** | 3010-3011 | Threaded conversations (forum-style) |
| **Anchor Canvas** | 3020-3021 | Collaborative pixel canvas (Reddit Place) |
| **Anchor Places** | 3030-3031 | Geographic markers on Bitcoin |
| **Anchor Domains** | 3040-3041 | DNS on Bitcoin (.btc, .satoshi, etc.) |
| **Anchor Proofs** | 3050-3051 | Proof of existence (document timestamping) |
| **Anchor Tokens** | 3060-3061 | Token operations |
| **Anchor Oracles** | 3070-3071 | Oracle attestations |
| **Anchor Predictions** | 3080-3081 | Prediction markets |

### Anchor Canvas - Collaborative Bitcoin Canvas

A collaborative pixel art canvas built on the Anchor protocol. Think Reddit Place, but permanent and decentralized on Bitcoin.

#### Features

- **21 Million Pixels**: 4580 x 4580 canvas (Bitcoin's magic number)
- **Multi-Carrier Support**: 
  - OP_RETURN: ~10 pixels
  - Witness Data: ~74K pixels (75% fee discount)
  - Inscription: **~557K pixels** (almost a full block!)
- **Image Import**: Upload images and convert to pixels with preview
- **Interactive Positioning**: Drag imported images before painting
- **Dynamic Fees**: Adjustable fee rate (1-100+ sat/vB)

#### Quick Start

```bash
# All apps are included in docker-compose
docker compose up -d

# Open Anchor Canvas
open http://localhost:3021
```

See [apps/anchor-canvas/README.md](apps/anchor-canvas/README.md) for detailed documentation.

---

## Development

### Local Rust Development

```bash
# Build all crates
cargo build

# Run tests
cargo test

# Run indexer locally
cargo run -p anchor-indexer

# Run wallet API locally
cargo run -p anchor-wallet

# Run testnet generator locally
cargo run -p anchor-testnet

# Test SDK libraries
cargo test -p anchor-core
cargo test -p anchor-specs
cargo test -p anchor-wallet-lib
```

### Dashboard Development

```bash
cd admin/dashboard/frontend
npm install
npm run dev
```

### Documentation Development

```bash
cd sites/docs
npm install
npm run dev
```

### App Development

```bash
# Backend (Rust) - example with anchor-canvas
cd apps/anchor-canvas/backend
cargo run

# Frontend (Next.js)
cd apps/anchor-canvas/frontend
npm install
npm run dev
```

### Docker Development

```bash
# Build specific service
docker compose build app-canvas-frontend

# Rebuild and restart
docker compose up -d app-canvas-frontend --force-recreate

# View logs
docker compose logs -f app-canvas-backend app-canvas-frontend
```

## License

MIT

