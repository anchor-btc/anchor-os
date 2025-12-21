# Kind 0: Generic

The **Generic** kind is the base message type for raw binary data. Any data that doesn't fit a specific kind can be embedded as generic.

## Overview

- **Kind**: 0 (`0x00`)
- **Name**: Generic
- **Status**: Core
- **Max Payload**: Carrier-dependent

Generic messages carry arbitrary binary data without any structural interpretation. They serve as:

- Base type for unknown or custom data
- Fallback for parsing unrecognized kinds
- Container for application-specific formats

## Payload Format

The body of a Generic message is interpreted as raw bytes with no structure:

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0..n | data | bytes | Raw binary data |

## TypeScript Interface

```typescript
import { AnchorKind, AnchorMessage } from '@AnchorProtocol/anchor-sdk'

interface GenericMessage extends AnchorMessage {
  kind: AnchorKind.Generic  // 0
  body: Uint8Array
}
```

## Encoding Example

```typescript
import { createMessage, AnchorKind } from '@AnchorProtocol/anchor-sdk'

// Embed arbitrary data
const customData = new Uint8Array([0x01, 0x02, 0x03, 0x04])

const message = createMessage({
  kind: AnchorKind.Generic,
  bodyBytes: customData
})

// Result: A11C0001 00 00 01020304
//         magic    kind anchors data
```

## Decoding Example

```typescript
import { parseMessage } from '@AnchorProtocol/anchor-sdk'

const bytes = hexToBytes('A11C00010000DEADBEEF')
const message = parseMessage(bytes)

console.log(message.kind)  // 0 (Generic)
console.log(message.body)  // Uint8Array [0xDE, 0xAD, 0xBE, 0xEF]
```

## Full Transaction Example

```typescript
import { 
  createMessage, 
  AnchorKind, 
  CarrierType 
} from '@AnchorProtocol/anchor-sdk'

// Store a SHA-256 hash
const hash = await crypto.subtle.digest(
  'SHA-256',
  new TextEncoder().encode('Hello, World!')
)

const message = createMessage({
  kind: AnchorKind.Generic,
  bodyBytes: new Uint8Array(hash),
  carrier: CarrierType.OpReturn
})

// Create and broadcast transaction
const txResult = await wallet.createAndBroadcast(message)
console.log('Stored at:', txResult.txid)
```

## Use Cases

### Custom Application Data

```typescript
// Define your own structure
interface MyAppData {
  version: number
  timestamp: number
  payload: Uint8Array
}

function encodeMyAppData(data: MyAppData): Uint8Array {
  const buffer = new ArrayBuffer(9 + data.payload.length)
  const view = new DataView(buffer)
  
  view.setUint8(0, data.version)
  view.setBigUint64(1, BigInt(data.timestamp), false)
  
  const result = new Uint8Array(buffer)
  result.set(data.payload, 9)
  
  return result
}

// Embed as Generic message
const message = createMessage({
  kind: AnchorKind.Generic,
  bodyBytes: encodeMyAppData({
    version: 1,
    timestamp: Date.now(),
    payload: new Uint8Array([1, 2, 3])
  })
})
```

### Forwarding Unknown Data

```typescript
// When parsing, unknown kinds are treated as generic
function handleMessage(bytes: Uint8Array) {
  const msg = parseMessage(bytes)
  
  if (msg.kind === AnchorKind.Generic || msg.kind >= 100) {
    // Store raw bytes for future parsing
    saveRawMessage(msg.body)
  }
}
```

## Best Practices

1. **Document your format**: If using Generic for custom data, document the structure
2. **Consider a custom kind**: For repeated use, define a proper kind (200-255)
3. **Version your payloads**: Include a version byte for future compatibility
4. **Validate on decode**: Always validate data structure when parsing

## See Also

- [Text (Kind 1)](/kinds/text) - For human-readable text
- [Custom Kinds](/kinds/#custom-kinds) - Define your own kind
- [Message Format](/protocol/message-format) - Protocol structure



