# Anchoring System

The **anchoring system** enables Anchor messages to reference parent messages, creating verifiable chains of replies, updates, and threaded conversations. This is a key differentiator from other Bitcoin data protocols.

## How Anchoring Works

Each message can include up to 255 **anchors**—references to previous messages. An anchor consists of:

| Field | Size | Description |
|-------|------|-------------|
| `txid_prefix` | 8 bytes | First 64 bits of parent transaction ID |
| `vout` | 1 byte | Output index where parent message lives |

```
Anchor = txid_prefix[8] + vout[1] = 9 bytes
```

### Txid Prefix

Instead of storing the full 32-byte transaction ID, we use only the first 8 bytes. This provides:

- **Sufficient uniqueness**: 2^64 possible values
- **Space efficiency**: 75% smaller than full txid
- **Probabilistic lookup**: Extremely low collision rate

::: tip Collision Probability
With ~1 billion Bitcoin transactions, the probability of a prefix collision is approximately 1 in 10 billion. In practice, context and timing make resolution trivial.
:::

## Message Types

### Root Messages (No Anchors)

A message with `anchor_count = 0` is a **root message**—the start of a thread or standalone post.

```
┌──────────┬──────┬─────────────┬────────────┐
│  Magic   │ Kind │ Anchors: 0  │    Body    │
└──────────┴──────┴─────────────┴────────────┘
```

### Reply Messages (With Anchors)

A message with one or more anchors is a **reply**—it references parent messages.

```
┌──────────┬──────┬─────────────┬───────────┬────────────┐
│  Magic   │ Kind │ Anchors: 1  │  Anchor   │    Body    │
└──────────┴──────┴─────────────┴───────────┴────────────┘
                                      │
                                      ▼
                   ┌─────────────────────────────────┐
                   │ txid_prefix[8] │     vout[1]    │
                   └─────────────────────────────────┘
```

### Multi-Parent Messages

A single message can reference multiple parents, useful for:

- **Merge commits**: Combining discussion branches
- **Cross-references**: Linking related topics
- **Acknowledgments**: Responding to multiple messages

```
┌──────────┬──────┬─────────────┬────────────────────────┬────────────┐
│  Magic   │ Kind │ Anchors: 3  │ Anchor A, B, C         │    Body    │
└──────────┴──────┴─────────────┴────────────────────────┴────────────┘
```

## Thread Structure

### Simple Thread

```
Time ──────────────────────────────────────────────────────▶

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
┌─────────────┐   ┌────────────┤
│   Post A    │◄──│   Reply B  │
└─────────────┘   └────────────┤
                               │     ┌─────────────┐
                               └────▶│   Reply D   │
                                     └─────────────┘
```

### Merge

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

## Anchor Resolution

When parsing a message with anchors, you need to resolve the txid prefix to a full transaction:

### Resolution Status

```typescript
type AnchorResolution =
  | { status: 'resolved'; txid: string }
  | { status: 'orphan' }
  | { status: 'ambiguous'; candidates: string[] }
```

| Status | Meaning | Action |
|--------|---------|--------|
| `resolved` | Single matching transaction found | Link to parent |
| `orphan` | No matching transaction found | Parent may be unconfirmed or invalid |
| `ambiguous` | Multiple matches (rare) | Use context to disambiguate |

### Resolution Algorithm

```typescript
async function resolveAnchor(
  prefix: Uint8Array,
  vout: number,
  indexer: AnchorIndexer
): Promise<AnchorResolution> {
  // Convert prefix to hex for lookup
  const prefixHex = bytesToHex(prefix)
  
  // Query indexer for matching transactions
  const matches = await indexer.findByPrefix(prefixHex)
  
  if (matches.length === 0) {
    return { status: 'orphan' }
  }
  
  if (matches.length === 1) {
    return { status: 'resolved', txid: matches[0] }
  }
  
  // Multiple matches - check which has valid Anchor message at vout
  const valid = matches.filter(txid => 
    indexer.hasAnchorMessage(txid, vout)
  )
  
  if (valid.length === 1) {
    return { status: 'resolved', txid: valid[0] }
  }
  
  return { status: 'ambiguous', candidates: valid }
}
```

## Creating Anchors

### From Full Txid

```typescript
function createAnchor(txid: string, vout: number): Anchor {
  // Txids are displayed in reverse byte order
  const txidBytes = hexToBytes(txid)
  
  // Reverse to get internal byte order
  const reversed = new Uint8Array(txidBytes).reverse()
  
  // Take first 8 bytes
  const prefix = reversed.slice(0, 8)
  
  return {
    txidPrefix: prefix,
    vout
  }
}

// Example
const anchor = createAnchor(
  'abc123...', // parent txid
  0            // output index
)
```

### Complete Example

```typescript
import { 
  createMessage, 
  AnchorKind, 
  CarrierType 
} from '@AnchorProtocol/anchor-sdk'

// Create a reply to an existing message
const reply = createMessage({
  kind: AnchorKind.Text,
  body: 'I agree with this!',
  anchors: [
    { txid: 'abc123def456...', vout: 0 }
  ],
  carrier: CarrierType.OpReturn
})
```

## Indexing Strategies

### Database Schema

```sql
-- Messages table
CREATE TABLE anchor_messages (
  id SERIAL PRIMARY KEY,
  txid CHAR(64) NOT NULL UNIQUE,
  txid_prefix CHAR(16) NOT NULL,  -- First 8 bytes as hex
  vout SMALLINT NOT NULL,
  kind SMALLINT NOT NULL,
  body BYTEA,
  block_height INT,
  block_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Anchors (parent references)
CREATE TABLE anchor_refs (
  id SERIAL PRIMARY KEY,
  child_txid CHAR(64) NOT NULL,
  parent_prefix CHAR(16) NOT NULL,
  parent_vout SMALLINT NOT NULL,
  resolved_txid CHAR(64),
  FOREIGN KEY (child_txid) REFERENCES anchor_messages(txid)
);

-- Index for prefix lookups
CREATE INDEX idx_txid_prefix ON anchor_messages(txid_prefix);
CREATE INDEX idx_parent_prefix ON anchor_refs(parent_prefix);
```

### Query Examples

```sql
-- Find all replies to a message
SELECT m.* 
FROM anchor_messages m
JOIN anchor_refs r ON r.child_txid = m.txid
WHERE r.resolved_txid = $1;

-- Build thread tree
WITH RECURSIVE thread AS (
  SELECT m.*, 0 AS depth
  FROM anchor_messages m
  WHERE m.txid = $1  -- root message
  
  UNION ALL
  
  SELECT m.*, t.depth + 1
  FROM anchor_messages m
  JOIN anchor_refs r ON r.child_txid = m.txid
  JOIN thread t ON r.resolved_txid = t.txid
  WHERE t.depth < 100  -- limit depth
)
SELECT * FROM thread ORDER BY depth, block_time;
```

## Best Practices

### Do

- ✅ Resolve anchors asynchronously in the background
- ✅ Cache resolved anchors for fast tree building
- ✅ Handle orphan status gracefully (parent may confirm later)
- ✅ Index by txid prefix for efficient lookups

### Don't

- ❌ Assume all anchors will resolve immediately
- ❌ Block on anchor resolution before displaying messages
- ❌ Create circular references (same txid)
- ❌ Exceed 255 anchors (protocol limit)

## Next Steps

- [SDK Encoding](/sdk/encoding) - Create messages programmatically
- [Examples](/examples/reply-to-message) - Reply implementation
- [Kinds Reference](/kinds/) - Message type specifications


