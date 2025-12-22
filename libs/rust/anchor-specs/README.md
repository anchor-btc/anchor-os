# anchor-specs

Protocol specifications and validation for ANCHOR message kinds.

## Overview

This crate provides the official specifications for all ANCHOR message kinds. It serves as the single source of truth for payload encoding, decoding, and validation.

## Features

- **Type-safe specs** - Strongly-typed payload structures for each message kind
- **Validation** - Built-in validation for domain names, coordinates, hashes, etc.
- **Carrier hints** - Automatic carrier selection based on payload characteristics
- **Interoperability** - Re-exports core types from `anchor-core`

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
anchor-specs = "0.1"
```

## Supported Message Kinds

| Module | Kind ID | Description |
|--------|---------|-------------|
| `text` | 1 | UTF-8 text messages |
| `state` | 2 | State updates (pixels, etc.) |
| `dns` | 10 | Domain name registration |
| `proof` | 11 | Proof of existence |
| `geomarker` | 12 | Geographic markers |
| `token` | 20 | Token operations |

## Quick Start

### DNS Registration

```rust
use anchor_specs::dns::{DnsSpec, DnsOperation, DnsRecord};
use anchor_specs::KindSpec;

// Create a domain registration
let spec = DnsSpec {
    operation: DnsOperation::Register,
    name: "example.btc".to_string(),
    records: vec![
        DnsRecord::a("93.184.216.34", 3600).unwrap(),
        DnsRecord::txt("Hello from Bitcoin!", 3600),
    ],
};

// Validate
spec.validate().expect("Invalid spec");

// Encode to bytes
let bytes = spec.to_bytes();

// Decode from bytes
let decoded = DnsSpec::from_bytes(&bytes).unwrap();
```

### Proof of Existence

```rust
use anchor_specs::proof::{ProofSpec, ProofEntry, HashAlgorithm};
use anchor_specs::KindSpec;

// Create a file hash proof
let spec = ProofSpec::stamp(ProofEntry {
    hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855".to_string(),
    algorithm: HashAlgorithm::SHA256,
    filename: Some("document.pdf".to_string()),
    size: Some(1024),
    metadata: None,
});

spec.validate().expect("Invalid proof");
let bytes = spec.to_bytes();
```

### Geographic Markers

```rust
use anchor_specs::geomarker::GeoMarkerSpec;
use anchor_specs::KindSpec;

// Create a location marker
let spec = GeoMarkerSpec::new(
    "restaurant",       // category
    -23.5505,          // latitude
    -46.6333,          // longitude
    "Best pizza in São Paulo!"
);

spec.validate().expect("Invalid geomarker");
let bytes = spec.to_bytes();
```

### Token Operations

```rust
use anchor_specs::token::TokenSpec;
use anchor_specs::KindSpec;

// Deploy a new token
let spec = TokenSpec::deploy(
    "ANCHOR",          // ticker
    21_000_000,        // max supply
    8,                 // decimals
);

spec.validate().expect("Invalid token");
```

### State Updates (Pixels)

```rust
use anchor_specs::state::PixelData;

// Create pixel data
let pixel = PixelData::new(100, 200, 255, 128, 64);
let bytes = pixel.to_bytes();

// Parse pixel data
let parsed = PixelData::from_bytes(&bytes).unwrap();
assert_eq!(parsed.x, 100);
assert_eq!(parsed.y, 200);
```

## The `KindSpec` Trait

All specs implement the `KindSpec` trait:

```rust
pub trait KindSpec: Sized {
    /// Parse from binary payload
    fn from_bytes(bytes: &[u8]) -> Result<Self, SpecError>;
    
    /// Encode to binary payload
    fn to_bytes(&self) -> Vec<u8>;
    
    /// Validate the spec contents
    fn validate(&self) -> Result<(), SpecError>;
    
    /// List of carriers that support this kind
    fn supported_carriers() -> Vec<CarrierType>;
    
    /// Recommended carrier for this kind
    fn recommended_carrier() -> CarrierType;
}
```

## Additional Traits

### `AnchorableSpec`

For specs that can reference parent messages:

```rust
pub trait AnchorableSpec: KindSpec {
    fn with_anchor(self, txid: &str, vout: u8) -> Self;
    fn anchors(&self) -> Vec<Anchor>;
}
```

### `OwnedSpec`

For specs that represent owned assets (domains, tokens):

```rust
pub trait OwnedSpec: KindSpec {
    fn owner_output(&self) -> Option<u8>;
    fn transfer(self, new_owner_vout: u8) -> Self;
}
```

## Carrier Selection

Each spec knows which carriers can support it:

```rust
use anchor_specs::dns::DnsSpec;
use anchor_specs::KindSpec;
use anchor_core::carrier::CarrierType;

// DNS specs are too large for OP_RETURN in most cases
let carriers = DnsSpec::supported_carriers();
assert!(carriers.contains(&CarrierType::Inscription));
assert!(carriers.contains(&CarrierType::Stamps));

// Recommended carrier
let recommended = DnsSpec::recommended_carrier();
```

## Validation Rules

Each kind has specific validation:

| Kind | Validation |
|------|------------|
| DNS | Valid domain name, supported TLD, valid records |
| Proof | Valid hash format, supported algorithm |
| GeoMarker | Valid coordinates (-90 to 90, -180 to 180) |
| Token | Valid ticker, reasonable supply/decimals |

## Prelude

For convenience, use the prelude:

```rust
use anchor_specs::prelude::*;

// Includes: SpecError, KindSpec, AnchorableSpec, OwnedSpec, CarrierType
```

## Related Crates

- **[anchor-core](../anchor-core)** - Core types and parsing
- **[anchor-wallet-lib](../anchor-wallet-lib)** - Wallet library for building ANCHOR apps

## License

MIT

