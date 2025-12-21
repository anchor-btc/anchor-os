# Kinds Reference

**Kinds** define how the body of an Anchor message should be interpreted. Each kind has a numeric identifier (0-255) and specifies the binary format of its payload.

## Quick Reference

| Kind | Name | Description | Status |
|------|------|-------------|--------|
| 0 | [Generic](/kinds/generic) | Raw binary data | Core |
| 1 | [Text](/kinds/text) | UTF-8 encoded text | Core |
| 2 | [State](/kinds/state) | Application state updates | Core |
| 3 | [Vote](/kinds/vote) | Governance voting | Core |
| 4 | [Image](/kinds/image) | Embedded images | Core |
| 5 | [GeoMarker](/kinds/geomarker) | Geographic coordinates | Extension |
| 10 | [DNS](/kinds/dns) | Decentralized naming | Extension |
| 11 | [Proof](/kinds/proof) | Proof of existence | Extension |
| 20 | [Token](/kinds/token) | Fungible tokens | Extension |

## Kind Ranges

| Range | Purpose | Governance |
|-------|---------|------------|
| 0-9 | Core protocol types | Protocol spec |
| 10-99 | Standard extensions | Community |
| 100-199 | Reserved | Future use |
| 200-255 | Custom/Experimental | Per-application |

## Using Kinds

### In TypeScript

```typescript
import { AnchorKind, createMessage } from '@AnchorProtocol/anchor-sdk'

// Using core kinds
const textMsg = createMessage({
  kind: AnchorKind.Text,
  body: 'Hello Bitcoin!'
})

// Using extension kinds
const dnsMsg = createMessage({
  kind: 10, // DNS
  bodyBytes: encodeDnsPayload({
    operation: DnsOperation.REGISTER,
    name: 'example.bit',
    records: []
  })
})
```

### Parsing Unknown Kinds

```typescript
function parseMessage(bytes: Uint8Array) {
  const message = parseAnchorMessage(bytes)
  
  switch (message.kind) {
    case AnchorKind.Text:
      return { ...message, text: decodeText(message.body) }
    case AnchorKind.State:
      return { ...message, state: decodeState(message.body) }
    case 10: // DNS
      return { ...message, dns: decodeDnsPayload(message.body) }
    default:
      // Treat as generic binary
      return message
  }
}
```

## Custom Kinds

To define a custom kind for your application:

1. **Choose a kind number** in the 200-255 range
2. **Document the payload format** using the template below
3. **Implement encoder/decoder** functions
4. **Register with the community** (optional, for standard extensions)

### Template

```markdown
# Kind XX: MyKind

## Overview
Brief description of the kind's purpose.

## Kind Value
- **Kind**: XX (0xXX)
- **Status**: Custom

## Payload Format

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | field1 | u8 | Description |
| 1 | field2 | u16 | Description |
| ... | ... | ... | ... |

## TypeScript Interface

\`\`\`typescript
interface MyKindPayload {
  field1: number
  field2: number
}
\`\`\`

## Encoding Example

\`\`\`typescript
function encodeMyKind(payload: MyKindPayload): Uint8Array {
  // ...
}
\`\`\`
```

## Kind Documentation

Each kind page includes:

1. **Overview** - Purpose and use cases
2. **Kind Value** - Numeric identifier
3. **Payload Format** - Binary layout with byte offsets
4. **Operations** - For kinds with multiple operations
5. **TypeScript Interface** - Data structures
6. **Encoding Example** - How to create payloads
7. **Decoding Example** - How to parse payloads
8. **Full Transaction Example** - End-to-end flow

## See Also

- [Message Format](/protocol/message-format) - Protocol structure
- [SDK Encoding](/sdk/encoding) - Encoding messages
- [SDK API Reference](/sdk/api-reference) - Full API docs


