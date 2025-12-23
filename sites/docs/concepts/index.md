# Core Concepts

The **Anchor Protocol** is a Bitcoin-native messaging protocol that enables embedding structured, immutable data directly on the Bitcoin blockchain. Messages inherit Bitcoin's security guarantees: censorship resistance, immutability, and cryptographic timestamping.

## Key Concepts

| Concept | Description |
|---------|-------------|
| [Message Format](/concepts/message-format) | Binary structure: magic bytes, kind, anchors, body |
| [Carriers](/concepts/carriers) | How data is embedded: OP_RETURN, Witness, Inscription, Stamps |
| [Threading](/concepts/threading) | Reference parent messages to create chains |

## How It Works

Every Anchor message is embedded in a Bitcoin transaction:

```
┌─────────────────────────────────────────┐
│            Bitcoin Transaction           │
├─────────────────────────────────────────┤
│  Input(s)        │  Output(s)           │
│                  │  ├─ Payment output   │
│                  │  ├─ Change output    │
│                  │  └─ OP_RETURN        │
│                  │      └─ ANCHOR MSG   │
└─────────────────────────────────────────┘
```

## Message Threading

Messages can reference parent messages, creating verifiable chains:

```
Block 800,000          Block 800,001          Block 800,002
┌─────────┐            ┌─────────┐            ┌─────────┐
│  Msg A  │◄───────────│  Msg B  │◄───────────│  Msg C  │
│ (root)  │  anchors   │ (reply) │  anchors   │ (reply) │
└─────────┘            └─────────┘            └─────────┘
```

## Protocol Version

Current version: **v1** (`0xA11C0001`)

- `0xA11C` = "ANCH" identifier
- `0x0001` = Version 1

## Next Steps

- [Quickstart](/quickstart) - Build your first message
- [SDK](/sdk/) - TypeScript SDK
- [Kinds](/kinds/) - Message types

