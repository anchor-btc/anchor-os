# Kind 5: GeoMarker

The **GeoMarker** kind is used for embedding geographic coordinates and location-based messages on Bitcoin. It powers applications like Anchor Map.

## Overview

- **Kind**: 5 (`0x05`)
- **Name**: GeoMarker
- **Status**: Extension
- **Max Payload**: 74 bytes (OP_RETURN compatible)

## Payload Format

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | category | u8 | Marker category (0-255) |
| 1-4 | latitude | f32 | Latitude (-90 to 90), big-endian |
| 5-8 | longitude | f32 | Longitude (-180 to 180), big-endian |
| 9 | message_len | u8 | Message length (0-255) |
| 10+ | message | utf8 | Description text |

**Total header: 10 bytes + message**

## TypeScript Interface

```typescript
interface GeoMarkerPayload {
  category: number    // 0-255
  latitude: number    // -90 to 90
  longitude: number   // -180 to 180
  message: string     // max 64 chars for OP_RETURN
}

interface GeoMarkerMessage extends AnchorMessage {
  kind: 5  // GeoMarker
  payload: GeoMarkerPayload
}
```

## Category Definitions

| ID | Category | Description |
|----|----------|-------------|
| 0 | General | Generic location marker |
| 1 | Bitcoin Accepted | Merchant accepting Bitcoin |
| 2 | ATM | Bitcoin ATM location |
| 3 | Meetup | Community gathering point |
| 4 | Landmark | Point of interest |
| 5 | Warning | Hazard or caution |
| 6-255 | Custom | Application-defined |

## Encoding Example

```typescript
const ANCHOR_KIND_GEOMARKER = 5

function encodeGeoMarker(payload: GeoMarkerPayload): Uint8Array {
  const encoder = new TextEncoder()
  const messageBytes = encoder.encode(payload.message)
  const messageLen = Math.min(messageBytes.length, 255)
  
  // Total: 1 + 4 + 4 + 1 + messageLen = 10 + messageLen
  const buffer = new ArrayBuffer(10 + messageLen)
  const view = new DataView(buffer)
  
  let offset = 0
  
  // Category (u8)
  view.setUint8(offset, payload.category)
  offset += 1
  
  // Latitude (f32 big-endian)
  view.setFloat32(offset, payload.latitude, false)
  offset += 4
  
  // Longitude (f32 big-endian)
  view.setFloat32(offset, payload.longitude, false)
  offset += 4
  
  // Message length (u8)
  view.setUint8(offset, messageLen)
  offset += 1
  
  // Message bytes
  const result = new Uint8Array(buffer)
  result.set(messageBytes.slice(0, messageLen), offset)
  
  return result
}
```

## Decoding Example

```typescript
function decodeGeoMarker(bytes: Uint8Array): GeoMarkerPayload | null {
  if (bytes.length < 10) {
    return null
  }
  
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  
  let offset = 0
  
  // Category
  const category = view.getUint8(offset)
  offset += 1
  
  // Latitude
  const latitude = view.getFloat32(offset, false)
  offset += 4
  
  // Longitude
  const longitude = view.getFloat32(offset, false)
  offset += 4
  
  // Message length
  const messageLen = view.getUint8(offset)
  offset += 1
  
  if (bytes.length < 10 + messageLen) {
    return null
  }
  
  // Message
  const decoder = new TextDecoder()
  const message = decoder.decode(bytes.slice(offset, offset + messageLen))
  
  // Validate coordinates
  if (latitude < -90 || latitude > 90 || 
      longitude < -180 || longitude > 180) {
    return null
  }
  
  return { category, latitude, longitude, message }
}
```

## Full Transaction Example

```typescript
import { AnchorWallet, CarrierType } from '@AnchorProtocol/anchor-sdk'

async function createGeoMarker(
  wallet: AnchorWallet,
  lat: number,
  lon: number,
  category: number,
  message: string
): Promise<string> {
  const payload = encodeGeoMarker({
    category,
    latitude: lat,
    longitude: lon,
    message
  })
  
  const anchorMessage = createAnchorMessage({
    kind: 5,
    bodyBytes: payload,
    carrier: CarrierType.OpReturn
  })
  
  const result = await wallet.broadcast(anchorMessage)
  return result.txid
}

// Example: Mark a Bitcoin-accepting coffee shop
const txid = await createGeoMarker(
  wallet,
  37.7749,    // San Francisco latitude
  -122.4194,  // San Francisco longitude
  1,          // Category: Bitcoin Accepted
  'Best coffee in SF! ₿'
)
```

## Size Calculations

For OP_RETURN (80 bytes max):

| Component | Size |
|-----------|------|
| Magic | 4 bytes |
| Kind | 1 byte |
| Anchor count | 1 byte |
| Marker header | 10 bytes |
| **Available for message** | **64 bytes** |

```typescript
function maxOpReturnMessageLength(): number {
  return 64  // 80 - 6 (protocol) - 10 (marker header)
}

function fitsInOpReturn(messageLength: number): boolean {
  return calculatePayloadSize(messageLength) + 6 <= 80
}

function calculatePayloadSize(messageLength: number): number {
  return 10 + Math.min(messageLength, 255)
}
```

## Coordinate Precision

Using float32 provides approximately 7 significant digits:

| Precision | Accuracy |
|-----------|----------|
| 1° | ~111 km |
| 0.1° | ~11 km |
| 0.01° | ~1.1 km |
| 0.001° | ~111 m |
| 0.0001° | ~11 m |
| 0.00001° | ~1.1 m |

Float32 gives ~1 meter precision, sufficient for most mapping applications.

## Map Integration

```typescript
// Load markers for a bounding box
async function loadMarkers(
  indexer: AnchorIndexer,
  bounds: { north: number; south: number; east: number; west: number }
): Promise<GeoMarkerMessage[]> {
  const allMarkers = await indexer.getGeoMarkers()
  
  return allMarkers.filter(m => 
    m.payload.latitude >= bounds.south &&
    m.payload.latitude <= bounds.north &&
    m.payload.longitude >= bounds.west &&
    m.payload.longitude <= bounds.east
  )
}

// Leaflet.js integration
function addMarkersToMap(map: L.Map, markers: GeoMarkerMessage[]) {
  for (const marker of markers) {
    const { latitude, longitude, message, category } = marker.payload
    
    L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup(`
        <b>${getCategoryName(category)}</b><br>
        ${message}<br>
        <small>tx: ${marker.txid.slice(0, 8)}...</small>
      `)
  }
}
```

## Validation

```typescript
function validateGeoMarker(payload: GeoMarkerPayload): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // Coordinate bounds
  if (payload.latitude < -90 || payload.latitude > 90) {
    errors.push('Latitude must be between -90 and 90')
  }
  
  if (payload.longitude < -180 || payload.longitude > 180) {
    errors.push('Longitude must be between -180 and 180')
  }
  
  // Category range
  if (payload.category < 0 || payload.category > 255) {
    errors.push('Category must be 0-255')
  }
  
  // Message length for OP_RETURN
  const msgBytes = new TextEncoder().encode(payload.message)
  if (msgBytes.length > 64) {
    errors.push('Message exceeds 64 bytes for OP_RETURN')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
```

## Use Cases

### Bitcoin Merchant Directory

```typescript
// Register a business location
await createGeoMarker(wallet, lat, lon, 1, 'Pizza Place - BTC accepted!')
```

### Event Coordination

```typescript
// Mark a meetup location
await createGeoMarker(wallet, lat, lon, 3, 'Bitcoin meetup - 7pm Friday')
```

### Travel Log

```typescript
// Document journey on-chain
const locations = [
  { lat: 35.6762, lon: 139.6503, msg: 'Tokyo Tower' },
  { lat: 35.7148, lon: 139.7967, msg: 'Senso-ji Temple' }
]

for (const loc of locations) {
  await createGeoMarker(wallet, loc.lat, loc.lon, 4, loc.msg)
}
```

## See Also

- [Text (Kind 1)](/kinds/text) - Add detailed descriptions
- [Anchor Map](https://map.anchor.dev) - Live map application
- [Carrier Types](/protocol/carriers) - Embedding options



