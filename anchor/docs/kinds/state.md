# Kind 2: State

The **State** kind is used for application state updates. It's designed for applications that need to track changes over time, such as Anchor Canvas's collaborative pixel canvas.

## Overview

- **Kind**: 2 (`0x02`)
- **Name**: State
- **Status**: Core
- **Max Payload**: Carrier-dependent

State messages represent incremental updates to application state. When combined with anchoring, they create a verifiable history of changes.

## Payload Format

The payload format is application-specific. The base State kind defines a minimal structure:

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0..n | data | bytes | Application-specific state data |

### Pixel State Format (Canvas Application)

Used by Anchor Canvas for collaborative pixel art:

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0-3 | num_pixels | u32 | Number of pixels (big-endian) |
| 4+ | pixels | 7 bytes each | Pixel data |

Each pixel:

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0-1 | x | u16 | X coordinate (big-endian) |
| 2-3 | y | u16 | Y coordinate (big-endian) |
| 4 | r | u8 | Red (0-255) |
| 5 | g | u8 | Green (0-255) |
| 6 | b | u8 | Blue (0-255) |

## Rust Implementation (anchor-specs)

The `StateSpec` struct in `anchor-specs` provides encoding and decoding:

```rust
use anchor_specs::state::{StateSpec, PixelData};
use anchor_specs::KindSpec;

// Create a StateSpec with pixels
let spec = StateSpec::new(vec![
    PixelData::new(100, 200, 255, 0, 0),   // Red pixel at (100, 200)
    PixelData::new(101, 200, 0, 255, 0),   // Green pixel at (101, 200)
]);

// Validate
spec.validate()?;

// Encode to bytes
let bytes = spec.to_bytes();

// Decode from bytes
let decoded = StateSpec::from_bytes(&bytes)?;
```

## TypeScript Interface

```typescript
// Base state message
interface StateMessage extends AnchorMessage {
  kind: AnchorKind.State  // 2
  body: Uint8Array
}

// Pixel-specific interface
interface Pixel {
  x: number
  y: number
  r: number
  g: number
  b: number
}

interface PixelStateMessage extends StateMessage {
  pixels: Pixel[]
}
```

## Encoding Example

### Pixel Encoder

```typescript
const ANCHOR_MAGIC = new Uint8Array([0xa1, 0x1c, 0x00, 0x01])
const ANCHOR_KIND_STATE = 2

function encodePixel(pixel: Pixel): Uint8Array {
  const buffer = new ArrayBuffer(7)
  const view = new DataView(buffer)
  
  view.setUint16(0, pixel.x, false)  // big-endian
  view.setUint16(2, pixel.y, false)
  view.setUint8(4, pixel.r)
  view.setUint8(5, pixel.g)
  view.setUint8(6, pixel.b)
  
  return new Uint8Array(buffer)
}

function encodePixelPayload(pixels: Pixel[]): Uint8Array {
  const buffer = new ArrayBuffer(4 + pixels.length * 7)
  const view = new DataView(buffer)
  
  // Number of pixels
  view.setUint32(0, pixels.length, false)
  
  // Encode each pixel
  const result = new Uint8Array(buffer)
  let offset = 4
  for (const pixel of pixels) {
    result.set(encodePixel(pixel), offset)
    offset += 7
  }
  
  return result
}
```

## Size Calculations

### Pixels per Transaction

With Bitcoin Core v30+ supporting 100KB OP_RETURN (`datacarriersize=100000`):

| Component | Size |
|-----------|------|
| Magic | 4 bytes |
| Kind | 1 byte |
| Anchor count | 1 byte |
| Pixel count (u32) | 4 bytes |
| **Available** | **~99,990 bytes** |
| **Max pixels** | **~14,000 pixels** (99990 / 7) |

::: tip Large Batches
With Bitcoin Core v30+, you can paint thousands of pixels in a single transaction!
This is much more efficient than multiple small transactions.
:::

### Fee Estimation

```typescript
function estimatePixelFee(pixelCount: number, feeRate = 1): number {
  const baseTxSize = 150  // vbytes
  const pixelDataSize = 4 + pixelCount * 7
  const opReturnOverhead = 10
  
  const totalSize = baseTxSize + opReturnOverhead + pixelDataSize
  return totalSize * feeRate  // satoshis
}

// Example: 100 pixels at 1 sat/vB
estimatePixelFee(100, 1)  // ~860 sats

// Example: 10,000 pixels at 1 sat/vB  
estimatePixelFee(10000, 1)  // ~70,160 sats
```

## Validation

The `StateSpec` validates:

1. **Pixel count**: 1-14,000 pixels per message
2. **Coordinates**: Within canvas bounds (default 4580x4580)
3. **Color values**: 0-255 for RGB

```rust
// Rust validation
spec.validate()?;
spec.validate_coordinates(4580, 4580)?;
```

## Use Cases

### Collaborative Canvas

Real-time pixel art where each transaction adds pixels:

```typescript
canvas.onPixelPaint(async (x, y, color) => {
  const message = createAnchorPixelMessage([
    { x, y, r: color.r, g: color.g, b: color.b }
  ])
  await wallet.broadcast(message)
})
```

### Game State

Store game state updates on-chain with custom encoding.

### Counters

Simple increment operations for voting or counting.

## See Also

- [Vote (Kind 3)](/kinds/vote) - For governance voting
- [Anchor Canvas](/apps/canvas) - Live application using State kind
- [SDK API Reference](/sdk/api-reference) - SDK implementation
