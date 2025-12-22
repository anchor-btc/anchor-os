# ANCHOR Protocol Libraries

Public libraries for integrating with the ANCHOR protocol on Bitcoin.

## Overview

This directory contains all public SDK libraries that third-party developers can use to build ANCHOR-enabled applications. These libraries are designed to be published to crates.io and npm for easy integration.

## Directory Structure

```
libs/
├── rust/
│   ├── anchor-core/        # Core types, parsing, carriers
│   ├── anchor-specs/       # Protocol specifications for all kinds
│   └── anchor-wallet-lib/  # Wallet library (Bitcoin Core RPC)
└── js/
    └── anchor-sdk/         # TypeScript SDK for Node.js and browsers
```

## Rust Libraries (crates.io)

| Crate | Description | README |
|-------|-------------|--------|
| [anchor-core](./rust/anchor-core) | Core types, parsing, and multi-carrier support | [📖](./rust/anchor-core/README.md) |
| [anchor-specs](./rust/anchor-specs) | Protocol specifications for all message kinds | [📖](./rust/anchor-specs/README.md) |
| [anchor-wallet-lib](./rust/anchor-wallet-lib) | Wallet library for building ANCHOR apps | [📖](./rust/anchor-wallet-lib/README.md) |

### Crate Descriptions

#### anchor-core

The foundation of the ANCHOR protocol. Provides:
- Binary encoding/decoding of ANCHOR messages
- Multi-carrier support (OP_RETURN, Inscriptions, Stamps, Taproot Annex)
- Message detection in Bitcoin transactions
- Constants and type definitions

#### anchor-specs

Protocol specifications for all message kinds. Provides:
- Type-safe payload structures (DNS, Proof, Token, GeoMarker, etc.)
- Built-in validation for domain names, coordinates, hashes
- Carrier recommendations per kind
- `KindSpec` trait for consistent API

#### anchor-wallet-lib

High-level wallet library. Provides:
- Bitcoin Core RPC integration
- PSBT transaction building
- Message creation (root and replies)
- Balance and UTXO management

### Installation

```toml
[dependencies]
# Pick what you need:
anchor-core = "0.1"        # Just parsing
anchor-specs = "0.1"       # Specs + validation
anchor-wallet-lib = "0.1"  # Full wallet functionality
```

### Quick Start

```rust
use anchor_wallet_lib::{AnchorWallet, WalletConfig};
use anchor_specs::dns::{DnsSpec, DnsRecord, DnsOperation};
use anchor_specs::KindSpec;

// Connect to Bitcoin Core
let wallet = AnchorWallet::new(
    WalletConfig::regtest("http://127.0.0.1:18443", "user", "pass")
)?;

// Register a domain
let spec = DnsSpec {
    operation: DnsOperation::Register,
    name: "example.btc".to_string(),
    records: vec![DnsRecord::a("93.184.216.34", 3600)?],
};
spec.validate()?;

// Create the transaction
let txid = wallet.create_message_with_spec(&spec)?;
println!("Domain registered: {}", txid);
```

## TypeScript Library (npm)

| Package | Description | README |
|---------|-------------|--------|
| [@AnchorProtocol/sdk](./js/anchor-sdk) | TypeScript SDK for Node.js and browsers | [📖](./js/anchor-sdk/README.md) |

### Features

- 📦 **Dual Package** - Works in Node.js and browsers
- 🔗 **Protocol Compliant** - Full ANCHOR v1 encoding/parsing
- 🔑 **Wallet Support** - Bitcoin Core RPC (Node.js only)
- 🏗️ **PSBT Builder** - Build transactions for external signing
- 📝 **TypeScript** - Full type definitions

### Installation

```bash
npm install @AnchorProtocol/sdk
```

### Quick Start

```typescript
import { AnchorWallet, WalletConfig } from "@AnchorProtocol/sdk";

// Connect to Bitcoin Core
const wallet = new AnchorWallet(
  WalletConfig.regtest("http://localhost:18443", "user", "pass")
);

// Create a message
const result = await wallet.createRootMessage("Hello, ANCHOR!");
console.log("Created:", result.txid);

// Check balance
const balance = await wallet.getBalance();
console.log("Balance:", balance.total, "sats");
```

### Browser-only Usage

```typescript
// For browser environments (no wallet)
import { encodeTextMessage, parseAnchorPayload } from "@AnchorProtocol/sdk/browser";

const payload = encodeTextMessage("Hello, ANCHOR!");
const message = parseAnchorPayload(payload);
```

## Dependency Graph

```
┌─────────────────────┐     ┌─────────────────────┐
│  anchor-wallet-lib  │     │    anchor-specs     │
└──────────┬──────────┘     └──────────┬──────────┘
           │                           │
           └───────────┬───────────────┘
                       │
                       ▼
              ┌────────────────┐
              │   anchor-core  │
              └────────────────┘
```

## Message Kinds Reference

| Kind | ID | Spec Module | Description |
|------|----|-------------|-------------|
| Generic | 0 | - | Raw binary data |
| Text | 1 | `text` | UTF-8 text messages |
| State | 2 | `state` | State updates (pixels) |
| Vote | 3 | - | Voting |
| Image | 4 | - | Image data |
| GeoMarker | 5 | `geomarker` | Geographic markers |
| DNS | 10 | `dns` | Domain name registration |
| Proof | 11 | `proof` | Proof of existence |
| Token | 20 | `token` | Token operations |
| Oracle | 30-33 | - | Oracle attestations |
| Lottery | 40-43 | - | Lottery operations |

## Carrier Types

| Carrier | Max Size | Best For |
|---------|----------|----------|
| OP_RETURN | ~100KB | Short messages, proofs |
| Inscription | ~400KB | Images, large data |
| Stamps | Unlimited | Permanent storage |
| Taproot Annex | ~400KB | Private data |
| Witness | ~400KB | Complex scripts |

## Contributing

See the main [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## Protocol Documentation

For full protocol documentation, see the [ANCHOR Protocol Docs](https://anchor-protocol.github.io/docs).

## License

MIT
