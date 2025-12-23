# Message Format

Anchor messages use a compact binary format designed for efficiency on Bitcoin's limited block space.

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

| Byte | Value | Meaning |
|------|-------|---------|
| 0-1 | `0xA1 0x1C` | "ANCH" identifier |
| 2-3 | `0x00 0x01` | Version 1 |

```typescript
const ANCHOR_MAGIC = new Uint8Array([0xa1, 0x1c, 0x00, 0x01])
```

### Kind (1 byte)

| Range | Purpose |
|-------|---------|
| 0-9 | Core protocol types |
| 10-99 | Standard extensions |
| 100-199 | Reserved |
| 200-255 | Custom/experimental |

### Anchor Count (1 byte)

Number of parent references (0-255). A count of 0 indicates a root message.

### Anchors (9 bytes each)

| Field | Size | Description |
|-------|------|-------------|
| `txid_prefix` | 8 bytes | First 64 bits of parent txid |
| `vout` | 1 byte | Output index (0-255) |

### Body (variable)

Maximum size depends on the carrier:

| Carrier | Max Body Size |
|---------|--------------|
| OP_RETURN | ~70 bytes (after header) |
| Witness Data | ~4 MB |
| Inscription | ~4 MB |
| Stamps | ~8 KB |

## Examples

### Text Message (12 bytes)

```
Offset  Hex                     Meaning
──────────────────────────────────────────────
0x00    A1 1C 00 01             Magic (v1)
0x04    01                      Kind: Text
0x05    00                      0 anchors
0x06    48 65 6C 6C 6F 21       "Hello!" (UTF-8)
```

### Reply Message (21 bytes)

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

## Minimum Sizes

| Message Type | Min Size |
|-------------|----------|
| Empty root message | 6 bytes |
| Root with 1-byte body | 7 bytes |
| Reply (1 anchor) | 15 bytes |
| Reply with 1-byte body | 16 bytes |

## Validation Rules

1. **Magic check**: First 4 bytes must be `0xA11C0001`
2. **Minimum size**: At least 6 bytes
3. **Anchor bounds**: `6 + (anchor_count × 9) ≤ payload.length`
4. **Kind validation**: Kind must be recognized or treated as Generic

## See Also

- [Carriers](/concepts/carriers) - Embedding methods
- [Threading](/concepts/threading) - Message chains
- [SDK Encoding](/sdk/encoding) - TypeScript SDK

