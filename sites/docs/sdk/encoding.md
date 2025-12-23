# Encoding

Create Anchor protocol message payloads for any supported kind.

## Basic Encoding

### Text Messages

::: code-group

```typescript [TypeScript]
import { createMessage, AnchorKind } from '@AnchorProtocol/sdk'

const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Hello, Bitcoin!'
})

// Returns Uint8Array: [161, 28, 0, 1, 1, 0, 72, 101, 108, 108, 111, ...]
```

```rust [Rust]
use anchor_core::{encode_anchor_payload, ParsedAnchorMessage, AnchorKind};

let message = ParsedAnchorMessage {
    kind: AnchorKind::Text,
    anchors: vec![],
    body: b"Hello, Bitcoin!".to_vec(),
};

let encoded = encode_anchor_payload(&message);
```

:::

### With Anchors (Reply)

::: code-group

```typescript [TypeScript]
const reply = createMessage({
  kind: AnchorKind.Text,
  body: 'Great point!',
  anchors: [
    { txid: 'abc123def456789...', vout: 0 }
  ]
})
```

```rust [Rust]
use anchor_core::{encode_anchor_payload, ParsedAnchorMessage, AnchorKind, Anchor};

let message = ParsedAnchorMessage {
    kind: AnchorKind::Text,
    anchors: vec![
        Anchor {
            txid_prefix: [0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0],
            vout: 0,
        },
    ],
    body: b"Great point!".to_vec(),
};

let encoded = encode_anchor_payload(&message);
```

:::

## Kind-Specific Encoders

### DNS Registration

::: code-group

```typescript [TypeScript]
import { encodeDnsPayload, DnsOperation, RecordType } from '@AnchorProtocol/sdk/dns'

const dnsPayload = encodeDnsPayload({
  operation: DnsOperation.REGISTER,
  name: 'example.btc',
  records: [
    { type: RecordType.A, ttl: 3600, value: '192.168.1.1' },
    { type: RecordType.TXT, ttl: 3600, value: 'Hello World' }
  ]
})

const message = createMessage({
  kind: 10, // DNS
  bodyBytes: dnsPayload
})
```

```rust [Rust]
use anchor_specs::dns::{DnsSpec, DnsOperation, DnsRecord};
use anchor_specs::KindSpec;

let spec = DnsSpec {
    operation: DnsOperation::Register,
    name: "example.btc".to_string(),
    records: vec![
        DnsRecord::a("192.168.1.1", 3600).unwrap(),
        DnsRecord::txt("Hello World", 3600),
    ],
};

spec.validate().expect("Invalid DNS spec");
let bytes = spec.to_bytes();
```

:::

### Proof of Existence

::: code-group

```typescript [TypeScript]
import { encodeProofPayload, ProofOperation, HashAlgorithm } from '@AnchorProtocol/sdk/proof'

const fileData = await file.arrayBuffer()
const hashBuffer = await crypto.subtle.digest('SHA-256', fileData)
const hash = new Uint8Array(hashBuffer)

const proofPayload = encodeProofPayload({
  operation: ProofOperation.STAMP,
  algorithm: HashAlgorithm.SHA256,
  hash,
  metadata: {
    filename: file.name,
    mimeType: file.type,
    fileSize: file.size
  }
})

const message = createMessage({
  kind: 11,
  bodyBytes: proofPayload
})
```

```rust [Rust]
use anchor_specs::proof::{ProofSpec, ProofEntry, HashAlgorithm};
use anchor_specs::KindSpec;

let spec = ProofSpec::stamp(ProofEntry {
    hash: "e3b0c44298fc1c149afbf4c8996fb924...".to_string(),
    algorithm: HashAlgorithm::SHA256,
    filename: Some("document.pdf".to_string()),
    size: Some(1024),
    metadata: None,
});

spec.validate().expect("Invalid proof");
let bytes = spec.to_bytes();
```

:::

### Token Operations

::: code-group

```typescript [TypeScript]
import { 
  encodeDeployPayload, 
  encodeMintPayload, 
  encodeTransferPayload,
  DeployFlags 
} from '@AnchorProtocol/sdk/token'

// Deploy a new token
const deployPayload = encodeDeployPayload({
  ticker: 'SATS',
  decimals: 8,
  maxSupply: 21_000_000_00000000n,
  mintLimit: 210_000_00000000n,
  flags: DeployFlags.OPEN_MINT | DeployFlags.BURNABLE
})

// Mint tokens
const mintPayload = encodeMintPayload({
  tokenId: 800000n,
  amount: 1000_00000000n,
  outputIndex: 1
})

// Transfer tokens
const transferPayload = encodeTransferPayload({
  tokenId: 800000n,
  allocations: [
    { outputIndex: 1, amount: 500_00000000n },
    { outputIndex: 2, amount: 500_00000000n }
  ]
})
```

```rust [Rust]
use anchor_specs::token::TokenSpec;
use anchor_specs::KindSpec;

// Deploy a new token
let spec = TokenSpec::deploy(
    "SATS",       // ticker
    21_000_000,   // max supply
    8,            // decimals
);

spec.validate().expect("Invalid token");
let bytes = spec.to_bytes();
```

:::

### Geographic Markers

::: code-group

```typescript [TypeScript]
import { encodeGeoMarker } from '@AnchorProtocol/sdk/geo'

const markerPayload = encodeGeoMarker({
  category: 1, // Bitcoin Accepted
  latitude: 37.7749,
  longitude: -122.4194,
  message: 'Best coffee in SF!'
})

const message = createMessage({
  kind: 5,
  bodyBytes: markerPayload
})
```

```rust [Rust]
use anchor_specs::geomarker::GeoMarkerSpec;
use anchor_specs::KindSpec;

let spec = GeoMarkerSpec::new(
    "restaurant",
    37.7749,
    -122.4194,
    "Best coffee in SF!"
);

spec.validate().expect("Invalid geomarker");
let bytes = spec.to_bytes();
```

:::

## Carrier Selection

::: code-group

```typescript [TypeScript]
import { selectCarrier, CarrierType } from '@AnchorProtocol/sdk'

// Auto-select based on size
const payloadSize = 1000 // bytes
const carrier = selectCarrier(payloadSize)
// Returns CarrierType.WitnessData for payloads > 80 bytes

// Force specific carrier
const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Hello!',
  carrier: CarrierType.OpReturn
})
```

```rust [Rust]
use anchor_specs::KindSpec;

// Each spec knows its supported carriers
let carriers = DnsSpec::supported_carriers();
let recommended = DnsSpec::recommended_carrier();
```

:::

## Carrier Types

| Carrier | Max Size | Best For |
|---------|----------|----------|
| OP_RETURN | ~80 bytes | Short messages, proofs |
| Inscription | ~400KB | Images, large data |
| Stamps | Unlimited | Permanent storage |
| Taproot Annex | ~400KB | Private data |
| Witness | ~400KB | Complex scripts |

## Anchor Creation

::: code-group

```typescript [TypeScript]
import { createAnchor } from '@AnchorProtocol/sdk'

// From txid (first 8 bytes of reversed txid)
const anchor = createAnchor(
  'abc123def456789012345678901234567890123456789012345678901234abcd',
  0 // output index
)

// Multiple anchors
const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Replying to multiple messages',
  anchors: [
    { txid: 'abc123...', vout: 0 },
    { txid: 'def456...', vout: 1 }
  ]
})
```

```rust [Rust]
use anchor_core::Anchor;

let anchor = Anchor {
    txid_prefix: [0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0],
    vout: 0,
};

// Use in message
let message = ParsedAnchorMessage {
    kind: AnchorKind::Text,
    anchors: vec![anchor],
    body: b"Replying".to_vec(),
};
```

:::

## Size Calculations

::: code-group

```typescript [TypeScript]
import { fitsInOpReturn, calculateMessageSize } from '@AnchorProtocol/sdk'

// Check if fits in OP_RETURN
const fits = fitsInOpReturn(AnchorKind.Text, 'Hello!')
// true

// Calculate total payload size
const size = calculateMessageSize({
  kind: AnchorKind.Text,
  body: 'Hello, World!',
  anchors: [{ txid: 'abc...', vout: 0 }]
})
```

```rust [Rust]
use anchor_core::{encode_anchor_payload, ParsedAnchorMessage, AnchorKind};

let message = ParsedAnchorMessage {
    kind: AnchorKind::Text,
    anchors: vec![],
    body: b"Hello!".to_vec(),
};

let encoded = encode_anchor_payload(&message);
let size = encoded.len();

// OP_RETURN limit is ~80 bytes
let fits_op_return = size <= 80;
```

:::

## Constants

::: code-group

```typescript [TypeScript]
import { 
  ANCHOR_MAGIC,      // [0xA1, 0x1C, 0x00, 0x01]
  MIN_PAYLOAD_SIZE,  // 6 bytes
  ANCHOR_SIZE        // 9 bytes (8 prefix + 1 vout)
} from '@AnchorProtocol/sdk'
```

```rust [Rust]
use anchor_core::{
    ANCHOR_MAGIC,            // [0xA1, 0x1C, 0x00, 0x01]
    TXID_PREFIX_SIZE,        // 8 bytes
    ANCHOR_SIZE,             // 9 bytes
    MIN_PAYLOAD_SIZE,        // 6 bytes
    MAX_RECOMMENDED_ANCHORS  // 16
};
```

:::

## Error Handling

::: code-group

```typescript [TypeScript]
import { AnchorError, AnchorErrorCode } from '@AnchorProtocol/sdk'

try {
  const message = createMessage({
    kind: AnchorKind.Text,
    body: 'A'.repeat(1000),
    carrier: CarrierType.OpReturn // Too large!
  })
} catch (error) {
  if (error instanceof AnchorError) {
    switch (error.code) {
      case AnchorErrorCode.MessageTooLarge:
        console.log('Message exceeds carrier limit')
        break
      case AnchorErrorCode.InvalidTxid:
        console.log('Invalid txid format')
        break
    }
  }
}
```

```rust [Rust]
use anchor_specs::SpecError;

match spec.validate() {
    Ok(()) => println!("Valid!"),
    Err(SpecError::InvalidSize { max, actual }) => {
        println!("Too large: {} > {}", actual, max);
    }
    Err(SpecError::InvalidFormat(msg)) => {
        println!("Invalid format: {}", msg);
    }
    Err(e) => println!("Error: {}", e),
}
```

:::

## See Also

- [Parsing](/sdk/parsing) - Decode messages
- [Wallet](/sdk/wallet) - Broadcast transactions
- [Kinds Reference](/kinds/) - Payload formats
