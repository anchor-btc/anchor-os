# SDK

Build applications on the Anchor Protocol using TypeScript or Rust.

## Installation

::: code-group

```bash [npm]
npm install @AnchorProtocol/sdk
```

```bash [pnpm]
pnpm add @AnchorProtocol/sdk
```

```bash [Cargo.toml]
[dependencies]
anchor-core = "0.1"        # Parsing and encoding
anchor-wallet-lib = "0.1"  # Full wallet functionality
```

:::

## Quick Start

::: code-group

```typescript [TypeScript]
import { AnchorWallet } from '@AnchorProtocol/sdk'

const wallet = new AnchorWallet({
  rpcUrl: 'http://localhost:18443',
  rpcUser: 'bitcoin',
  rpcPassword: 'password',
  network: 'regtest'
})

// Create and broadcast a message
const result = await wallet.createRootMessage('Hello, Anchor!')
console.log('TX:', result.txid)
```

```rust [Rust]
use anchor_wallet_lib::{AnchorWallet, WalletConfig};

let wallet = AnchorWallet::new(
    WalletConfig::regtest("http://127.0.0.1:18443", "user", "pass")
)?;

// Create and broadcast a message
let txid = wallet.create_root_message("Hello, Anchor!")?;
println!("TX: {}", txid);
```

:::

## Available Packages

| Package | Language | Description |
|---------|----------|-------------|
| `@AnchorProtocol/sdk` | TypeScript | Full SDK for Node.js and browsers |
| `anchor-core` | Rust | Core types, parsing, and carriers |
| `anchor-wallet-lib` | Rust | Wallet integration with Bitcoin Core |

## SDK Modules

| Module | Description |
|--------|-------------|
| [Wallet](/sdk/wallet) | Create messages, broadcast, manage balance |
| [Encoding](/sdk/encoding) | Create payloads for all message kinds |
| [Parsing](/sdk/parsing) | Read and decode on-chain messages |
| [API Reference](/sdk/api-reference) | Complete API documentation |

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Message** | Binary data with magic bytes, kind, anchors, and body |
| **Kind** | Message type (0-255) that determines body interpretation |
| **Anchor** | Reference to a parent message (txid prefix + vout) |
| **Carrier** | How data is embedded (OP_RETURN, Witness, Inscription) |
