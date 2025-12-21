# AnchorCanvas

A collaborative pixel canvas on Bitcoin using the Anchor protocol. Similar to Reddit Place, but permanent and decentralized on the Bitcoin blockchain.

## Overview

AnchorCanvas allows users to paint pixels on a shared canvas by creating Bitcoin transactions. Each pixel is permanently recorded on the blockchain, creating a collaborative artwork that lives forever.

- **Canvas Size**: 4580 x 4580 (~21 million pixels - Bitcoin's magic number)
- **Protocol**: Uses Anchor protocol with State messages (kind = 2)

### Multi-Carrier Support

AnchorCanvas supports multiple carriers for embedding pixel data, allowing from small edits to massive drawings:

| Carrier | Max Size | ~Max Pixels | Best For |
|---------|----------|-------------|----------|
| **OP_RETURN** | 80 bytes | ~10 pixels | Quick single-pixel edits |
| **Witness Data** | ~520 KB | ~74K pixels | Medium drawings, 75% fee discount |
| **Inscription** | ~3.9 MB | **~557K pixels** | Large images, almost full block! |

This means you can paint an image up to **~746 x 746 pixels** in a single transaction!

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AnchorCanvas Stack                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  Next.js Frontend│  │    REST API      │                 │
│  │     (port 3200)  │  │   (port 3201)    │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                     │                           │
│           └──────────┬──────────┘                           │
│                      │                                      │
│              ┌───────┴───────┐                              │
│              │   PostgreSQL  │  (shared with Anchor)        │
│              │  (port 5432)  │                              │
│              └───────────────┘                              │
│                      ▲                                      │
│                      │                                      │
│              ┌───────┴───────┐                              │
│              │    Indexer    │  (detects all carriers)      │
│              └───────┬───────┘                              │
│                      │                                      │
│  ┌───────────────────┴───────────────────┐                  │
│  │            Bitcoin Core               │  (shared)        │
│  │              (port 18443)             │                  │
│  └───────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

## Features

### Canvas Tools
- **Paint Tool** - Select and paint pixels with any color
- **Brush Tool** - Adjustable brush size (1-21 pixels)
- **Erase Tool** - Remove pixels from selection
- **Pan & Zoom** - Navigate the massive canvas

### Image Import
- Upload images and convert them to pixels
- **Resize presets**: Tiny (32px) to XL (512px) or custom
- **Interactive preview**: Drag to position before painting
- **Threshold control**: Skip dark/transparent pixels
- Real-time fee estimation

### Smart Carrier Selection
- Automatic carrier selection based on payload size
- Manual override: choose OP_RETURN, Witness Data, or Inscription
- See estimated fees and TX size before painting

### Dynamic Fee Control
- Adjustable fee rate (1-100+ sat/vB)
- Preset buttons: 1, 2, 5, 10, 25, 50 sat/vB
- Fee updates in real-time as you select pixels

### Pending Pixels
- Pixels stay visible after TX broadcast
- Pulsing animation while waiting for confirmation
- Auto-clears when indexed by the backend
- "X pending" indicator on canvas

## Quick Start

### Run with Main Anchor Stack (Recommended)

AnchorCanvas is integrated into the main Anchor docker-compose. This shares Bitcoin, PostgreSQL, and Wallet services:

```bash
# From the anchor root directory
docker compose up -d

# View anchorcanvas logs
docker compose logs -f app-pixel-backend app-pixel-frontend
```

| Service | Port | Description |
|---------|------|-------------|
| AnchorCanvas Frontend | 3200 | Web interface |
| AnchorCanvas Backend | 3201 | REST API & Indexer |
| Wallet API | 8001 | Transaction creation (shared) |
| Dashboard | 3000 | Anchor Dashboard (shared) |
| PostgreSQL | 5432 | Database (shared) |
| Bitcoin RPC | 18443 | Bitcoin Core (shared) |

**Access AnchorCanvas:** [http://localhost:3200](http://localhost:3200)

## Protocol Specification

AnchorCanvas uses the **Anchor Protocol** to embed pixel data in Bitcoin transactions. This section documents the complete schema so developers can build compatible wallets and tools.

### Anchor Message Structure

Every AnchorCanvas transaction is an Anchor protocol message with `kind = 2` (State):

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       ANCHOR MESSAGE FORMAT                             │
├──────────────┬──────────┬────────────────┬────────────────┬─────────────┤
│ Magic (4B)   │ Kind (1B)│ Anchor Count   │ Anchors        │ Body        │
│              │          │ (1B)           │ (9B × N)       │ (variable)  │
├──────────────┼──────────┼────────────────┼────────────────┼─────────────┤
│ 0xA11C0001   │ 0x02     │ 0x00           │ (optional)     │ pixel data  │
└──────────────┴──────────┴────────────────┴────────────────┴─────────────┘
```

| Field | Size | Value | Description |
|-------|------|-------|-------------|
| Magic | 4 bytes | `0xA11C0001` | Anchor Protocol v1 identifier |
| Kind | 1 byte | `0x02` | State message (used for pixel data) |
| Anchor Count | 1 byte | `0x00-0xFF` | Number of parent references (usually 0) |
| Anchors | 9 × N bytes | - | Optional parent txid prefixes (for replies) |
| Body | variable | - | AnchorCanvas pixel payload |

### Pixel Payload Format

The body of the Anchor message contains the pixel data:

```
┌────────────────────────────────────────────────────────────────────────┐
│                       PIXEL PAYLOAD FORMAT                              │
├────────────────┬───────────────────────────────────────────────────────┤
│ Pixel Count    │ Pixels Array                                          │
│ (4 bytes)      │ (7 bytes × N)                                         │
├────────────────┼───────────────────────────────────────────────────────┤
│ BE uint32      │ [pixel_0][pixel_1]...[pixel_N-1]                      │
└────────────────┴───────────────────────────────────────────────────────┘

Each Pixel (7 bytes):
┌────────────┬────────────┬─────────┬─────────┬─────────┐
│ X (2B)     │ Y (2B)     │ R (1B)  │ G (1B)  │ B (1B)  │
├────────────┼────────────┼─────────┼─────────┼─────────┤
│ BE uint16  │ BE uint16  │ uint8   │ uint8   │ uint8   │
└────────────┴────────────┴─────────┴─────────┴─────────┘
```

| Field | Size | Type | Range | Description |
|-------|------|------|-------|-------------|
| Pixel Count | 4 bytes | Big-Endian uint32 | 1 - 557,142 | Number of pixels in payload |
| X | 2 bytes | Big-Endian uint16 | 0 - 4579 | X coordinate on canvas |
| Y | 2 bytes | Big-Endian uint16 | 0 - 4579 | Y coordinate on canvas |
| R | 1 byte | uint8 | 0 - 255 | Red color component |
| G | 1 byte | uint8 | 0 - 255 | Green color component |
| B | 1 byte | uint8 | 0 - 255 | Blue color component |

### Canvas Specifications

| Property | Value | Notes |
|----------|-------|-------|
| Width | 4580 pixels | ~√21,000,000 (Bitcoin's magic number) |
| Height | 4580 pixels | ~√21,000,000 |
| Total Pixels | 20,976,400 | Almost 21 million! |
| Coordinate Origin | (0, 0) | Top-left corner |
| Color Space | RGB | 24-bit true color |

### Example: Encoding Pixels

**Single pixel at (100, 200) with color red (#FF0000):**

```
Full Anchor message (hex):
A11C0001 02 00 00000001 0064 00C8 FF 00 00
│        │  │  │        │    │    │  │  └─ B = 0
│        │  │  │        │    │    │  └──── G = 0
│        │  │  │        │    │    └─────── R = 255
│        │  │  │        │    └───────────── Y = 200 (0x00C8)
│        │  │  │        └────────────────── X = 100 (0x0064)
│        │  │  └─────────────────────────── Count = 1
│        │  └────────────────────────────── Anchor count = 0
│        └───────────────────────────────── Kind = 2 (State)
└────────────────────────────────────────── Magic = ANCHOR v1
```

**Three pixels example:**

```javascript
// JavaScript encoding example
const pixels = [
  { x: 100, y: 200, r: 255, g: 0, b: 0 },     // Red
  { x: 101, y: 200, r: 0, g: 255, b: 0 },     // Green
  { x: 102, y: 200, r: 0, g: 0, b: 255 },     // Blue
];

// Resulting hex payload (body only):
// 00000003 0064 00C8 FF0000 0065 00C8 00FF00 0066 00C8 0000FF
//          ^^^^^^^^^^       ^^^^^^^^^^       ^^^^^^^^^^
//          pixel 0          pixel 1          pixel 2
```

### Carrier Selection

AnchorCanvas supports multiple carriers for embedding data. Choose based on your needs:

| Carrier | ID | Max Payload | Max Pixels | Fee Efficiency | Use Case |
|---------|-----|-------------|------------|----------------|----------|
| OP_RETURN | 0 | 80 bytes | ~10 | Standard | Quick single edits |
| Inscription | 1 | ~3.9 MB | ~557K | 75% discount | Large images |
| Witness Data | 4 | ~520 KB | ~74K | 75% discount | Medium batches |

**Payload size calculation:**
```
payload_size = 6 + (4 + num_pixels * 7)
             = 10 + num_pixels * 7

# Examples:
10 pixels:   10 + 70 = 80 bytes   → OP_RETURN works
100 pixels:  10 + 700 = 710 bytes → Need Witness Data
10000 pixels: 10 + 70000 = 70KB   → Witness Data or Inscription
```

### API Integration

To create an AnchorCanvas transaction via the Wallet API:

```bash
curl -X POST http://localhost:8001/wallet/create-message \
  -H "Content-Type: application/json" \
  -d '{
    "kind": 2,
    "body": "00000001006400c8ff0000",
    "body_is_hex": true,
    "carrier": 0,
    "fee_rate": 1
  }'
```

**Request body:**
| Field | Type | Description |
|-------|------|-------------|
| `kind` | number | Must be `2` (State) for AnchorCanvas |
| `body` | string | Hex-encoded pixel payload |
| `body_is_hex` | boolean | Must be `true` |
| `carrier` | number | 0=OP_RETURN, 1=Inscription, 4=WitnessData |
| `fee_rate` | number | Fee rate in sat/vB (default: 1) |

### Reference Implementations

**TypeScript (encode pixels):**
```typescript
function encodePixelPayload(pixels: {x: number, y: number, r: number, g: number, b: number}[]): Uint8Array {
  const buffer = new ArrayBuffer(4 + pixels.length * 7);
  const view = new DataView(buffer);
  
  // Pixel count (big-endian u32)
  view.setUint32(0, pixels.length, false);
  
  // Each pixel
  let offset = 4;
  for (const p of pixels) {
    view.setUint16(offset, p.x, false);      // X
    view.setUint16(offset + 2, p.y, false);  // Y
    view.setUint8(offset + 4, p.r);          // R
    view.setUint8(offset + 5, p.g);          // G
    view.setUint8(offset + 6, p.b);          // B
    offset += 7;
  }
  
  return new Uint8Array(buffer);
}
```

**Rust (decode pixels):**
```rust
fn parse_pixel_payload(body: &[u8]) -> Vec<Pixel> {
    let num_pixels = u32::from_be_bytes([body[0], body[1], body[2], body[3]]) as usize;
    let mut pixels = Vec::with_capacity(num_pixels);
    
    for i in 0..num_pixels {
        let offset = 4 + i * 7;
        let x = u16::from_be_bytes([body[offset], body[offset + 1]]);
        let y = u16::from_be_bytes([body[offset + 2], body[offset + 3]]);
        let r = body[offset + 4];
        let g = body[offset + 5];
        let b = body[offset + 6];
        pixels.push(Pixel { x, y, r, g, b });
    }
    
    pixels
}
```

**Python (encode pixels):**
```python
import struct

def encode_pixel_payload(pixels):
    """Encode pixels to bytes for AnchorCanvas protocol."""
    data = struct.pack('>I', len(pixels))  # Big-endian u32
    for p in pixels:
        data += struct.pack('>HH', p['x'], p['y'])  # Big-endian u16
        data += struct.pack('BBB', p['r'], p['g'], p['b'])  # u8
    return data

# Example
pixels = [{'x': 100, 'y': 200, 'r': 255, 'g': 0, 'b': 0}]
payload = encode_pixel_payload(pixels)
print(payload.hex())  # 00000001006400c8ff0000
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/stats` | GET | Canvas statistics |
| `/canvas` | GET | Full canvas binary data |
| `/canvas/preview` | GET | Canvas preview PNG |
| `/canvas/region` | GET | Region PNG (?x,y,w,h) |
| `/canvas/tile/{z}/{x}/{y}` | GET | Map tile PNG |
| `/pixel/{x}/{y}` | GET | Pixel info & history |
| `/recent` | GET | Recent pixel changes |

## Development

### Backend (Rust)

```bash
cd apps/anchor-canvas/backend
cargo build
cargo run
```

Environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `BITCOIN_RPC_URL` - Bitcoin Core RPC URL
- `BITCOIN_RPC_USER` / `BITCOIN_RPC_PASS` - RPC credentials

### Frontend (Next.js)

```bash
cd apps/anchor-canvas/frontend
npm install
npm run dev
```

Environment variables:
- `NEXT_PUBLIC_API_URL` - AnchorCanvas backend URL (default: http://localhost:3201)
- `NEXT_PUBLIC_WALLET_URL` - Wallet API URL (default: http://localhost:8001)

## How It Works

1. **User selects pixels** on the canvas using paint or brush tool
2. **User chooses carrier** (auto or manual: OP_RETURN, Witness Data, Inscription)
3. **User sets fee rate** (default 1 sat/vB)
4. **Frontend encodes** the pixels into Anchor protocol format
5. **Wallet API creates** a Bitcoin transaction with the selected carrier
6. **Transaction is broadcast** to the Bitcoin network
7. **Pixels appear as "pending"** with pulsing animation
8. **Indexer detects** the transaction (any carrier type) and updates the database
9. **Pending pixels are confirmed** and animation stops
10. **Canvas is updated** for all users to see

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `V` | Select tool |
| `P` | Paint tool |
| `E` | Erase tool |
| `H` | Pan tool |
| `G` | Toggle grid |
| `[` | Decrease brush size |
| `]` | Increase brush size |
| `Esc` | Clear selection |
| `Shift+Drag` | Pan canvas |
| `Scroll` | Zoom in/out |

## Building Your Own Wallet

You can create your own AnchorCanvas-compatible wallet using any Bitcoin library. Here's what you need:

### Minimal Implementation Checklist

1. **Encode pixel data** using the format above (7 bytes per pixel, big-endian)
2. **Wrap in Anchor message** with magic `0xA11C0001` and kind `0x02`
3. **Embed in Bitcoin TX** using OP_RETURN, Witness Data, or Inscription
4. **Broadcast transaction** to the Bitcoin network

### Example: CLI Pixel Painter

```bash
#!/bin/bash
# Paint a single red pixel at (100, 200)

# 1. Encode the payload
PAYLOAD="00000001006400c8ff0000"

# 2. Create transaction via Wallet API
curl -s -X POST http://localhost:8001/wallet/create-message \
  -H "Content-Type: application/json" \
  -d "{\"kind\": 2, \"body\": \"$PAYLOAD\", \"body_is_hex\": true}" | jq .

# 3. Done! The indexer will pick it up automatically
```

### Validation Rules

Your wallet should validate:
- Coordinates: `0 <= x < 4580` and `0 <= y < 4580`
- Colors: `0 <= r, g, b <= 255`
- Payload size matches carrier limits
- Transaction has sufficient fee

Invalid pixels are silently ignored by the indexer.

## License

MIT
