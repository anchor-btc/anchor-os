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
      link: https://github.com/anchor-btc/anchor-os
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

/* Roadmap Section */
.roadmap-section {
  background: linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(249,115,22,0.12) 50%, rgba(245,158,11,0.08) 100%);
  border: 2px solid rgba(245,158,11,0.3);
  border-radius: 16px;
  padding: 32px;
  margin: 32px 0 40px;
  position: relative;
  overflow: hidden;
}
.roadmap-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #f59e0b, #f97316, #f59e0b);
}
.roadmap-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.roadmap-header .icon {
  font-size: 28px;
}
.roadmap-header h3 {
  margin: 0;
  font-size: 22px;
  color: #f59e0b;
  font-weight: 700;
}
.roadmap-header .badge {
  background: rgba(245,158,11,0.2);
  color: #f59e0b;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: 1px solid rgba(245,158,11,0.4);
  animation: pulse-badge 2s infinite;
}
@keyframes pulse-badge {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
.roadmap-description {
  color: var(--vp-c-text-2);
  line-height: 1.7;
  margin-bottom: 24px;
  font-size: 15px;
}
.roadmap-description strong {
  color: var(--vp-c-text-1);
}

/* Roadmap Timeline */
.roadmap-timeline {
  display: flex;
  align-items: stretch;
  gap: 0;
  margin: 28px 0 24px;
  position: relative;
}
.roadmap-timeline::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #f59e0b 33%, #444 33%);
  transform: translateY(-50%);
  z-index: 0;
}
.roadmap-step {
  flex: 1;
  text-align: center;
  position: relative;
  z-index: 1;
}
.roadmap-step .circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
  font-size: 24px;
  font-weight: 700;
  transition: all 0.3s ease;
}
.roadmap-step.active .circle {
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: #000;
  box-shadow: 0 0 20px rgba(245,158,11,0.5), 0 0 40px rgba(245,158,11,0.2);
  animation: glow 2s infinite;
}
@keyframes glow {
  0%, 100% { box-shadow: 0 0 20px rgba(245,158,11,0.5), 0 0 40px rgba(245,158,11,0.2); }
  50% { box-shadow: 0 0 30px rgba(245,158,11,0.7), 0 0 60px rgba(245,158,11,0.3); }
}
.roadmap-step.upcoming .circle {
  background: rgba(100,100,100,0.2);
  color: #666;
  border: 2px dashed #555;
}
.roadmap-step .label {
  font-weight: 700;
  font-size: 15px;
  margin-bottom: 4px;
}
.roadmap-step.active .label {
  color: #f59e0b;
}
.roadmap-step.upcoming .label {
  color: #888;
}
.roadmap-step .status {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 12px;
  display: inline-block;
}
.roadmap-step.active .status {
  background: rgba(34,197,94,0.15);
  color: #22c55e;
  border: 1px solid rgba(34,197,94,0.3);
}
.roadmap-step.upcoming .status {
  background: rgba(100,100,100,0.1);
  color: #888;
  border: 1px solid rgba(100,100,100,0.2);
}

/* Benefits Grid */
.benefits-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 20px;
}
@media (max-width: 640px) {
  .benefits-grid {
    grid-template-columns: 1fr;
  }
}
.benefit-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}
.benefit-item .check {
  color: #22c55e;
  font-size: 16px;
}
</style>

<div class="roadmap-section">
  <div class="roadmap-header">
    <span class="icon">🚀</span>
    <h3>Protocol Roadmap</h3>
    <span class="badge">Live Now</span>
  </div>
  
  <p class="roadmap-description">
    Anchor Protocol is currently in <strong>Regtest mode</strong> on Anchor OS — our development playground! 
    We're refining the protocol with community feedback before expanding to public networks.
    <strong>Devs can already build and test everything!</strong>
  </p>

  <div class="roadmap-timeline">
    <div class="roadmap-step active">
      <div class="circle">🧪</div>
      <div class="label">Regtest</div>
      <span class="status">✓ Active</span>
    </div>
    <div class="roadmap-step upcoming">
      <div class="circle">🔗</div>
      <div class="label">Testnet</div>
      <span class="status">Coming Soon</span>
    </div>
    <div class="roadmap-step upcoming">
      <div class="circle">₿</div>
      <div class="label">Mainnet</div>
      <span class="status">Coming Soon</span>
    </div>
  </div>

  <div class="benefits-grid">
    <div class="benefit-item">
      <span class="check">✓</span>
      <span>All features fully functional</span>
    </div>
    <div class="benefit-item">
      <span class="check">✓</span>
      <span>Complete SDK ready to use</span>
    </div>
    <div class="benefit-item">
      <span class="check">✓</span>
      <span>Perfect for learning & prototyping</span>
    </div>
    <div class="benefit-item">
      <span class="check">✓</span>
      <span>Your feedback shapes the future</span>
    </div>
  </div>
</div>

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
