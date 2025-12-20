# Reply to a Message

This example demonstrates how to create reply messages that reference parent messages, building threaded conversations on Bitcoin.

## How Anchoring Works

When you reply to a message, you include an **anchor**—a reference to the parent message. An anchor consists of:

- **txid_prefix**: First 8 bytes of the parent's transaction ID
- **vout**: Output index where the parent message lives

```
Parent Message (txid: abc123...)
       ▲
       │ anchor
       │
Reply Message (references abc123...:0)
```

## Simple Reply

Reply to an existing message:

```typescript
import { 
  createMessage, 
  AnchorKind, 
  AnchorWallet 
} from '@AnchorProtocol/anchor-sdk'

async function replyToMessage(
  parentTxid: string,
  parentVout: number,
  replyText: string
) {
  const wallet = new AnchorWallet({
    rpcUrl: 'http://localhost:18443',
    rpcUser: 'bitcoin',
    rpcPassword: 'password',
    network: 'regtest'
  })

  // Create reply with anchor to parent
  const reply = createMessage({
    kind: AnchorKind.Text,
    body: replyText,
    anchors: [
      { txid: parentTxid, vout: parentVout }
    ]
  })

  const result = await wallet.broadcast(reply)

  console.log('Reply sent!')
  console.log('Reply TX:', result.txid)
  console.log('References:', parentTxid)
  
  return result.txid
}

// Reply to a post
replyToMessage(
  'abc123def456789012345678901234567890123456789012345678901234abcd',
  0,
  'Great post! I totally agree.'
).catch(console.error)
```

## Building a Thread

Create a conversation with multiple replies:

```typescript
async function createThread() {
  const wallet = new AnchorWallet(config)

  // 1. Create root post
  const rootMessage = createMessage({
    kind: AnchorKind.Text,
    body: 'What do you think about Bitcoin?'
  })
  
  const root = await wallet.broadcast(rootMessage)
  console.log('Root post:', root.txid)

  // Wait for confirmation (or use 0-conf)
  await sleep(1000)

  // 2. First reply
  const reply1 = createMessage({
    kind: AnchorKind.Text,
    body: 'I think it\'s the future of money!',
    anchors: [{ txid: root.txid, vout: root.vout }]
  })
  
  const r1 = await wallet.broadcast(reply1)
  console.log('Reply 1:', r1.txid)

  // 3. Reply to the reply
  const reply2 = createMessage({
    kind: AnchorKind.Text,
    body: 'Absolutely! Digital gold.',
    anchors: [{ txid: r1.txid, vout: r1.vout }]
  })
  
  const r2 = await wallet.broadcast(reply2)
  console.log('Reply 2:', r2.txid)

  // Thread structure:
  // root (What do you think...)
  //   └── reply1 (I think it's the future...)
  //         └── reply2 (Absolutely! Digital gold.)
  
  return {
    root: root.txid,
    replies: [r1.txid, r2.txid]
  }
}
```

## Multiple Parent References

Reply to multiple messages at once:

```typescript
async function replyToMultiple(
  parents: Array<{ txid: string; vout: number }>,
  replyText: string
) {
  const wallet = new AnchorWallet(config)

  // Create reply referencing multiple parents
  const reply = createMessage({
    kind: AnchorKind.Text,
    body: replyText,
    anchors: parents.map(p => ({ txid: p.txid, vout: p.vout }))
  })

  const result = await wallet.broadcast(reply)

  console.log('Reply sent referencing', parents.length, 'messages')
  return result.txid
}

// Reply to a debate between two posts
replyToMultiple([
  { txid: 'abc123...', vout: 0 },
  { txid: 'def456...', vout: 0 }
], 'I think you both make good points!')
```

## Cross-Kind References

Reference messages of different kinds:

```typescript
async function annotateProof(
  proofTxid: string,
  annotation: string
) {
  const wallet = new AnchorWallet(config)

  // Text message referencing a Proof message
  const comment = createMessage({
    kind: AnchorKind.Text,
    body: annotation,
    anchors: [{ txid: proofTxid, vout: 0 }]
  })

  return wallet.broadcast(comment)
}

// Add context to a timestamped document
annotateProof(
  'abc123...',  // Proof TX
  'This is the original signed contract from 2024-01-15'
)
```

## Domain Update Chain

Update DNS records with anchoring:

```typescript
import { 
  encodeDnsPayload, 
  DnsOperation, 
  RecordType 
} from '@AnchorProtocol/anchor-sdk/dns'

async function updateDomain(
  registrationTxid: string,
  newIpAddress: string
) {
  const wallet = new AnchorWallet(config)

  // Update references the registration
  const updatePayload = encodeDnsPayload({
    operation: DnsOperation.UPDATE,
    name: 'example.bit',
    records: [
      { type: RecordType.A, ttl: 3600, value: newIpAddress }
    ]
  })

  const message = createMessage({
    kind: 10,
    bodyBytes: updatePayload,
    anchors: [{ txid: registrationTxid, vout: 0 }]
  })

  const result = await wallet.broadcast(message)
  console.log('Domain updated:', result.txid)
  
  return result.txid
}
```

## Token Transfer Chain

Transfer tokens with provenance:

```typescript
import { encodeTransferPayload } from '@AnchorProtocol/anchor-sdk/token'

async function transferTokens(
  sourceTxid: string,  // Previous token UTXO
  tokenId: bigint,
  recipientAddress: string,
  amount: bigint
) {
  const wallet = new AnchorWallet(config)

  const transferPayload = encodeTransferPayload({
    tokenId,
    allocations: [
      { outputIndex: 1, amount }
    ]
  })

  const message = createMessage({
    kind: 20,
    bodyBytes: transferPayload,
    anchors: [{ txid: sourceTxid, vout: 0 }]
  })

  const result = await wallet.broadcast(message, {
    outputs: [
      { address: recipientAddress, value: 546 }  // Token output
    ]
  })

  console.log('Tokens transferred:', result.txid)
  return result.txid
}
```

## Loading a Thread

Fetch and display a complete thread:

```typescript
interface ThreadNode {
  txid: string
  message: AnchorMessage
  children: ThreadNode[]
  depth: number
}

async function loadThread(
  rootTxid: string,
  indexer: AnchorIndexer
): Promise<ThreadNode> {
  // Get root message
  const rootTx = await indexer.getMessage(rootTxid)
  
  const root: ThreadNode = {
    txid: rootTxid,
    message: rootTx,
    children: [],
    depth: 0
  }

  // Find all replies (messages that anchor to this thread)
  async function loadReplies(node: ThreadNode, maxDepth = 10) {
    if (node.depth >= maxDepth) return

    const replies = await indexer.findReplies(node.txid)
    
    for (const reply of replies) {
      const childNode: ThreadNode = {
        txid: reply.txid,
        message: reply.message,
        children: [],
        depth: node.depth + 1
      }
      
      node.children.push(childNode)
      await loadReplies(childNode, maxDepth)
    }
  }

  await loadReplies(root)
  return root
}

// Display thread
function displayThread(node: ThreadNode, indent = '') {
  const text = new TextDecoder().decode(node.message.body)
  console.log(`${indent}${node.txid.slice(0, 8)}... : ${text}`)
  
  for (const child of node.children) {
    displayThread(child, indent + '  ')
  }
}

// Usage
const thread = await loadThread('abc123...', indexer)
displayThread(thread)

// Output:
// abc123... : What do you think about Bitcoin?
//   def456... : I think it's the future!
//     ghi789... : Absolutely agree!
//   jkl012... : Still learning about it
```

## Size Considerations

Each anchor adds 9 bytes to your message:

```typescript
function calculateReplySize(
  textLength: number,
  anchorCount: number
): number {
  const header = 6  // magic + kind + anchor_count
  const anchors = anchorCount * 9
  const body = new TextEncoder().encode('x'.repeat(textLength)).length
  
  return header + anchors + body
}

// Check if reply fits in OP_RETURN
const size = calculateReplySize(50, 1)  // 50 chars, 1 anchor
console.log('Size:', size, 'bytes')
console.log('Fits in OP_RETURN:', size <= 80)
```

## Best Practices

1. **Always validate parent exists** before creating reply
2. **Use 0-conf carefully** - wait for confirmation for important threads
3. **Limit anchor count** - more anchors = larger messages
4. **Cache resolved anchors** for faster thread loading
5. **Handle orphans** - parent may be pruned or invalid

## Next Steps

- [Parse a Transaction](/examples/parse-transaction) - Read messages from chain
- [Anchoring System](/protocol/anchoring) - Deep dive into threading
- [SDK API Reference](/sdk/api-reference) - Complete API docs

