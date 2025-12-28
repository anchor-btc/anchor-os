# Quickstart

Get your first message on Bitcoin in under 5 minutes.

::: tip 🧪 Regtest Playground
Anchor Protocol is currently available on **regtest only** in Anchor OS. This is our playground phase where we're refining the protocol based on developer feedback. Everything is fully functional — you can build and test all features right now! The roadmap is: **Regtest** → **Testnet** → **Mainnet**.
:::

## 1. Install the SDK

```bash
npm install @AnchorProtocol/anchor-sdk
```

## 2. Create a Message

```typescript
import { createMessage, AnchorKind } from '@AnchorProtocol/anchor-sdk'

const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Hello, Bitcoin!'
})

console.log('Message created:', message.length, 'bytes')
```

## 3. Set Up a Wallet

Connect to a Bitcoin node (regtest for development):

```typescript
import { AnchorWallet } from '@AnchorProtocol/anchor-sdk'

const wallet = new AnchorWallet({
  rpcUrl: 'http://localhost:18443',
  rpcUser: 'bitcoin',
  rpcPassword: 'password',
  network: 'regtest'
})
```

## 4. Broadcast to Bitcoin

```typescript
const result = await wallet.broadcast(message)

console.log('Transaction ID:', result.txid)
console.log('Output index:', result.vout)
```

## 5. Read It Back

```typescript
import { parseMessage } from '@AnchorProtocol/anchor-sdk'

const tx = await wallet.getTransaction(result.txid)
const parsed = parseMessage(tx.outputs[result.vout].data)

if (parsed.kind === AnchorKind.Text) {
  const text = new TextDecoder().decode(parsed.body)
  console.log('Message:', text)
}
```

## Complete Example

```typescript
import {
  createMessage,
  parseMessage,
  AnchorKind,
  AnchorWallet
} from '@AnchorProtocol/anchor-sdk'

async function main() {
  // Connect to Bitcoin
  const wallet = new AnchorWallet({
    rpcUrl: process.env.BITCOIN_RPC_URL || 'http://localhost:18443',
    rpcUser: process.env.BITCOIN_RPC_USER || 'bitcoin',
    rpcPassword: process.env.BITCOIN_RPC_PASSWORD || 'password',
    network: 'regtest'
  })

  // Create and broadcast
  const message = createMessage({
    kind: AnchorKind.Text,
    body: 'My first Anchor message!'
  })

  const result = await wallet.broadcast(message)
  console.log('Broadcast:', result.txid)

  // Read back
  const tx = await wallet.getTransaction(result.txid)
  const parsed = parseMessage(tx.outputs[result.vout].data)
  console.log('Parsed:', new TextDecoder().decode(parsed.body))
}

main().catch(console.error)
```

## What's Next?

| Goal | Resource |
|------|----------|
| Reply to a message | [Threading Tutorial](/tutorials/threaded-messages) |
| Create DNS records | [DNS Kind](/kinds/dns) |
| Deploy tokens | [Token Kind](/kinds/token) |
| Timestamp documents | [Proof Kind](/kinds/proof) |
| Full SDK reference | [SDK Documentation](/sdk/) |
| Run locally | [Contributing Guide](/contributing/) |

## Common Issues

### "Connection refused"

Make sure Bitcoin Core is running:

```bash
bitcoind -regtest -rpcuser=bitcoin -rpcpassword=password
```

### "Insufficient funds"

Generate some blocks on regtest:

```bash
bitcoin-cli -regtest generatetoaddress 101 $(bitcoin-cli -regtest getnewaddress)
```

### "Message too large"

For messages over 80 bytes, specify a different carrier:

```typescript
import { CarrierType } from '@AnchorProtocol/anchor-sdk'

const message = createMessage({
  kind: AnchorKind.Text,
  body: 'A'.repeat(1000),
  carrier: CarrierType.WitnessData
})
```

