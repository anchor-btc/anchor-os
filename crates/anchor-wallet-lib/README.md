# anchor-wallet-lib

A Rust library for building ANCHOR protocol wallets.

## Overview

This crate provides all the tools needed to create wallets that can interact with the ANCHOR protocol on Bitcoin:

- Create ANCHOR messages (root messages and replies)
- Build Bitcoin transactions with ANCHOR payloads
- Sign and broadcast transactions via Bitcoin Core RPC
- Parse and validate ANCHOR messages

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
anchor-wallet-lib = "0.1"
```

## Quick Start

### Connect to Bitcoin Core

```rust
use anchor_wallet_lib::{AnchorWallet, WalletConfig};

// For regtest
let config = WalletConfig::regtest("http://127.0.0.1:18443", "user", "pass");

// For mainnet
let config = WalletConfig::mainnet("http://127.0.0.1:8332", "user", "pass");

// For testnet
let config = WalletConfig::testnet("http://127.0.0.1:18332", "user", "pass");

// Connect
let wallet = AnchorWallet::new(config)?;
```

### Create a Root Message

```rust
// Create a new thread/root message
let txid = wallet.create_root_message("Hello, ANCHOR!")?;
println!("Created message: {}", txid);
```

### Reply to a Message

```rust
// Reply to an existing message
let reply_txid = wallet.create_reply(
    "This is a reply!",
    &parent_txid,
    0, // vout
)?;
```

### Check Balance

```rust
let balance = wallet.get_balance()?;
println!("Confirmed: {} sats", balance.confirmed);
println!("Unconfirmed: {} sats", balance.unconfirmed);
println!("Total: {} sats", balance.total);
```

### List UTXOs

```rust
let utxos = wallet.list_utxos()?;
for utxo in utxos {
    println!("{} - {} sats", utxo.txid, utxo.amount);
}
```

### Custom Transaction Building

For advanced use cases (hardware wallets, custom signing):

```rust
use anchor_wallet_lib::{TransactionBuilder, AnchorKind};

let builder = TransactionBuilder::new()
    .kind(AnchorKind::Text)
    .body_text("Custom message")
    .anchor(parent_txid, 0)  // Add parent reference
    .input(utxo_txid, 0, 50000)  // Add UTXO
    .change_script(change_script)
    .fee_rate(2.0);

let anchor_tx = builder.build()?;

// Get unsigned transaction hex
let hex = anchor_tx.to_hex();

// Sign externally, then broadcast
wallet.broadcast(&signed_hex)?;
```

### Mine Blocks (Regtest)

```rust
// Mine 10 blocks
let hashes = wallet.mine_blocks(10)?;
```

## Configuration Options

```rust
let config = WalletConfig::new("http://127.0.0.1:18443", "user", "pass")
    .with_wallet("mywallet")     // Multi-wallet support
    .with_fee_rate(2.0)          // sat/vB
    .with_min_confirmations(1);  // Min confs for UTXOs
```

## Features

- `async` - Enable async/await support with Tokio

## Protocol Details

ANCHOR messages are embedded in OP_RETURN outputs with the following structure:

```
┌─────────────┬──────────┬──────────────────┬────────────────┬─────────────┐
│ Magic (4B)  │ Kind (1B)│ Anchor Count (1B)│ Anchors (9B×N) │ Body (var)  │
└─────────────┴──────────┴──────────────────┴────────────────┴─────────────┘
```

- **Magic**: `0xA11C0001` (ANCHOR v1)
- **Kind**: Message type (0=generic, 1=text)
- **Anchor Count**: Number of parent references (0-255)
- **Anchors**: Each 9 bytes (8-byte txid prefix + 1-byte vout)
- **Body**: Message content

## Error Handling

The library uses a custom `WalletError` type:

```rust
use anchor_wallet_lib::{Result, WalletError};

match wallet.create_root_message("test") {
    Ok(txid) => println!("Success: {}", txid),
    Err(WalletError::InsufficientFunds { needed, available }) => {
        println!("Need {} sats, have {} sats", needed, available);
    }
    Err(WalletError::NoUtxos) => {
        println!("No UTXOs available");
    }
    Err(e) => println!("Error: {}", e),
}
```

## License

MIT

