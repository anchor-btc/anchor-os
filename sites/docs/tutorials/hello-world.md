# Hello World

Create and broadcast your first Anchor message.

## Setup

```bash
npm install @AnchorProtocol/anchor-sdk
```

## Code

```typescript
import { AnchorWallet, createMessage, AnchorKind } from '@AnchorProtocol/anchor-sdk'

// 1. Connect to Bitcoin
const wallet = new AnchorWallet({
  rpcUrl: 'http://localhost:18443',
  rpcUser: 'bitcoin',
  rpcPassword: 'password',
  network: 'regtest'
})

// 2. Create message
const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Hello, Bitcoin!'
})

// 3. Broadcast
const result = await wallet.broadcast(message)
console.log('TX:', result.txid)
```

## Verify

```typescript
const tx = await wallet.getTransaction(result.txid)
const parsed = parseMessage(tx.outputs[result.vout].data)
console.log('Message:', new TextDecoder().decode(parsed.body))
```

## Next

- [Threaded Messages](/tutorials/threaded-messages) - Create replies
- [SDK Reference](/sdk/) - Full API
