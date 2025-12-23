# Threaded Messages

Create replies by referencing parent messages with anchors.

## How It Works

An **anchor** is a 9-byte reference: 8-byte txid prefix + 1-byte output index.

```
Parent Message (txid: abc123...)
       ▲
       │ anchor
       │
Reply Message (references abc123...:0)
```

## Create a Reply

```typescript
import { createMessage, AnchorKind, AnchorWallet } from '@AnchorProtocol/anchor-sdk'

const wallet = new AnchorWallet({ /* config */ })

// Reply to a message
const reply = createMessage({
  kind: AnchorKind.Text,
  body: 'Great point!',
  anchors: [{ txid: parentTxid, vout: 0 }]
})

const result = await wallet.broadcast(reply)
```

## Build a Thread

```typescript
// Root post
const root = await wallet.broadcast(createMessage({
  kind: AnchorKind.Text,
  body: 'What do you think about Bitcoin?'
}))

// First reply
const reply1 = await wallet.broadcast(createMessage({
  kind: AnchorKind.Text,
  body: 'It is the future!',
  anchors: [{ txid: root.txid, vout: root.vout }]
}))

// Reply to reply
const reply2 = await wallet.broadcast(createMessage({
  kind: AnchorKind.Text,
  body: 'Agreed!',
  anchors: [{ txid: reply1.txid, vout: reply1.vout }]
}))

// Thread structure:
// root
//   └── reply1
//         └── reply2
```

## Multi-Parent References

Reply to multiple messages at once:

```typescript
const reply = createMessage({
  kind: AnchorKind.Text,
  body: 'Both good points!',
  anchors: [
    { txid: 'abc123...', vout: 0 },
    { txid: 'def456...', vout: 0 }
  ]
})
```

## Next

- [Reading Messages](/tutorials/reading-messages) - Parse transactions
- [Threading Concepts](/concepts/threading) - Deep dive
