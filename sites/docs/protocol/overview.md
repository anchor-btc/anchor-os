# Protocol Overview

The **Anchor Protocol** is a Bitcoin-native messaging protocol that enables embedding structured, immutable data directly on the Bitcoin blockchain. Unlike traditional off-chain solutions, Anchor messages inherit Bitcoin's security guarantees: censorship resistance, immutability, and cryptographic timestamping.

## Core Concepts

### Messages on Bitcoin

Every Anchor message is embedded in a Bitcoin transaction. The message data can be stored in several locations within the transaction (called "carriers"), each with different trade-offs for size, cost, and permanence.

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

### Threading with Anchors

Messages can reference parent messages by including their transaction ID prefix and output index. This creates verifiable chains of messages—replies, updates, and conversations—all provably ordered by Bitcoin blocks.

```
Block 800,000          Block 800,001          Block 800,002
┌─────────┐            ┌─────────┐            ┌─────────┐
│  Msg A  │◄───────────│  Msg B  │◄───────────│  Msg C  │
│ (root)  │  anchors   │ (reply) │  anchors   │ (reply) │
└─────────┘            └─────────┘            └─────────┘
```

### Message Kinds

Each message has a **kind** that determines how the body should be interpreted:

- **Generic (0)**: Raw binary data
- **Text (1)**: UTF-8 encoded text
- **State (2)**: State updates for applications
- **Custom (10-255)**: Application-specific types

## Why Anchor?

### Compared to Ordinals/Inscriptions

| Feature | Anchor | Ordinals |
|---------|--------|----------|
| Message threading | ✅ Native | ❌ None |
| Multiple carriers | ✅ 5 types | ❌ Witness only |
| Structured types | ✅ Kinds system | ❌ MIME-based |
| Fee efficiency | ✅ Compact binary | ⚠️ Envelope overhead |
| Small messages | ✅ OP_RETURN | ❌ Minimum 546 sats |

### Compared to Nostr

| Feature | Anchor | Nostr |
|---------|--------|-------|
| Data permanence | ✅ Blockchain | ⚠️ Relay-dependent |
| Timestamping | ✅ Block-based | ❌ Client-claimed |
| Censorship resistance | ✅ Mining | ⚠️ Relay policies |
| Cost | ⚠️ Tx fees | ✅ Free |
| Speed | ⚠️ Block time | ✅ Instant |

## Protocol Version

The current protocol version is **v1**, identified by the magic bytes `0xA11C0001`:

- `0xA11C` = "ANCH" in leetspeak
- `0x0001` = Version 1

Future versions may introduce new features while maintaining backward compatibility through the magic byte versioning.

## Getting Started

1. **[Message Format](/protocol/message-format)** - Learn the binary structure
2. **[Carrier Types](/protocol/carriers)** - Choose how to embed data
3. **[Anchoring System](/protocol/anchoring)** - Create threaded messages
4. **[SDK Quickstart](/sdk/getting-started)** - Start building



