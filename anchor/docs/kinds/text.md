# Kind 1: Text

The **Text** kind is used for human-readable UTF-8 text messages. It's the most common message type, used by applications like Anchor Threads for posts and comments.

## Overview

- **Kind**: 1 (`0x01`)
- **Name**: Text
- **Status**: Core
- **Max Payload**: Carrier-dependent (70 bytes for OP_RETURN)

## Payload Format

The body is interpreted as UTF-8 encoded text:

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0..n | text | utf8 | UTF-8 encoded string |

No length prefix is needed—the text extends to the end of the message body.

## TypeScript Interface

```typescript
import { AnchorKind, AnchorMessage } from '@AnchorProtocol/anchor-sdk'

interface TextMessage extends AnchorMessage {
  kind: AnchorKind.Text  // 1
  body: Uint8Array
  text: string  // Decoded UTF-8
}
```

## Encoding Example

```typescript
import { createMessage, AnchorKind } from '@AnchorProtocol/anchor-sdk'

const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Hello, Bitcoin! ⚡'
})

// Result: A11C0001 01 00 48656C6C6F2C20426974636F696E2120E29AA1
//         magic    kind anchors "Hello, Bitcoin! ⚡" (UTF-8)
```

## Decoding Example

```typescript
import { parseMessage, AnchorKind } from '@AnchorProtocol/anchor-sdk'

const bytes = hexToBytes('A11C0001010048656C6C6F21')
const message = parseMessage(bytes)

if (message.kind === AnchorKind.Text) {
  const text = new TextDecoder().decode(message.body)
  console.log(text)  // "Hello!"
}
```

## Full Transaction Example

### Creating a Post

```typescript
import { 
  createMessage, 
  AnchorKind, 
  CarrierType,
  AnchorWallet 
} from '@AnchorProtocol/anchor-sdk'

const wallet = new AnchorWallet(config)

// Create a root post (no anchors)
const post = createMessage({
  kind: AnchorKind.Text,
  body: 'My first on-chain post!',
  carrier: CarrierType.OpReturn
})

const result = await wallet.broadcast(post)
console.log('Post txid:', result.txid)
// Post txid: abc123...
```

### Creating a Reply

```typescript
// Reply to the post above
const reply = createMessage({
  kind: AnchorKind.Text,
  body: 'Great post!',
  anchors: [
    { txid: 'abc123...', vout: 0 }
  ],
  carrier: CarrierType.OpReturn
})

const result = await wallet.broadcast(reply)
console.log('Reply txid:', result.txid)
```

## Size Considerations

### OP_RETURN Limits

With OP_RETURN (80 bytes max):

| Component | Size |
|-----------|------|
| Magic | 4 bytes |
| Kind | 1 byte |
| Anchor count | 1 byte |
| **Available for text** | **74 bytes** |

With 1 anchor:

| Component | Size |
|-----------|------|
| Magic | 4 bytes |
| Kind | 1 byte |
| Anchor count | 1 byte |
| Anchor | 9 bytes |
| **Available for text** | **65 bytes** |

### UTF-8 Encoding

Remember that UTF-8 characters can be 1-4 bytes:

| Character | Bytes | Example |
|-----------|-------|---------|
| ASCII | 1 | A, B, 1, 2 |
| Latin extended | 2 | é, ñ, ü |
| Most symbols | 3 | ₿, €, ✓ |
| Emoji | 4 | 🚀, ⚡, 🔥 |

```typescript
// This is 20 characters but 24 bytes
const text = 'Hello Bitcoin! ⚡🚀'
const bytes = new TextEncoder().encode(text)
console.log(bytes.length)  // 24
```

### Long Messages

For messages exceeding OP_RETURN, use Witness Data:

```typescript
const longPost = createMessage({
  kind: AnchorKind.Text,
  body: 'A'.repeat(1000),  // 1000 characters
  carrier: CarrierType.WitnessData  // Up to ~4MB
})
```

## Validation

```typescript
function isValidTextMessage(message: AnchorMessage): boolean {
  if (message.kind !== AnchorKind.Text) return false
  
  try {
    // Attempt to decode as UTF-8
    new TextDecoder('utf-8', { fatal: true }).decode(message.body)
    return true
  } catch {
    return false  // Invalid UTF-8
  }
}
```

## Use Cases

### Social Posts

```typescript
// Anchor Threads style post
const post = createMessage({
  kind: AnchorKind.Text,
  body: 'Just bought some sats! #bitcoin'
})
```

### Comments

```typescript
// Reply to another post
const comment = createMessage({
  kind: AnchorKind.Text,
  body: 'This is the way',
  anchors: [{ txid: parentTxid, vout: 0 }]
})
```

### Annotations

```typescript
// Add context to any on-chain data
const annotation = createMessage({
  kind: AnchorKind.Text,
  body: 'This inscription is historically significant',
  anchors: [{ txid: inscriptionTxid, vout: 0 }]
})
```

## Best Practices

1. **Check size**: Ensure text fits in chosen carrier
2. **Handle encoding**: Always use UTF-8
3. **Sanitize input**: Validate user input before embedding
4. **Consider privacy**: Text is public and permanent

## See Also

- [Generic (Kind 0)](/kinds/generic) - For binary data
- [Creating a Message](/examples/create-message) - Full example
- [Reply to Message](/examples/reply-to-message) - Threading example


