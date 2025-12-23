# Reading Messages

Parse Anchor messages from Bitcoin transactions.

## Parse Raw Bytes

```typescript
import { parseMessage, isAnchorMessage, AnchorKind } from '@AnchorProtocol/anchor-sdk'

const bytes = hexToBytes('a11c00010100486565c6c6f21')

if (isAnchorMessage(bytes)) {
  const message = parseMessage(bytes)
  
  console.log('Kind:', message.kind)
  console.log('Anchors:', message.anchors.length)
  
  if (message.kind === AnchorKind.Text) {
    console.log('Text:', new TextDecoder().decode(message.body))
  }
}
```

## Extract from Transaction

### From OP_RETURN

```typescript
function extractFromOpReturn(tx: Transaction) {
  for (const output of tx.vout) {
    if (output.scriptPubKey.type === 'nulldata') {
      const hex = output.scriptPubKey.hex
      const data = hexToBytes(hex.slice(4)) // Skip OP_RETURN opcode
      
      if (isAnchorMessage(data)) {
        return parseMessage(data)
      }
    }
  }
  return null
}
```

### From Witness Data

```typescript
function extractFromWitness(tx: Transaction) {
  for (const input of tx.vin) {
    if (!input.txinwitness) continue
    
    for (const item of input.txinwitness) {
      const bytes = hexToBytes(item)
      if (isAnchorMessage(bytes)) {
        return parseMessage(bytes)
      }
    }
  }
  return null
}
```

## Kind-Specific Parsing

```typescript
import { decodeDnsPayload } from '@AnchorProtocol/anchor-sdk/dns'
import { decodeTokenPayload } from '@AnchorProtocol/anchor-sdk/token'

const message = parseMessage(bytes)

// DNS (Kind 10)
if (message.kind === 10) {
  const dns = decodeDnsPayload(message.body)
  console.log('Domain:', dns.name)
}

// Token (Kind 20)
if (message.kind === 20) {
  const token = decodeTokenPayload(message.body)
  console.log('Ticker:', token.data.ticker)
}
```

## Next

- [SDK Parsing](/sdk/parsing) - Complete API
- [Kinds Reference](/kinds/) - All message types
