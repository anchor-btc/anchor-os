# Create a Message

This example demonstrates how to create and broadcast different types of Anchor messages to Bitcoin.

## Prerequisites

```bash
npm install @AnchorProtocol/anchor-sdk
```

## Simple Text Message

The most basic Anchor message is a text message:

```typescript
import { 
  createMessage, 
  AnchorKind, 
  AnchorWallet,
  CarrierType 
} from '@AnchorProtocol/anchor-sdk'

async function createTextMessage() {
  // 1. Configure wallet
  const wallet = new AnchorWallet({
    rpcUrl: 'http://localhost:18443',  // regtest
    rpcUser: 'bitcoin',
    rpcPassword: 'password',
    network: 'regtest'
  })

  // 2. Create the message
  const message = createMessage({
    kind: AnchorKind.Text,
    body: 'Hello, Bitcoin! This is my first Anchor message.'
  })

  // 3. Broadcast to Bitcoin
  const result = await wallet.broadcast(message)

  console.log('Message broadcast successfully!')
  console.log('Transaction ID:', result.txid)
  console.log('Output index:', result.vout)
  console.log('Carrier:', result.carrier)
  
  return result.txid
}

createTextMessage().catch(console.error)
```

## Binary/Generic Message

For arbitrary binary data:

```typescript
import { createMessage, AnchorKind } from '@AnchorProtocol/anchor-sdk'

// Create a SHA-256 hash message
async function createHashMessage(data: string) {
  // Hash the data
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(data)
  )
  const hashBytes = new Uint8Array(hashBuffer)

  // Create generic message with hash
  const message = createMessage({
    kind: AnchorKind.Generic,
    bodyBytes: hashBytes
  })

  return message
}
```

## DNS Registration

Register a `.bit` domain:

```typescript
import { 
  encodeDnsPayload, 
  DnsOperation, 
  RecordType 
} from '@AnchorProtocol/anchor-sdk/dns'

async function registerDomain(name: string, ipAddress: string) {
  const wallet = new AnchorWallet(config)

  // Encode DNS payload
  const dnsPayload = encodeDnsPayload({
    operation: DnsOperation.REGISTER,
    name: `${name}.bit`,
    records: [
      { type: RecordType.A, ttl: 3600, value: ipAddress },
      { type: RecordType.TXT, ttl: 3600, value: 'Powered by Anchor Protocol' }
    ]
  })

  // Create Anchor message
  const message = createMessage({
    kind: 10,  // DNS kind
    bodyBytes: dnsPayload
  })

  // Broadcast
  const result = await wallet.broadcast(message)
  
  console.log(`Domain ${name}.bit registered!`)
  console.log('Registration TX:', result.txid)
  
  return result.txid
}

registerDomain('mysite', '192.168.1.100').catch(console.error)
```

## Token Deployment

Create a new fungible token:

```typescript
import { 
  encodeDeployPayload,
  DeployFlags 
} from '@AnchorProtocol/anchor-sdk/token'

async function deployToken(
  ticker: string,
  maxSupply: bigint,
  decimals = 8
) {
  const wallet = new AnchorWallet(config)

  // Encode token deployment
  const deployPayload = encodeDeployPayload({
    ticker: ticker.toUpperCase(),
    decimals,
    maxSupply,
    mintLimit: maxSupply / 100n,  // 1% per mint
    flags: DeployFlags.OPEN_MINT | DeployFlags.BURNABLE
  })

  const message = createMessage({
    kind: 20,  // Token kind
    bodyBytes: deployPayload
  })

  const result = await wallet.broadcast(message)
  
  // Token ID = block height of confirmation
  console.log(`Token ${ticker} deployed!`)
  console.log('Deploy TX:', result.txid)
  console.log('Wait for confirmation to get token ID (block height)')
  
  return result.txid
}

// Deploy a token with 21 million supply
deployToken('SATS', 21_000_000_00000000n, 8).catch(console.error)
```

## Proof of Existence

Timestamp a document:

```typescript
import { 
  encodeProofPayload,
  ProofOperation,
  HashAlgorithm 
} from '@AnchorProtocol/anchor-sdk/proof'

async function createProof(file: File) {
  const wallet = new AnchorWallet(config)

  // Hash the file
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hash = new Uint8Array(hashBuffer)

  // Create proof payload
  const proofPayload = encodeProofPayload({
    operation: ProofOperation.STAMP,
    algorithm: HashAlgorithm.SHA256,
    hash,
    metadata: {
      filename: file.name,
      mimeType: file.type,
      fileSize: file.size,
      description: 'Document notarized via Anchor Protocol'
    }
  })

  const message = createMessage({
    kind: 11,  // Proof kind
    bodyBytes: proofPayload
  })

  const result = await wallet.broadcast(message)
  
  console.log('Document timestamped!')
  console.log('Proof TX:', result.txid)
  console.log('SHA-256:', bytesToHex(hash))
  
  return {
    txid: result.txid,
    hash: bytesToHex(hash)
  }
}
```

## Geographic Marker

Add a location to Anchor Map:

```typescript
import { encodeGeoMarker } from '@AnchorProtocol/anchor-sdk/geo'

async function createMarker(
  lat: number,
  lon: number,
  category: number,
  message: string
) {
  const wallet = new AnchorWallet(config)

  const markerPayload = encodeGeoMarker({
    category,
    latitude: lat,
    longitude: lon,
    message
  })

  const anchorMessage = createMessage({
    kind: 5,  // GeoMarker kind
    bodyBytes: markerPayload
  })

  const result = await wallet.broadcast(anchorMessage)
  
  console.log(`Marker created at (${lat}, ${lon})`)
  console.log('TX:', result.txid)
  
  return result.txid
}

// Mark a Bitcoin-accepting business
createMarker(
  37.7749,     // San Francisco
  -122.4194,
  1,           // Category: Bitcoin Accepted
  'Great coffee shop!'
).catch(console.error)
```

## Pixel Canvas Update

Paint pixels on Anchor Pixel:

```typescript
import { encodePixelPayload } from '@AnchorProtocol/anchor-sdk/pixel'

async function paintPixels(pixels: Array<{
  x: number
  y: number
  r: number
  g: number
  b: number
}>) {
  const wallet = new AnchorWallet(config)

  const pixelPayload = encodePixelPayload(pixels)

  const message = createMessage({
    kind: 2,  // State kind
    bodyBytes: pixelPayload
  })

  const result = await wallet.broadcast(message)
  
  console.log(`Painted ${pixels.length} pixels!`)
  console.log('TX:', result.txid)
  
  return result.txid
}

// Paint a small pattern
paintPixels([
  { x: 100, y: 100, r: 255, g: 0, b: 0 },    // Red
  { x: 101, y: 100, r: 255, g: 165, b: 0 },  // Orange
  { x: 102, y: 100, r: 255, g: 255, b: 0 },  // Yellow
  { x: 103, y: 100, r: 0, g: 255, b: 0 },    // Green
  { x: 104, y: 100, r: 0, g: 0, b: 255 },    // Blue
]).catch(console.error)
```

## Choosing the Right Carrier

```typescript
import { 
  createMessage, 
  CarrierType,
  getCarrierInfo 
} from '@AnchorProtocol/anchor-sdk'

function chooseCarrier(payloadSize: number): CarrierType {
  // OP_RETURN for small messages (< 70 bytes after header)
  if (payloadSize < 70) {
    return CarrierType.OpReturn
  }
  
  // Witness Data for larger payloads (75% fee discount)
  if (payloadSize < 4_000_000) {
    return CarrierType.WitnessData
  }
  
  throw new Error('Payload too large')
}

// Example with explicit carrier
const largeMessage = createMessage({
  kind: AnchorKind.Text,
  body: 'A'.repeat(1000),  // 1000 characters
  carrier: CarrierType.WitnessData  // Required for large messages
})
```

## Error Handling

```typescript
import { 
  AnchorWallet, 
  AnchorError, 
  AnchorErrorCode,
  createMessage 
} from '@AnchorProtocol/anchor-sdk'

async function safeCreateMessage(text: string) {
  const wallet = new AnchorWallet(config)

  try {
    // Check balance first
    const balance = await wallet.getBalance()
    if (balance.confirmed < 10000) {
      throw new Error('Insufficient balance (need at least 10,000 sats)')
    }

    const message = createMessage({
      kind: AnchorKind.Text,
      body: text
    })

    const result = await wallet.broadcast(message)
    return { success: true, txid: result.txid }
    
  } catch (error) {
    if (error instanceof AnchorError) {
      switch (error.code) {
        case AnchorErrorCode.MessageTooLarge:
          return { success: false, error: 'Message too large for carrier' }
        case AnchorErrorCode.InsufficientFunds:
          return { success: false, error: 'Not enough funds' }
        case AnchorErrorCode.RpcError:
          return { success: false, error: 'Bitcoin node error' }
        default:
          return { success: false, error: error.message }
      }
    }
    throw error
  }
}
```

## Next Steps

- [Reply to a Message](/examples/reply-to-message) - Create threaded conversations
- [Parse a Transaction](/examples/parse-transaction) - Read on-chain messages
- [SDK Reference](/sdk/api-reference) - Complete API documentation

