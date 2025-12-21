---
layout: home

hero:
  name: "Anchor Protocol"
  text: "Bitcoin-Native Messaging"
  tagline: Embed structured, immutable data on the Bitcoin blockchain with threading, multiple carriers, and extensible message types.
  actions:
    - theme: brand
      text: Get Started
      link: /protocol/overview
    - theme: alt
      text: View on GitHub
      link: https://github.com/AnchorProtocol/anchor
  image:
    src: /anchor-logo.svg
    alt: Anchor Protocol

features:
  - icon: ⚓
    title: Anchored Messages
    details: Reference parent messages using txid prefixes, creating verifiable threads and conversation chains on-chain.
  - icon: 📦
    title: Multiple Carriers
    details: Choose from OP_RETURN, Inscriptions, Stamps, or Witness Data based on size, cost, and permanence requirements.
  - icon: 🔧
    title: Extensible Kinds
    details: Built-in support for text, tokens, DNS, proofs, and more. Define custom kinds for your application.
  - icon: ⚡
    title: Efficient Encoding
    details: Compact binary format with varint encoding, designed to minimize on-chain footprint and transaction fees.
  - icon: 🔐
    title: Bitcoin Security
    details: Inherit Bitcoin's immutability and timestamping. No separate consensus or token required.
  - icon: 🌐
    title: SDK Ready
    details: TypeScript SDK for encoding, parsing, and broadcasting messages. Wallet integration included.

---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(135deg, #f7931a 30%, #ffc107);
}
</style>

## Quick Start

Install the Anchor SDK to start building:

```bash
npm install @AnchorProtocol/anchor-sdk
```

Create and broadcast a text message:

```typescript
import { createMessage, AnchorKind } from '@AnchorProtocol/anchor-sdk'

const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Hello, Bitcoin!',
})

// Embed in a transaction via OP_RETURN
const txHex = await wallet.createTransaction(message)
```

## Protocol Overview

Anchor messages follow a simple binary format:

| Field | Size | Description |
|-------|------|-------------|
| Magic | 4 bytes | `0xA11C0001` - Protocol identifier |
| Kind | 1 byte | Message type (0-255) |
| Anchor Count | 1 byte | Number of parent references |
| Anchors | 9 bytes each | `txid_prefix[8] + vout[1]` |
| Body | variable | Kind-specific payload |

## Message Kinds

| Kind | Name | Description |
|------|------|-------------|
| 0 | Generic | Raw binary data |
| 1 | Text | UTF-8 text messages |
| 2 | State | State updates (pixels, counters) |
| 3 | Vote | Governance voting |
| 4 | Image | Embedded images |
| 5 | GeoMarker | Geographic coordinates |
| 10 | DNS | Decentralized naming |
| 11 | Proof | Proof of existence |
| 20 | Token | Fungible tokens |

## Applications

The Anchor Protocol powers several applications:

- **[Anchor Threads](https://threads.anchor.dev)** - Decentralized forum with Bitcoin-backed posts
- **[Anchor Tokens](https://tokens.anchor.dev)** - Fungible tokens on Bitcoin
- **[Anchor DNS](https://dns.anchor.dev)** - .bit domain registration
- **[Anchor Proof](https://proof.anchor.dev)** - Document timestamping
- **[Anchor Map](https://map.anchor.dev)** - Geographic markers
- **[Anchor Pixel](https://pixel.anchor.dev)** - Collaborative canvas


