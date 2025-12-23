# Threading

The **anchoring system** enables messages to reference parent messages, creating verifiable chains of replies and conversations.

## How It Works

Each message can include up to 255 **anchors**—references to previous messages:

| Field | Size | Description |
|-------|------|-------------|
| `txid_prefix` | 8 bytes | First 64 bits of parent txid |
| `vout` | 1 byte | Output index |

Using 8 bytes (2^64 values) instead of full 32-byte txids saves space while maintaining uniqueness.

## Message Types

### Root Message

A message with `anchor_count = 0`:

```
┌──────────┬──────┬─────────────┬────────────┐
│  Magic   │ Kind │ Anchors: 0  │    Body    │
└──────────┴──────┴─────────────┴────────────┘
```

### Reply Message

A message referencing a parent:

```
┌──────────┬──────┬─────────────┬───────────┬────────────┐
│  Magic   │ Kind │ Anchors: 1  │  Anchor   │    Body    │
└──────────┴──────┴─────────────┴───────────┴────────────┘
```

## Thread Structures

### Simple Thread

```
Block N           Block N+1          Block N+2
┌─────────────┐   ┌─────────────┐    ┌─────────────┐
│   Post A    │◄──│   Reply B   │◄───│   Reply C   │
│  (root)     │   │  anchors: A │    │  anchors: B │
└─────────────┘   └─────────────┘    └─────────────┘
```

### Branching Thread

```
                                   ┌─────────────┐
                             ┌────▶│   Reply C   │
                             │     └─────────────┘
┌─────────────┐   ┌──────────┤
│   Post A    │◄──│  Reply B │
└─────────────┘   └──────────┤
                             │     ┌─────────────┐
                             └────▶│   Reply D   │
                                   └─────────────┘
```

### Multi-Parent (Merge)

```
┌─────────────┐
│   Post A    │─────────────┐
└─────────────┘             │
                            ▼
┌─────────────┐       ┌─────────────┐
│   Post B    │──────▶│   Merge M   │
└─────────────┘       │ anchors:A,B │
                      └─────────────┘
```

## Creating Replies

```typescript
import { createMessage, AnchorKind } from '@AnchorProtocol/anchor-sdk'

const reply = createMessage({
  kind: AnchorKind.Text,
  body: 'I agree with this!',
  anchors: [
    { txid: 'abc123def456...', vout: 0 }
  ]
})
```

## Anchor Resolution

When parsing, resolve the txid prefix to a full transaction:

| Status | Meaning |
|--------|---------|
| `resolved` | Single matching transaction found |
| `orphan` | No match (parent may be unconfirmed) |
| `ambiguous` | Multiple matches (use context) |

## Best Practices

- Resolve anchors asynchronously
- Cache resolved anchors
- Handle orphan status gracefully
- Index by txid prefix for efficient lookups
- Don't exceed 255 anchors per message

## See Also

- [Message Format](/concepts/message-format) - Binary structure
- [Carriers](/concepts/carriers) - Embedding methods
- [Threaded Messages Tutorial](/tutorials/threaded-messages)

