# Parsing

Parse Anchor protocol messages from raw bytes or Bitcoin transactions.

## Basic Parsing

### Parse Raw Bytes

::: code-group

```typescript [TypeScript]
import { parseMessage, hexToBytes } from '@AnchorProtocol/sdk'

const bytes = hexToBytes('a11c00010100486565c6c6f21')
const message = parseMessage(bytes)

if (message) {
  console.log('Kind:', message.kind)
  console.log('Anchors:', message.anchors.length)
  console.log('Body:', message.body)
}
```

```rust [Rust]
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

:::

### Parse Text Message

::: code-group

```typescript [TypeScript]
import { parseMessage, AnchorKind } from '@AnchorProtocol/sdk'

const message = parseMessage(bytes)

if (message && message.kind === AnchorKind.Text) {
  const text = new TextDecoder().decode(message.body)
  console.log('Text:', text)
}
```

```rust [Rust]
use anchor_core::{parse_anchor_payload, AnchorKind};

let message = parse_anchor_payload(&payload)?;

if message.kind == AnchorKind::Text {
    let text = String::from_utf8_lossy(&message.body);
    println!("Text: {}", text);
}
```

:::

## Detect Messages in Transactions

::: code-group

```typescript [TypeScript]
import { extractAnchorMessage, hexToBytes } from '@AnchorProtocol/sdk'

async function parseTransaction(txid: string, indexer: AnchorIndexer) {
  const tx = await indexer.getTransaction(txid)
  
  for (let vout = 0; vout < tx.vout.length; vout++) {
    const output = tx.vout[vout]
    
    // Check for OP_RETURN
    if (output.scriptPubKey.type === 'nulldata') {
      const data = hexToBytes(output.scriptPubKey.hex.slice(4))
      const message = parseMessage(data)
      
      if (message) {
        return { message, vout }
      }
    }
  }
  return null
}
```

```rust [Rust]
use anchor_core::carrier::CarrierSelector;
use bitcoin::Transaction;

let selector = CarrierSelector::new();
let detections = selector.detect(&transaction);

for detection in detections {
    println!("Found {:?} via {:?}", 
        detection.message.kind, 
        detection.carrier_type
    );
}
```

:::

## Kind-Specific Parsers

### Parse DNS Messages

::: code-group

```typescript [TypeScript]
import { decodeDnsPayload } from '@AnchorProtocol/sdk/dns'

const message = parseMessage(bytes)

if (message && message.kind === 10) {
  const dns = decodeDnsPayload(message.body)
  
  if (dns) {
    console.log('Domain:', dns.name)
    console.log('Operation:', dns.operation)
    console.log('Records:', dns.records)
  }
}
```

```rust [Rust]
use anchor_specs::dns::DnsSpec;
use anchor_specs::KindSpec;

let spec = DnsSpec::from_bytes(&message.body)?;

println!("Domain: {}", spec.name);
println!("Operation: {:?}", spec.operation);
for record in &spec.records {
    println!("Record: {:?}", record);
}
```

:::

### Parse Token Messages

::: code-group

```typescript [TypeScript]
import { decodeTokenPayload, TokenOperation } from '@AnchorProtocol/sdk/token'

const message = parseMessage(bytes)

if (message && message.kind === 20) {
  const token = decodeTokenPayload(message.body)
  
  if (token) {
    switch (token.operation) {
      case TokenOperation.DEPLOY:
        console.log('Token deployed:', token.data.ticker)
        break
      case TokenOperation.MINT:
        console.log('Minted:', token.data.amount)
        break
      case TokenOperation.TRANSFER:
        console.log('Transferred to', token.data.allocations.length, 'outputs')
        break
    }
  }
}
```

```rust [Rust]
use anchor_specs::token::TokenSpec;
use anchor_specs::KindSpec;

let spec = TokenSpec::from_bytes(&message.body)?;

match spec {
    TokenSpec::Deploy { ticker, max_supply, decimals } => {
        println!("Deploy: {} (max {})", ticker, max_supply);
    }
    TokenSpec::Mint { token_id, amount } => {
        println!("Mint: {} of token {}", amount, token_id);
    }
    TokenSpec::Transfer { allocations, .. } => {
        println!("Transfer to {} outputs", allocations.len());
    }
}
```

:::

### Parse Proof Messages

::: code-group

```typescript [TypeScript]
import { decodeProofPayload, HashAlgorithm, bytesToHex } from '@AnchorProtocol/sdk/proof'

const message = parseMessage(bytes)

if (message && message.kind === 11) {
  const proof = decodeProofPayload(message.body)
  
  if (proof) {
    console.log('Hash:', bytesToHex(proof.hash))
    console.log('Algorithm:', 
      proof.algorithm === HashAlgorithm.SHA256 ? 'SHA-256' : 'SHA-512'
    )
  }
}
```

```rust [Rust]
use anchor_specs::proof::ProofSpec;
use anchor_specs::KindSpec;

let spec = ProofSpec::from_bytes(&message.body)?;

println!("Hash: {}", spec.entry.hash);
println!("Algorithm: {:?}", spec.entry.algorithm);
if let Some(filename) = &spec.entry.filename {
    println!("Filename: {}", filename);
}
```

:::

### Parse GeoMarker Messages

::: code-group

```typescript [TypeScript]
import { decodeGeoMarker } from '@AnchorProtocol/sdk/geo'

const message = parseMessage(bytes)

if (message && message.kind === 5) {
  const marker = decodeGeoMarker(message.body)
  
  if (marker) {
    console.log('Location:', marker.latitude, marker.longitude)
    console.log('Message:', marker.message)
  }
}
```

```rust [Rust]
use anchor_specs::geomarker::GeoMarkerSpec;
use anchor_specs::KindSpec;

let spec = GeoMarkerSpec::from_bytes(&message.body)?;

println!("Location: {}, {}", spec.latitude, spec.longitude);
println!("Message: {}", spec.message);
```

:::

## Validation

::: code-group

```typescript [TypeScript]
import { isAnchorMessage, validateMessage, ANCHOR_MAGIC } from '@AnchorProtocol/sdk'

// Quick check
const isValid = isAnchorMessage(bytes)

// Detailed validation
const result = validateMessage(bytes)
if (result.valid) {
  console.log('Valid Anchor message')
} else {
  console.log('Invalid:', result.error)
  // "INVALID_MAGIC" | "PAYLOAD_TOO_SHORT" | "TRUNCATED_ANCHORS"
}
```

```rust [Rust]
use anchor_core::{parse_anchor_payload, ANCHOR_MAGIC};

// Check magic bytes
fn is_anchor_message(bytes: &[u8]) -> bool {
    bytes.len() >= 6 && bytes[..4] == ANCHOR_MAGIC
}

// Parse with validation
match parse_anchor_payload(bytes) {
    Ok(message) => println!("Valid: {:?}", message.kind),
    Err(e) => println!("Invalid: {}", e),
}
```

:::

## Anchor Resolution

::: code-group

```typescript [TypeScript]
import { resolveAnchor, AnchorResolution } from '@AnchorProtocol/sdk'

async function resolveAnchors(message: AnchorMessage, indexer: AnchorIndexer) {
  for (let i = 0; i < message.anchors.length; i++) {
    const anchor = message.anchors[i]
    const resolution = await resolveAnchor(
      anchor.txidPrefix,
      anchor.vout,
      indexer
    )
    
    if (resolution.status === 'resolved') {
      console.log(`Anchor ${i} -> ${resolution.txid}`)
    } else if (resolution.status === 'orphan') {
      console.log(`Anchor ${i} is orphan`)
    } else {
      console.log(`Anchor ${i} is ambiguous:`, resolution.candidates)
    }
  }
}
```

```rust [Rust]
// Anchor resolution is handled by the indexer
// The anchor prefix (8 bytes) + vout identifies the parent

for anchor in &message.anchors {
    let prefix_hex = hex::encode(&anchor.txid_prefix);
    println!("Looking for tx starting with {} vout {}", 
        prefix_hex, anchor.vout);
}
```

:::

## Type Definitions

::: code-group

```typescript [TypeScript]
// Core message structure
interface AnchorMessage {
  kind: number
  anchors: Anchor[]
  body: Uint8Array
}

// Anchor reference
interface Anchor {
  txidPrefix: Uint8Array // 8 bytes
  vout: number
}

// Resolution result
type AnchorResolution =
  | { status: 'resolved'; txid: string }
  | { status: 'orphan' }
  | { status: 'ambiguous'; candidates: string[] }
```

```rust [Rust]
// Core message structure
pub struct ParsedAnchorMessage {
    pub kind: AnchorKind,
    pub anchors: Vec<Anchor>,
    pub body: Vec<u8>,
}

// Anchor reference
pub struct Anchor {
    pub txid_prefix: [u8; 8],
    pub vout: u8,
}

// Message kind enum
pub enum AnchorKind {
    Generic = 0,
    Text = 1,
    State = 2,
    Vote = 3,
    Image = 4,
    GeoMarker = 5,
    // ...
}
```

:::

## Error Handling

::: code-group

```typescript [TypeScript]
import { parseMessage, AnchorError, AnchorErrorCode } from '@AnchorProtocol/sdk'

function safeParse(bytes: Uint8Array) {
  try {
    const message = parseMessage(bytes)
    
    if (!message) {
      return { success: false, error: 'Not an Anchor message' }
    }
    
    return { success: true, message }
  } catch (error) {
    if (error instanceof AnchorError) {
      return { success: false, error: error.message, code: error.code }
    }
    throw error
  }
}
```

```rust [Rust]
use anchor_core::{parse_anchor_payload, ParseError};

match parse_anchor_payload(bytes) {
    Ok(message) => {
        println!("Parsed: {:?}", message.kind);
    }
    Err(ParseError::InvalidMagic) => {
        println!("Not an Anchor message");
    }
    Err(ParseError::TooShort) => {
        println!("Payload too short");
    }
    Err(e) => {
        println!("Parse error: {}", e);
    }
}
```

:::

## See Also

- [Encoding](/sdk/encoding) - Create messages
- [Wallet](/sdk/wallet) - Transaction handling
- [Kinds Reference](/kinds/) - Payload formats

