---
layout: home

hero:
  name: "Anchor Protocol"
  text: "Bitcoin-Native Messaging"
  tagline: Structured, immutable data on Bitcoin. One format, multiple carriers, infinite possibilities.
  actions:
    - theme: brand
      text: Quickstart →
      link: /quickstart
    - theme: alt
      text: GitHub
      link: https://github.com/AnchorProtocol/anchor
  image:
    src: /anchor-logo.svg
    alt: Anchor Protocol

features:
  - icon: ⚡
    title: 5 min to first message
    details: Install SDK, create message, broadcast. Done.
    link: /quickstart
    linkText: Start now
  - icon: 📖
    title: Understand the protocol
    details: Message format, carriers, threading model.
    link: /concepts/
    linkText: Read concepts
  - icon: 🔧
    title: Build with the SDK
    details: TypeScript and Rust. Encode, parse, broadcast.
    link: /sdk/
    linkText: View SDK docs
  - icon: 📦
    title: Explore message kinds
    details: Text, DNS, Tokens, Proofs, GeoMarkers, and more.
    link: /kinds/
    linkText: See all kinds

---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(135deg, #f7931a 30%, #ffc107);
}
.vp-doc h2 {
  border-top: none;
  margin-top: 24px;
}
</style>

## How It Works

<div class="how-it-works">

**1. Create** → Encode your data with a message kind  
**2. Embed** → Choose a carrier (OP_RETURN, Inscription, Witness)  
**3. Broadcast** → Send to Bitcoin network  
**4. Read** → Anyone can parse and verify on-chain  

</div>

## Choose Your Path

| I want to... | Go to |
|--------------|-------|
| Get started immediately | [Quickstart](/quickstart) |
| Understand how Anchor works | [Concepts](/concepts/) |
| Integrate the SDK | [SDK Reference](/sdk/) |
| See what I can build | [Message Kinds](/kinds/) |
| Follow step-by-step examples | [Tutorials](/tutorials/) |
| Explore existing apps | [Apps](/apps/) |

## Install

::: code-group

```bash [npm]
npm install @AnchorProtocol/sdk
```

```bash [Cargo.toml]
[dependencies]
anchor-core = "0.1"
anchor-wallet-lib = "0.1"
```

:::

## Hello World

::: code-group

```typescript [TypeScript]
import { AnchorWallet, AnchorKind } from '@AnchorProtocol/sdk'

const wallet = new AnchorWallet({ network: 'regtest', ... })
const txid = await wallet.createRootMessage('Hello, Bitcoin!')
```

```rust [Rust]
use anchor_wallet_lib::{AnchorWallet, WalletConfig};

let wallet = AnchorWallet::new(WalletConfig::regtest(...))?;
let txid = wallet.create_root_message("Hello, Bitcoin!")?;
```

:::

<div class="cta-box">

[Full Quickstart Guide →](/quickstart)

</div>

<style>
.how-it-works {
  background: var(--vp-c-bg-soft);
  padding: 20px 24px;
  border-radius: 12px;
  margin: 16px 0 24px;
}
.how-it-works p {
  margin: 0;
  line-height: 2;
}
.cta-box {
  text-align: center;
  margin: 32px 0;
}
.cta-box a {
  display: inline-block;
  padding: 12px 32px;
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.2s;
}
.cta-box a:hover {
  opacity: 0.9;
}
</style>
