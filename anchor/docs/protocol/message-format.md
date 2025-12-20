# Message Format

Anchor messages use a compact binary format designed for efficiency on Bitcoin's limited block space. Every message follows the same header structure, with the body interpreted according to the message kind.

## Binary Structure

```
┌──────────┬──────────┬──────────────┬─────────────┬───────────────┐
│  Magic   │   Kind   │ Anchor Count │   Anchors   │     Body      │
│ (4 bytes)│ (1 byte) │   (1 byte)   │ (9 × count) │  (variable)   │
└──────────┴──────────┴──────────────┴─────────────┴───────────────┘
     ▲           ▲            ▲             ▲              ▲
     │           │            │             │              │
  0xA11C0001   0-255        0-255      txid[8]+vout[1]   Kind-specific
```

## Header Fields

### Magic Bytes (4 bytes)

The protocol identifier and version:

| Byte | Value | Meaning |
|------|-------|---------|
| 0-1 | `0xA1 0x1C` | "ANCH" identifier |
| 2-3 | `0x00 0x01` | Version 1 |

```typescript
const ANCHOR_MAGIC = new Uint8Array([0xa1, 0x1c, 0x00, 0x01])
```

### Kind (1 byte)

Message type identifier from 0-255:

| Range | Purpose |
|-------|---------|
| 0-9 | Core protocol types |
| 10-99 | Standard extensions |
| 100-199 | Reserved |
| 200-255 | Custom/experimental |

### Anchor Count (1 byte)

Number of parent references (0-255). A count of 0 indicates a root message with no parents.

### Anchors (9 bytes each)

Each anchor consists of:

| Field | Size | Description |
|-------|------|-------------|
| `txid_prefix` | 8 bytes | First 64 bits of parent txid |
| `vout` | 1 byte | Output index (0-255) |

```typescript
interface Anchor {
  txidPrefix: Uint8Array  // 8 bytes
  vout: number            // 0-255
}
```

::: tip Why 8-byte prefix?
Using the first 8 bytes of a txid provides 2^64 possible values, making collisions astronomically unlikely while saving space compared to full 32-byte txids.
:::

### Body (variable)

The message payload, interpreted according to the kind. Maximum size depends on the carrier type:

| Carrier | Max Body Size |
|---------|--------------|
| OP_RETURN | ~70 bytes (after header) |
| Witness Data | ~4 MB |
| Inscription | ~4 MB |
| Stamps | ~8 KB |

## Example: Text Message

A simple "Hello!" message with no parent:

```
Offset  Hex                     Meaning
──────────────────────────────────────────────
0x00    A1 1C 00 01             Magic (v1)
0x04    01                      Kind: Text
0x05    00                      0 anchors
0x06    48 65 6C 6C 6F 21       "Hello!" (UTF-8)
```

**Total: 12 bytes**

## Example: Reply Message

A reply referencing a parent message:

```
Offset  Hex                     Meaning
──────────────────────────────────────────────
0x00    A1 1C 00 01             Magic (v1)
0x04    01                      Kind: Text
0x05    01                      1 anchor
0x06    AB CD EF 01 23 45 67 89 Parent txid prefix
0x0E    00                      Parent vout: 0
0x0F    47 72 65 61 74 21       "Great!" (UTF-8)
```

**Total: 21 bytes**

## Minimum Sizes

| Message Type | Min Size |
|-------------|----------|
| Empty root message | 6 bytes |
| Root with 1-byte body | 7 bytes |
| Reply (1 anchor) | 15 bytes |
| Reply with 1-byte body | 16 bytes |

## TypeScript Types

```typescript
// Core message structure
interface AnchorMessage {
  kind: number
  anchors: Anchor[]
  body: Uint8Array
}

// Parsed text message
interface TextMessage extends AnchorMessage {
  kind: 1  // AnchorKind.Text
  text: string
}

// Anchor reference
interface Anchor {
  txidPrefix: Uint8Array  // 8 bytes
  vout: number            // 0-255
}
```

## Encoding Example

```typescript
import { ANCHOR_MAGIC } from '@AnchorProtocol/anchor-sdk'

function encodeMessage(
  kind: number,
  anchors: Anchor[],
  body: Uint8Array
): Uint8Array {
  const anchorBytes = anchors.length * 9
  const totalSize = 4 + 1 + 1 + anchorBytes + body.length
  const message = new Uint8Array(totalSize)
  
  let offset = 0
  
  // Magic
  message.set(ANCHOR_MAGIC, offset)
  offset += 4
  
  // Kind
  message[offset++] = kind
  
  // Anchor count
  message[offset++] = anchors.length
  
  // Anchors
  for (const anchor of anchors) {
    message.set(anchor.txidPrefix, offset)
    offset += 8
    message[offset++] = anchor.vout
  }
  
  // Body
  message.set(body, offset)
  
  return message
}
```

## Validation Rules

When parsing a message:

1. **Magic check**: First 4 bytes must be `0xA11C0001`
2. **Minimum size**: At least 6 bytes (header only)
3. **Anchor bounds**: `6 + (anchor_count × 9) ≤ payload.length`
4. **Kind validation**: Kind must be recognized or treated as Generic

```typescript
function isValidAnchorMessage(bytes: Uint8Array): boolean {
  if (bytes.length < 6) return false
  
  // Check magic
  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== ANCHOR_MAGIC[i]) return false
  }
  
  // Check anchor bounds
  const anchorCount = bytes[5]
  const minSize = 6 + anchorCount * 9
  
  return bytes.length >= minSize
}
```

## Next Steps

- [Carrier Types](/protocol/carriers) - Learn about embedding options
- [Anchoring System](/protocol/anchoring) - Create message threads
- [SDK Encoding](/sdk/encoding) - Use the TypeScript SDK

