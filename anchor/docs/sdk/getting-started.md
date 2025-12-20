# Getting Started

The Anchor SDK provides everything you need to create, parse, and broadcast Anchor protocol messages on Bitcoin.

## Quick Start

### Install the SDK

```bash
npm install @AnchorProtocol/anchor-sdk
```

### Create Your First Message

```typescript
import { 
  createMessage, 
  AnchorKind, 
  CarrierType 
} from '@AnchorProtocol/anchor-sdk'

// Create a simple text message
const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Hello, Bitcoin!'
})

console.log('Message bytes:', message)
// Uint8Array(22) [161, 28, 0, 1, 1, 0, 72, 101, 108, 108, 111, ...]
```

### Broadcast to Bitcoin

```typescript
import { AnchorWallet } from '@AnchorProtocol/anchor-sdk'

// Configure wallet
const wallet = new AnchorWallet({
  rpcUrl: 'http://localhost:8332',
  rpcUser: 'bitcoin',
  rpcPassword: 'password',
  network: 'regtest'
})

// Broadcast the message
const result = await wallet.broadcast(message)

console.log('Transaction ID:', result.txid)
console.log('Output index:', result.vout)
```

## Core Concepts

### Messages

Every Anchor message consists of:

- **Magic bytes**: Protocol identifier (`0xA11C0001`)
- **Kind**: Message type (0-255)
- **Anchors**: References to parent messages
- **Body**: Kind-specific payload

```typescript
interface AnchorMessage {
  kind: number
  anchors: Anchor[]
  body: Uint8Array
}
```

### Carriers

Choose how to embed data in Bitcoin transactions:

| Carrier | Max Size | Best For |
|---------|----------|----------|
| OP_RETURN | 80 bytes | Short messages, hashes |
| Witness Data | ~4 MB | Large payloads, images |
| Inscription | ~4 MB | Ordinals compatibility |
| Stamps | ~8 KB | Permanent storage |

```typescript
const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Hello!',
  carrier: CarrierType.OpReturn  // Specify carrier
})
```

### Anchors (Threading)

Reference parent messages to create threads:

```typescript
// Reply to an existing message
const reply = createMessage({
  kind: AnchorKind.Text,
  body: 'Great point!',
  anchors: [
    { txid: 'abc123...', vout: 0 }
  ]
})
```

## Next Steps

<div class="tip custom-block" style="padding-top: 8px">

**Ready to dive deeper?**

- [Installation](/sdk/installation) - Detailed setup guide
- [Encoding Messages](/sdk/encoding) - Create any message type
- [Parsing Messages](/sdk/parsing) - Read on-chain data
- [Wallet Integration](/sdk/wallet) - Transaction management
- [API Reference](/sdk/api-reference) - Complete API docs

</div>

## Example Application

Here's a complete example that creates and reads messages:

```typescript
import {
  createMessage,
  parseMessage,
  AnchorKind,
  AnchorWallet,
  CarrierType
} from '@AnchorProtocol/anchor-sdk'

async function main() {
  // 1. Set up wallet
  const wallet = new AnchorWallet({
    rpcUrl: process.env.BITCOIN_RPC_URL!,
    rpcUser: process.env.BITCOIN_RPC_USER!,
    rpcPassword: process.env.BITCOIN_RPC_PASSWORD!,
    network: 'regtest'
  })

  // 2. Create a message
  const message = createMessage({
    kind: AnchorKind.Text,
    body: 'My first Anchor message!',
    carrier: CarrierType.OpReturn
  })

  // 3. Broadcast to Bitcoin
  const result = await wallet.broadcast(message)
  console.log('Message broadcast:', result.txid)

  // 4. Read it back
  const tx = await wallet.getTransaction(result.txid)
  const parsed = parseMessage(tx.outputs[result.vout].data)
  
  if (parsed.kind === AnchorKind.Text) {
    const text = new TextDecoder().decode(parsed.body)
    console.log('Message text:', text)
  }
}

main().catch(console.error)
```

## Requirements

- **Node.js** 18+ or modern browser
- **Bitcoin node** (for broadcasting)
  - Bitcoin Core, or
  - Electrum server
- **TypeScript** 5+ (recommended)

## Browser Usage

The SDK works in browsers with bundlers like Vite or webpack:

```typescript
// vite.config.ts
export default {
  define: {
    'process.env': {}
  }
}
```

```typescript
// In your app
import { createMessage, AnchorKind } from '@AnchorProtocol/anchor-sdk'

const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Hello from the browser!'
})
```

## See Also

- [Protocol Overview](/protocol/overview) - Understand the protocol
- [Kinds Reference](/kinds/) - Message type specifications
- [Examples](/examples/create-message) - More code samples

