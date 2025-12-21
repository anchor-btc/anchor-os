# Kind 2: State

The **State** kind is used for application state updates. It's designed for applications that need to track changes over time, such as Anchor Canvas's collaborative canvas.

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

### Pixel State Format (Example)

Used by Anchor Canvas for canvas updates:

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

function createAnchorPixelMessage(pixels: Pixel[]): Uint8Array {
  const body = encodePixelPayload(pixels)
  const message = new Uint8Array(4 + 1 + 1 + body.length)
  
  message.set(ANCHOR_MAGIC, 0)
  message[4] = ANCHOR_KIND_STATE
  message[5] = 0  // no anchors
  message.set(body, 6)
  
  return message
}
```

## Decoding Example

```typescript
function decodePixel(bytes: Uint8Array, offset: number): Pixel {
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset)
  return {
    x: view.getUint16(0, false),
    y: view.getUint16(2, false),
    r: view.getUint8(4),
    g: view.getUint8(5),
    b: view.getUint8(6)
  }
}

function decodePixelPayload(payload: Uint8Array): Pixel[] {
  const view = new DataView(payload.buffer, payload.byteOffset)
  const numPixels = view.getUint32(0, false)
  
  const pixels: Pixel[] = []
  for (let i = 0; i < numPixels; i++) {
    pixels.push(decodePixel(payload, 4 + i * 7))
  }
  
  return pixels
}
```

## Full Transaction Example

```typescript
// Paint some pixels on the canvas
const pixels: Pixel[] = [
  { x: 100, y: 100, r: 255, g: 0, b: 0 },     // Red pixel
  { x: 101, y: 100, r: 0, g: 255, b: 0 },     // Green pixel
  { x: 102, y: 100, r: 0, g: 0, b: 255 }      // Blue pixel
]

const message = createAnchorPixelMessage(pixels)

// Broadcast to Bitcoin
const wallet = new AnchorWallet(config)
const result = await wallet.broadcast(message)

console.log('Pixels painted at:', result.txid)
```

## Size Calculations

### Pixels per Transaction

For OP_RETURN (80 bytes):

| Component | Size |
|-----------|------|
| Magic | 4 bytes |
| Kind | 1 byte |
| Anchor count | 1 byte |
| Pixel count (u32) | 4 bytes |
| **Available** | **70 bytes** |
| **Max pixels** | **10 pixels** (70 ÷ 7) |

### Fee Estimation

```typescript
function estimatePixelFee(pixelCount: number, feeRate = 1): number {
  const baseTxSize = 150  // vbytes
  const pixelDataSize = 4 + pixelCount * 7
  const opReturnOverhead = 10
  
  const totalSize = baseTxSize + opReturnOverhead + pixelDataSize
  return totalSize * feeRate  // satoshis
}

// Example: 5 pixels at 1 sat/vB
estimatePixelFee(5, 1)  // ~199 sats
```

## State Aggregation

Build current state by replaying all State messages:

```typescript
class CanvasState {
  private pixels: Map<string, Pixel> = new Map()
  
  apply(message: PixelStateMessage): void {
    for (const pixel of message.pixels) {
      const key = `${pixel.x},${pixel.y}`
      this.pixels.set(key, pixel)
    }
  }
  
  getPixel(x: number, y: number): Pixel | undefined {
    return this.pixels.get(`${x},${y}`)
  }
  
  async loadFromChain(indexer: AnchorIndexer): Promise<void> {
    const messages = await indexer.getStateMessages()
    
    // Apply in block order
    for (const msg of messages.sort((a, b) => a.blockHeight - b.blockHeight)) {
      this.apply(msg)
    }
  }
}
```

## Validation

```typescript
function validatePixel(
  pixel: Pixel,
  canvasWidth = 4580,
  canvasHeight = 4580
): boolean {
  return (
    pixel.x >= 0 && pixel.x < canvasWidth &&
    pixel.y >= 0 && pixel.y < canvasHeight &&
    pixel.r >= 0 && pixel.r <= 255 &&
    pixel.g >= 0 && pixel.g <= 255 &&
    pixel.b >= 0 && pixel.b <= 255
  )
}

function validatePixelPayload(pixels: Pixel[]): boolean {
  if (pixels.length === 0 || pixels.length > 10) {
    return false
  }
  return pixels.every(validatePixel)
}
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

Store game state updates on-chain:

```typescript
interface GameState {
  player: { x: number, y: number }
  score: number
  items: number[]
}

// Encode game state as Kind 2 message
```

### Counter/Votes

Simple increment operations:

```typescript
// Each message increments a counter
const increment = createMessage({
  kind: AnchorKind.State,
  bodyBytes: new Uint8Array([0x01])  // +1
})
```

## See Also

- [Vote (Kind 3)](/kinds/vote) - For governance voting
- [Pixel Encoder](/sdk/encoding#pixel) - Full encoder docs
- [Anchor Canvas](https://canvas.anchor.dev) - Live application


