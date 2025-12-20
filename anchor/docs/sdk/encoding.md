# Encoding Messages

The SDK provides functions to encode Anchor protocol messages for any supported kind.

## Basic Encoding

### Text Messages

```typescript
import { createMessage, AnchorKind } from '@AnchorProtocol/anchor-sdk'

const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Hello, Bitcoin!'
})

// Returns Uint8Array ready for embedding
console.log(message)
// Uint8Array [161, 28, 0, 1, 1, 0, 72, 101, 108, 108, 111, ...]
```

### Generic Binary

```typescript
const message = createMessage({
  kind: AnchorKind.Generic,
  bodyBytes: new Uint8Array([0x01, 0x02, 0x03, 0x04])
})
```

### With Anchors (Reply)

```typescript
const reply = createMessage({
  kind: AnchorKind.Text,
  body: 'Great point!',
  anchors: [
    { txid: 'abc123def456789...', vout: 0 }
  ]
})
```

## Manual Encoding

For full control, use the low-level encoder:

```typescript
import { 
  ANCHOR_MAGIC, 
  encodeMessage 
} from '@AnchorProtocol/anchor-sdk'

function encodeManual(
  kind: number,
  anchors: Anchor[],
  body: Uint8Array
): Uint8Array {
  const anchorBytes = anchors.length * 9
  const totalSize = 4 + 1 + 1 + anchorBytes + body.length
  const message = new Uint8Array(totalSize)
  
  let offset = 0
  
  // Magic bytes
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

## Kind-Specific Encoders

### DNS Encoder

```typescript
import { 
  encodeDnsPayload, 
  DnsOperation, 
  RecordType 
} from '@AnchorProtocol/anchor-sdk/dns'

const dnsPayload = encodeDnsPayload({
  operation: DnsOperation.REGISTER,
  name: 'example.bit',
  records: [
    { type: RecordType.A, ttl: 3600, value: '192.168.1.1' },
    { type: RecordType.TXT, ttl: 3600, value: 'Hello World' }
  ]
})

const message = createMessage({
  kind: 10,  // DNS
  bodyBytes: dnsPayload
})
```

### Token Encoder

```typescript
import { 
  encodeDeployPayload,
  encodeMintPayload,
  encodeTransferPayload,
  TokenOperation,
  DeployFlags
} from '@AnchorProtocol/anchor-sdk/token'

// Deploy a new token
const deployPayload = encodeDeployPayload({
  ticker: 'SATS',
  decimals: 8,
  maxSupply: 21_000_000_00000000n,
  mintLimit: 210_000_00000000n,
  flags: DeployFlags.OPEN_MINT | DeployFlags.BURNABLE
})

const deployMessage = createMessage({
  kind: 20,
  bodyBytes: deployPayload
})

// Mint tokens
const mintPayload = encodeMintPayload({
  tokenId: 800000n,  // Block height as token ID
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

### Proof Encoder

```typescript
import { 
  encodeProofPayload,
  ProofOperation,
  HashAlgorithm
} from '@AnchorProtocol/anchor-sdk/proof'

// Hash a file
const fileData = await file.arrayBuffer()
const hashBuffer = await crypto.subtle.digest('SHA-256', fileData)
const hash = new Uint8Array(hashBuffer)

// Create proof
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

### GeoMarker Encoder

```typescript
import { encodeGeoMarker } from '@AnchorProtocol/anchor-sdk/geo'

const markerPayload = encodeGeoMarker({
  category: 1,  // Bitcoin Accepted
  latitude: 37.7749,
  longitude: -122.4194,
  message: 'Best coffee in SF!'
})

const message = createMessage({
  kind: 5,
  bodyBytes: markerPayload
})
```

### Pixel/State Encoder

```typescript
import { encodePixelPayload } from '@AnchorProtocol/anchor-sdk/pixel'

const pixels = [
  { x: 100, y: 100, r: 255, g: 0, b: 0 },
  { x: 101, y: 100, r: 0, g: 255, b: 0 },
  { x: 102, y: 100, r: 0, g: 0, b: 255 }
]

const pixelPayload = encodePixelPayload(pixels)

const message = createMessage({
  kind: 2,  // State
  bodyBytes: pixelPayload
})
```

## Carrier Selection

### Auto-select Best Carrier

```typescript
import { selectCarrier, CarrierType } from '@AnchorProtocol/anchor-sdk'

const payloadSize = 1000  // bytes

// Auto-select based on size
const carrier = selectCarrier(payloadSize)
// Returns CarrierType.WitnessData for payloads > 80 bytes
```

### Force Specific Carrier

```typescript
const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Hello!',
  carrier: CarrierType.OpReturn  // Force OP_RETURN
})
```

### Carrier Info

```typescript
import { getCarrierInfo, CarrierType } from '@AnchorProtocol/anchor-sdk'

const info = getCarrierInfo(CarrierType.OpReturn)
// {
//   type: 0,
//   name: 'op_return',
//   maxSize: 80,
//   isPrunable: true,
//   utxoImpact: false,
//   witnessDiscount: false,
//   status: 'active'
// }
```

## Anchor Creation

### From Transaction ID

```typescript
import { createAnchor } from '@AnchorProtocol/anchor-sdk'

const anchor = createAnchor(
  'abc123def456789012345678901234567890123456789012345678901234abcd',
  0  // output index
)

// anchor = {
//   txidPrefix: Uint8Array(8) [first 8 bytes of reversed txid],
//   vout: 0
// }
```

### Multiple Anchors

```typescript
const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Replying to multiple messages',
  anchors: [
    { txid: 'abc123...', vout: 0 },
    { txid: 'def456...', vout: 1 },
    { txid: 'ghi789...', vout: 0 }
  ]
})
```

## Size Calculations

### Check OP_RETURN Fit

```typescript
import { fitsInOpReturn } from '@AnchorProtocol/anchor-sdk'

const text = 'A'.repeat(100)
const fits = fitsInOpReturn(AnchorKind.Text, text)
// false - exceeds 80 bytes

const shortText = 'Hello!'
const shortFits = fitsInOpReturn(AnchorKind.Text, shortText)
// true - fits in OP_RETURN
```

### Calculate Payload Size

```typescript
import { calculateMessageSize } from '@AnchorProtocol/anchor-sdk'

const size = calculateMessageSize({
  kind: AnchorKind.Text,
  body: 'Hello, World!',
  anchors: [{ txid: 'abc...', vout: 0 }]
})
// Returns total bytes including header
```

## Hex Utilities

```typescript
import { bytesToHex, hexToBytes } from '@AnchorProtocol/anchor-sdk'

// Uint8Array to hex string
const hex = bytesToHex(new Uint8Array([0xa1, 0x1c, 0x00, 0x01]))
// 'a11c0001'

// Hex string to Uint8Array
const bytes = hexToBytes('a11c0001')
// Uint8Array [161, 28, 0, 1]
```

## Varint Encoding

For compact number encoding (used in Token kind):

```typescript
import { encodeVarint, decodeVarint } from '@AnchorProtocol/anchor-sdk'

// Encode
const encoded = encodeVarint(1000000n)
// Uint8Array [254, 64, 66, 15, 0] (5 bytes for u32)

// Decode
const [value, bytesRead] = decodeVarint(encoded, 0)
// value = 1000000n, bytesRead = 5
```

## Error Handling

```typescript
import { 
  createMessage, 
  AnchorError, 
  AnchorErrorCode 
} from '@AnchorProtocol/anchor-sdk'

try {
  const message = createMessage({
    kind: AnchorKind.Text,
    body: 'A'.repeat(1000),
    carrier: CarrierType.OpReturn  // Too large!
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
      default:
        console.log('Anchor error:', error.message)
    }
  }
}
```

## Best Practices

1. **Always check size** before choosing carrier
2. **Use kind-specific encoders** for type safety
3. **Validate input** before encoding
4. **Handle errors** gracefully
5. **Test with regtest** before mainnet

## See Also

- [Parsing Messages](/sdk/parsing) - Decode messages
- [Wallet Integration](/sdk/wallet) - Broadcast transactions
- [Kinds Reference](/kinds/) - Payload formats

