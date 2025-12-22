# Parsing Messages

The SDK provides functions to parse Anchor protocol messages from raw bytes or Bitcoin transactions.

## Basic Parsing

### Parse Raw Bytes

```typescript
import { parseMessage, AnchorKind } from '@AnchorProtocol/anchor-sdk'

const bytes = hexToBytes('a11c00010100486565c6c6f21')
const message = parseMessage(bytes)

if (message) {
  console.log('Kind:', message.kind)
  console.log('Anchors:', message.anchors.length)
  console.log('Body:', message.body)
}
```

### Parse Text Message

```typescript
import { parseMessage, AnchorKind } from '@AnchorProtocol/anchor-sdk'

const message = parseMessage(bytes)

if (message && message.kind === AnchorKind.Text) {
  const text = new TextDecoder().decode(message.body)
  console.log('Text:', text)
}
```

### Type-Safe Parsing

```typescript
import { 
  parseMessage, 
  isTextMessage, 
  TextMessage 
} from '@AnchorProtocol/anchor-sdk'

const message = parseMessage(bytes)

if (isTextMessage(message)) {
  // TypeScript knows this is TextMessage
  console.log('Text:', message.text)
}
```

## Validation

### Check Magic Bytes

```typescript
import { 
  isAnchorMessage, 
  ANCHOR_MAGIC 
} from '@AnchorProtocol/anchor-sdk'

function isAnchorMessage(bytes: Uint8Array): boolean {
  if (bytes.length < 6) return false
  
  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== ANCHOR_MAGIC[i]) return false
  }
  
  return true
}
```

### Validate Structure

```typescript
import { validateMessage } from '@AnchorProtocol/anchor-sdk'

const result = validateMessage(bytes)

if (result.valid) {
  console.log('Valid Anchor message')
} else {
  console.log('Invalid:', result.error)
  // "INVALID_MAGIC" | "PAYLOAD_TOO_SHORT" | "TRUNCATED_ANCHORS"
}
```

## Kind-Specific Parsers

### Parse DNS Messages

```typescript
import { decodeDnsPayload, DnsPayload } from '@AnchorProtocol/anchor-sdk/dns'

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

### Parse Token Messages

```typescript
import { 
  decodeTokenPayload, 
  TokenOperation 
} from '@AnchorProtocol/anchor-sdk/token'

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

### Parse Proof Messages

```typescript
import { 
  decodeProofPayload, 
  HashAlgorithm,
  bytesToHex 
} from '@AnchorProtocol/anchor-sdk/proof'

const message = parseMessage(bytes)

if (message && message.kind === 11) {
  const proof = decodeProofPayload(message.body)
  
  if (proof) {
    console.log('Hash:', bytesToHex(proof.hash))
    console.log('Algorithm:', 
      proof.algorithm === HashAlgorithm.SHA256 ? 'SHA-256' : 'SHA-512'
    )
    console.log('Filename:', proof.metadata?.filename)
  }
}
```

### Parse GeoMarker Messages

```typescript
import { decodeGeoMarker } from '@AnchorProtocol/anchor-sdk/geo'

const message = parseMessage(bytes)

if (message && message.kind === 5) {
  const marker = decodeGeoMarker(message.body)
  
  if (marker) {
    console.log('Location:', marker.latitude, marker.longitude)
    console.log('Message:', marker.message)
  }
}
```

### Parse Pixel/State Messages

```typescript
import { decodePixelPayload } from '@AnchorProtocol/anchor-sdk/pixel'

const message = parseMessage(bytes)

if (message && message.kind === 2) {
  const pixels = decodePixelPayload(message.body)
  
  for (const pixel of pixels) {
    console.log(`Pixel at (${pixel.x}, ${pixel.y}): rgb(${pixel.r},${pixel.g},${pixel.b})`)
  }
}
```

## Parsing from Transactions

### Extract from OP_RETURN

```typescript
import { extractAnchorMessage } from '@AnchorProtocol/anchor-sdk'

async function parseTransaction(txid: string, indexer: AnchorIndexer) {
  const tx = await indexer.getTransaction(txid)
  
  for (let vout = 0; vout < tx.vout.length; vout++) {
    const output = tx.vout[vout]
    
    // Check for OP_RETURN
    if (output.scriptPubKey.type === 'nulldata') {
      const data = hexToBytes(output.scriptPubKey.hex.slice(4)) // Skip OP_RETURN opcode
      const message = parseMessage(data)
      
      if (message) {
        return { message, vout }
      }
    }
  }
  
  return null
}
```

### Extract from Witness

```typescript
import { extractFromWitness } from '@AnchorProtocol/anchor-sdk'

function parseWitnessData(witness: string[]): Uint8Array | null {
  for (const item of witness) {
    const bytes = hexToBytes(item)
    
    if (isAnchorMessage(bytes)) {
      return bytes
    }
  }
  
  return null
}
```

## Anchor Resolution

### Resolve Parent References

```typescript
import { resolveAnchor, AnchorResolution } from '@AnchorProtocol/anchor-sdk'

async function resolveAnchors(
  message: AnchorMessage,
  indexer: AnchorIndexer
): Promise<Map<number, AnchorResolution>> {
  const results = new Map()
  
  for (let i = 0; i < message.anchors.length; i++) {
    const anchor = message.anchors[i]
    const resolution = await resolveAnchor(
      anchor.txidPrefix,
      anchor.vout,
      indexer
    )
    results.set(i, resolution)
  }
  
  return results
}

// Usage
const resolutions = await resolveAnchors(message, indexer)

for (const [index, resolution] of resolutions) {
  if (resolution.status === 'resolved') {
    console.log(`Anchor ${index} -> ${resolution.txid}`)
  } else if (resolution.status === 'orphan') {
    console.log(`Anchor ${index} is orphan`)
  } else {
    console.log(`Anchor ${index} is ambiguous:`, resolution.candidates)
  }
}
```

## Batch Parsing

### Parse Multiple Messages

```typescript
import { parseMessage } from '@AnchorProtocol/anchor-sdk'

async function parseBlock(blockHeight: number, indexer: AnchorIndexer) {
  const txids = await indexer.getBlockTransactions(blockHeight)
  const messages: Array<{ txid: string; message: AnchorMessage }> = []
  
  for (const txid of txids) {
    const tx = await indexer.getTransaction(txid)
    
    for (const output of tx.vout) {
      if (output.scriptPubKey.type === 'nulldata') {
        const data = extractOpReturnData(output)
        const message = parseMessage(data)
        
        if (message) {
          messages.push({ txid, message })
        }
      }
    }
  }
  
  return messages
}
```

### Stream Processing

```typescript
import { parseMessage, AnchorKind } from '@AnchorProtocol/anchor-sdk'

async function* streamMessages(
  startBlock: number,
  endBlock: number,
  indexer: AnchorIndexer
): AsyncGenerator<{ txid: string; block: number; message: AnchorMessage }> {
  for (let block = startBlock; block <= endBlock; block++) {
    const messages = await parseBlock(block, indexer)
    
    for (const { txid, message } of messages) {
      yield { txid, block, message }
    }
  }
}

// Usage
for await (const { txid, block, message } of streamMessages(800000, 800100, indexer)) {
  console.log(`Block ${block}: ${txid} - Kind ${message.kind}`)
}
```

## Error Handling

```typescript
import { 
  parseMessage, 
  AnchorError, 
  AnchorErrorCode 
} from '@AnchorProtocol/anchor-sdk'

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

## Type Definitions

```typescript
// Core message structure
interface AnchorMessage {
  kind: number
  anchors: Anchor[]
  body: Uint8Array
}

// Anchor reference
interface Anchor {
  txidPrefix: Uint8Array  // 8 bytes
  vout: number
}

// Resolution result
type AnchorResolution =
  | { status: 'resolved'; txid: string }
  | { status: 'orphan' }
  | { status: 'ambiguous'; candidates: string[] }

// Kind-specific message types
interface TextMessage extends AnchorMessage {
  kind: 1
  text: string
}

interface TokenMessage extends AnchorMessage {
  kind: 20
  operation: TokenOperation
  data: DeployPayload | MintPayload | TransferPayload | BurnPayload
}
```

## Best Practices

1. **Always validate** before parsing untrusted data
2. **Handle missing fields** gracefully
3. **Use type guards** for kind-specific logic
4. **Cache resolutions** for repeated anchor lookups
5. **Stream large datasets** to avoid memory issues

## See Also

- [Encoding Messages](/sdk/encoding) - Create messages
- [Wallet Integration](/sdk/wallet) - Transaction handling
- [Kinds Reference](/kinds/) - Payload formats



