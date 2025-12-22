# anchor-core

Core library for the ANCHOR protocol on Bitcoin.

## Overview

This crate provides the foundational types and parsing logic for ANCHOR v1 - a minimalist metaprotocol for recording chained messages on Bitcoin.

## Features

- **Multi-carrier support** - Embed ANCHOR messages in OP_RETURN, Inscriptions, Stamps, Taproot Annex, or Witness Data
- **Message chaining** - Reference parent messages via compact 64-bit anchors
- **Extensible kinds** - Support for text, state updates, DNS, proofs, tokens, and more
- **Zero-copy parsing** - Efficient parsing directly from transaction data

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
anchor-core = "0.1"
```

## Quick Start

### Parse an ANCHOR message

```rust
use anchor_core::{parse_anchor_payload, AnchorKind};

let payload = [
    0xA1, 0x1C, 0x00, 0x01, // magic bytes
    0x01,                   // kind = Text
    0x00,                   // anchor_count = 0
    b'H', b'e', b'l', b'l', b'o', // body
];

let message = parse_anchor_payload(&payload).unwrap();
assert_eq!(message.kind, AnchorKind::Text);
assert_eq!(message.body, b"Hello");
```

### Encode an ANCHOR message

```rust
use anchor_core::{encode_anchor_payload, ParsedAnchorMessage, AnchorKind, Anchor};

let message = ParsedAnchorMessage {
    kind: AnchorKind::Text,
    anchors: vec![
        Anchor {
            txid_prefix: [0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0],
            vout: 0,
        },
    ],
    body: b"This is a reply".to_vec(),
};

let encoded = encode_anchor_payload(&message);
```

### Detect ANCHOR messages in transactions

```rust
use anchor_core::carrier::CarrierSelector;
use bitcoin::Transaction;

let selector = CarrierSelector::new();
let detections = selector.detect(&transaction);

for detection in detections {
    println!("Found {} message via {:?}", 
        detection.message.kind, 
        detection.carrier_type
    );
}
```

## Protocol Format

ANCHOR messages use a compact binary format:

```
┌─────────────┬──────────┬──────────────────┬────────────────┬─────────────┐
│ Magic (4B)  │ Kind (1B)│ Anchor Count (1B)│ Anchors (9B×N) │ Body (var)  │
└─────────────┴──────────┴──────────────────┴────────────────┴─────────────┘
```

| Field | Size | Description |
|-------|------|-------------|
| Magic | 4 bytes | `0xA11C0001` - ANCHOR v1 identifier |
| Kind | 1 byte | Message type (1=text, 2=state, 10=dns, etc.) |
| Anchor Count | 1 byte | Number of parent references (0-255) |
| Anchors | 9 bytes each | 8-byte txid prefix + 1-byte vout |
| Body | variable | Kind-specific payload |

## Message Kinds

| Kind | ID | Description |
|------|----|-------------|
| Generic | 0 | Raw binary data |
| Text | 1 | UTF-8 text messages |
| State | 2 | State updates (pixels, etc.) |
| Vote | 3 | Voting |
| Image | 4 | Image data |
| GeoMarker | 5 | Geographic markers |
| DNS | 10 | Domain name registration |
| Proof | 11 | Proof of existence |
| Token | 20 | Token operations |
| Oracle | 30-33 | Oracle attestations |
| Lottery | 40-43 | Lottery operations |

## Carrier Types

ANCHOR supports multiple carriers for embedding data in Bitcoin transactions:

| Carrier | Description | Max Size |
|---------|-------------|----------|
| OP_RETURN | Standard nulldata output | ~100KB (Bitcoin Core v30+) |
| Inscription | Ordinals-style inscriptions | ~400KB |
| Stamps | Bare multisig outputs | Unlimited |
| Taproot Annex | Taproot witness annex | ~400KB |
| Witness Data | Custom witness scripts | ~400KB |

## Constants

```rust
use anchor_core::{
    ANCHOR_MAGIC,           // [0xA1, 0x1C, 0x00, 0x01]
    TXID_PREFIX_SIZE,       // 8 bytes
    ANCHOR_SIZE,            // 9 bytes (prefix + vout)
    MIN_PAYLOAD_SIZE,       // 6 bytes (magic + kind + count)
    MAX_RECOMMENDED_ANCHORS // 16
};
```

## Error Handling

```rust
use anchor_core::{parse_anchor_payload, AnchorError};

match parse_anchor_payload(&data) {
    Ok(message) => println!("Parsed: {:?}", message.kind),
    Err(AnchorError::InvalidMagic) => println!("Not an ANCHOR message"),
    Err(AnchorError::PayloadTooShort) => println!("Truncated payload"),
    Err(e) => println!("Error: {}", e),
}
```

## Related Crates

- **[anchor-specs](../anchor-specs)** - Protocol specifications for all message kinds
- **[anchor-wallet-lib](../anchor-wallet-lib)** - Wallet library for building ANCHOR apps

## License

MIT

