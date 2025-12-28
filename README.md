# ANCHOR Protocol

A Bitcoin-native metaprotocol for chained messages, enabling decentralized applications directly on the blockchain.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is ANCHOR?

ANCHOR enables embedding structured messages in Bitcoin transactions that reference previous messages through compact 64-bit anchors. This creates a directed acyclic graph (DAG) of related messages, powering applications like:

- **Social Networks** - Threaded conversations, forums
- **Domain Names** - Decentralized DNS (.btc, .satoshi)
- **Proof of Existence** - Document timestamping
- **Collaborative Canvas** - Permanent pixel art
- **Token Operations** - UTXO-based tokens
- **Prediction Markets** - Trustless oracles

## Quick Start

```bash
# Clone and start
git clone https://github.com/anchor-btc/anchor-os.git
cd anchor
docker compose up -d

# Access the dashboard
open http://localhost:8000
```

### Services Overview

| Service | URL | Description |
|---------|-----|-------------|
| Dashboard | [localhost:8000](http://localhost:8000) | Node management & monitoring |
| Docs | [localhost:3900](http://localhost:3900) | Protocol documentation |
| Threads | [localhost:3100](http://localhost:3100) | Social messaging app |
| Canvas | [localhost:3200](http://localhost:3200) | Collaborative pixel art |
| Places | [localhost:3300](http://localhost:3300) | Geographic markers |
| Domains | [localhost:3400](http://localhost:3400) | DNS on Bitcoin |
| Proofs | [localhost:3500](http://localhost:3500) | Proof of existence |
| Tokens | [localhost:3600](http://localhost:3600) | Token operations |
| Oracles | [localhost:3700](http://localhost:3700) | Oracle attestations |
| Predictions | [localhost:3800](http://localhost:3800) | Prediction markets |

## Architecture

```
anchor/
├── libs/                    # Public SDKs
│   ├── rust/                # Rust crates (crates.io)
│   │   ├── anchor-core      # Core types & parsing
│   │   ├── anchor-specs     # Protocol specifications
│   │   └── anchor-wallet-lib # Wallet SDK
│   └── js/                  # JavaScript packages (npm)
│       ├── anchor-sdk       # TypeScript SDK
│       └── anchor-ui        # React Design System
│
├── internal/                # Internal services
│   ├── anchor-indexer       # Blockchain indexer
│   ├── anchor-wallet        # Transaction API
│   └── anchor-testnet       # Test tx generator
│
├── apps/                    # Applications
│   ├── anchor-threads       # Social messaging
│   ├── anchor-canvas        # Pixel canvas
│   ├── anchor-places        # Geographic markers
│   ├── anchor-domains       # DNS system
│   ├── anchor-proofs        # Document proofs
│   ├── anchor-tokens        # Token ops
│   ├── anchor-oracles       # Oracle service
│   └── anchor-predictions   # Prediction markets
│
├── dashboard/               # Node management
│   ├── backend              # Rust API + Backup
│   └── frontend             # Next.js UI
│
├── sites/                   # Public websites
│   ├── docs                 # VitePress docs
│   ├── landing-protocol     # anchorprotocol.com
│   └── landing-os           # anchoros.com
│
└── infra/                   # Infrastructure
    ├── bitcoin-core         # Bitcoin node config
    ├── postgres             # Database migrations
    └── ...
```

## SDKs

### TypeScript

```bash
npm install @AnchorProtocol/sdk
```

```typescript
import { AnchorWallet, WalletConfig } from "@AnchorProtocol/sdk";

const wallet = new AnchorWallet(
  WalletConfig.regtest("http://localhost:18443", "user", "pass")
);

// Create a message
const { txid } = await wallet.createRootMessage("Hello, Bitcoin!");

// Reply to it
await wallet.createReply("This is a reply!", txid, 0);
```

### Rust

```toml
[dependencies]
anchor-core = "0.1"
anchor-specs = "0.1"
anchor-wallet-lib = "0.1"
```

```rust
use anchor_wallet_lib::{AnchorWallet, WalletConfig};

let wallet = AnchorWallet::new(
    WalletConfig::regtest("http://127.0.0.1:18443", "user", "pass")
)?;

let txid = wallet.create_root_message("Hello, Bitcoin!")?;
```

### React UI Components

```bash
npm install @AnchorProtocol/ui
```

```tsx
import { Button, Card, Input } from "@AnchorProtocol/ui";
import "@AnchorProtocol/ui/styles/globals.css";
import "@AnchorProtocol/ui/styles/themes/threads.css";
```

## Protocol

### Message Format

```
┌─────────────┬──────────┬──────────────────┬────────────────┬─────────────┐
│ Magic (4B)  │ Kind (1B)│ Anchor Count (1B)│ Anchors (9B×N) │ Payload     │
└─────────────┴──────────┴──────────────────┴────────────────┴─────────────┘
```

- **Magic**: `0xA11C0001` (ANCHOR v1)
- **Kind**: Message type (1=Text, 10=DNS, 11=Proof, 20=Token, etc.)
- **Anchors**: Parent references (8-byte txid prefix + 1-byte vout)
- **Payload**: Kind-specific data

### Carrier Types

| Carrier | Max Size | Fee Discount | Use Case |
|---------|----------|--------------|----------|
| OP_RETURN | 80 B | None | Short messages |
| Witness | ~520 KB | 75% | Large data |
| Inscription | ~3.9 MB | 75% | Images, files |
| Stamps | ~8 KB | None | Permanent storage |

### Message Kinds

| Kind | ID | Description |
|------|:--:|-------------|
| Text | 1 | UTF-8 messages |
| State | 2 | State updates (pixels) |
| GeoMarker | 5 | Geographic coordinates |
| DNS | 10 | Domain registration |
| Proof | 11 | Document timestamp |
| Token | 20 | Token operations |
| Oracle | 30+ | Oracle attestations |

## Development

### Prerequisites

- Docker & Docker Compose
- Rust 1.75+ (for backend development)
- Node.js 20+ (for frontend development)

### Monorepo Commands

```bash
# Install all dependencies (npm workspaces)
npm install

# Build UI library
npm run build:ui

# Build SDK
npm run build:sdk

# Build all
npm run build:all
```

### Docker Commands

```bash
# Start everything
docker compose up -d

# View logs
docker compose logs -f <service-name>

# Rebuild a service
docker compose build <service-name>
docker compose up -d <service-name>

# Reset environment
docker compose down -v
docker compose up -d
```

### Service Development

```bash
# Dashboard
cd dashboard/frontend && npm run dev

# Apps (example: threads)
cd apps/anchor-threads/frontend && npm run dev

# Rust services
cargo run -p anchor-indexer
cargo run -p anchor-wallet
cargo run -p anchor-testnet

# Run tests
cargo test --workspace
```

## API Reference

### Dashboard API (port 8010)

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /bitcoin/info` | Bitcoin node info |
| `GET /docker/containers` | Container status |
| `GET /notifications` | System notifications |
| `POST /backup/start` | Start backup |

### Wallet API (port 8001)

| Endpoint | Description |
|----------|-------------|
| `GET /wallet/balance` | Wallet balance |
| `GET /wallet/utxos` | List UTXOs |
| `POST /wallet/create-message` | Create ANCHOR tx |
| `POST /wallet/mine` | Mine blocks (regtest) |

Full API documentation: [localhost:8001/swagger-ui](http://localhost:8001/swagger-ui)

## Database

All migrations are centralized in `infra/postgres/migrations/`:

| Range | Domain |
|-------|--------|
| 0001-0009 | Core protocol |
| 0010-0019 | Dashboard |
| 0020-0029 | Apps |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## Links

- **Docs**: [docs.anchor-protocol.com](https://docs.anchor-protocol.com)
- **GitHub**: [github.com/anchor-btc/anchor-os](https://github.com/anchor-btc/anchor-os)
- **npm**: [@AnchorProtocol/sdk](https://npmjs.com/package/@AnchorProtocol/sdk)

## Community

- **Discord**: [discord.gg/mrzgrFt5](https://discord.gg/mrzgrFt5)
- **Telegram**: [t.me/+s7sBoBaI3XNmOTgx](https://t.me/+s7sBoBaI3XNmOTgx)
- **X / Twitter**: [x.com/AnchorProt26203](https://x.com/AnchorProt26203)
- **Nostr**: `npub1kyz74p2ngknz6euvdfh30z9ptvu5l3tg297zxj6up0xt8tuj4ccq43s7ey`

## License

MIT
