# Bitcoin Metaprotocol Benchmark

A comprehensive comparison of Bitcoin metaprotocols for data embedding, tokens, and messaging.

> **Last Updated:** December 2024  
> **Version:** 1.0

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Protocols Overview](#protocols-overview)
3. [Technical Benchmark](#technical-benchmark)
4. [Use Case Analysis](#use-case-analysis)
5. [Scoring Methodology](#scoring-methodology)
6. [Final Scores](#final-scores)
7. [Conclusion](#conclusion)

---

## Executive Summary

This document provides a detailed comparison of the major Bitcoin metaprotocols:

| Protocol | Primary Focus | Launch | Final Score |
|----------|---------------|--------|-------------|
| **ANCHOR** | Messaging, Governance, Social | 2024 | **87/100** |
| **Ordinals** | NFTs, Digital Artifacts | Jan 2023 | **82/100** |
| **Stamps** | Permanent Storage | Mar 2023 | **71/100** |
| **Runes** | Fungible Tokens | Apr 2024 | **79/100** |
| **BRC-20** | Fungible Tokens | Mar 2023 | **68/100** |
| **Atomicals** | NFTs, Tokens, Names | Sep 2023 | **74/100** |

---

## Protocols Overview

### ANCHOR Protocol

A minimalist metaprotocol for recording chained messages on the Bitcoin blockchain. Designed for threaded conversations, governance, and stateful applications.

**Key Features:**
- Multi-carrier support (OP_RETURN, Inscriptions, Stamps, Taproot, Witness)
- Compact anchor references (9 bytes)
- 60+ extensible kinds (similar to Nostr)
- Native threading and reply system
- Full-stack: Indexer, SDKs (Rust + TypeScript), Explorer

### Ordinals (Inscriptions)

The most popular protocol for inscribing arbitrary data onto individual satoshis, creating digital artifacts (NFTs) on Bitcoin.

**Key Features:**
- Ordinal theory for satoshi numbering
- Witness data storage (SegWit discount)
- Support for any content type (images, video, HTML)
- Large ecosystem of marketplaces and tools

### Bitcoin Stamps (SRC-20)

A protocol that stores data directly in UTXO outputs, ensuring permanent and unprunable storage.

**Key Features:**
- Data stored in bare multisig outputs
- Cannot be pruned by nodes
- SRC-20 token standard
- Smaller data limits but guaranteed permanence

### Runes

A fungible token protocol designed by Casey Rodarmor (Ordinals creator) for efficient token issuance and transfer.

**Key Features:**
- UTXO-based token model
- Uses OP_RETURN for data
- Designed to reduce UTXO bloat
- Native to Bitcoin (no external token required)

### BRC-20

The first fungible token standard built on Ordinals inscriptions using JSON-based operations.

**Key Features:**
- Deploy/Mint/Transfer operations via JSON inscriptions
- First-mover advantage in Bitcoin tokens
- High liquidity on exchanges
- Simple conceptual model

### Atomicals (ARC-20)

A comprehensive protocol supporting NFTs, fungible tokens, and decentralized naming (Realms).

**Key Features:**
- UTXO-native tokens
- Bitwork mining (PoW for fair distribution)
- Realms (decentralized domain names)
- Containers (decentralized collections)

---

## Technical Benchmark

### Data Storage Characteristics

| Metric | ANCHOR | Ordinals | Stamps | Runes | BRC-20 | Atomicals |
|--------|--------|----------|--------|-------|--------|-----------|
| **Storage Location** | Multi (configurable) | Witness | UTXO (multisig) | OP_RETURN | Witness | Witness |
| **Max Data Size** | 80B - 4MB | ~4MB | ~8KB | ~80B | ~80B/op | ~4MB |
| **Prunable** | Configurable | Yes | **No** | Yes | Yes | Yes |
| **UTXO Bloat** | Configurable | No | **Yes** | No | No | Minimal |
| **Witness Discount** | When using inscriptions | Yes (75%) | No | N/A | Yes | Yes |

### Transaction Costs (Estimated)

| Operation | ANCHOR | Ordinals | Stamps | Runes | BRC-20 | Atomicals |
|-----------|--------|----------|--------|-------|--------|-----------|
| **Simple Message (100B)** | ~200 sats | ~500 sats | ~2000 sats | N/A | N/A | ~500 sats |
| **Image (10KB)** | ~5K sats | ~5K sats | ~50K sats | N/A | N/A | ~5K sats |
| **Token Transfer** | ~300 sats | ~500 sats | ~1K sats | ~300 sats | ~500 sats | ~400 sats |
| **Token Deploy** | ~500 sats | ~1K sats | ~2K sats | ~500 sats | ~1K sats | ~1K sats |

*Costs at 10 sat/vB fee rate*

### Protocol Complexity

| Aspect | ANCHOR | Ordinals | Stamps | Runes | BRC-20 | Atomicals |
|--------|--------|----------|--------|-------|--------|-----------|
| **Indexer Complexity** | Medium | High | Medium | Medium | Medium | High |
| **Parsing Complexity** | Low | Medium | Medium | Medium | Low | High |
| **SDK Availability** | Rust, TypeScript | Rust (ord) | Various | Various | Various | TypeScript |
| **Documentation** | Good | Good | Medium | Good | Medium | Medium |

### Feature Matrix

| Feature | ANCHOR | Ordinals | Stamps | Runes | BRC-20 | Atomicals |
|---------|--------|----------|--------|-------|--------|-----------|
| **NFTs/Media** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Fungible Tokens** | ✅ (interop) | Via BRC-20 | Via SRC-20 | ✅ | ✅ | ✅ |
| **Threading/Replies** | ✅ Native | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Governance/Voting** | ✅ Native | ❌ | ❌ | ❌ | ❌ | ❌ |
| **State Management** | ✅ Native | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Multi-Carrier** | ✅ Unique | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Extensible Types** | ✅ 60+ kinds | MIME types | MIME types | Fixed ops | 3 ops | Fixed types |
| **Decentralized Names** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Realms |
| **PoW Mining** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Bitwork |

---

## Use Case Analysis

### Social & Communication Applications

| Criterion | ANCHOR | Ordinals | Stamps | Runes | BRC-20 | Atomicals |
|-----------|--------|----------|--------|-------|--------|-----------|
| Threaded Discussions | ⭐⭐⭐⭐⭐ | ⭐ | ⭐ | ⭐ | ⭐ | ⭐⭐ |
| Social Networks | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐ | ⭐ | ⭐⭐ |
| Comments/Replies | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐ | ⭐ | ⭐⭐ |
| **Subtotal** | **15/15** | **5/15** | **3/15** | **3/15** | **3/15** | **6/15** |

### Governance & DAOs

| Criterion | ANCHOR | Ordinals | Stamps | Runes | BRC-20 | Atomicals |
|-----------|--------|----------|--------|-------|--------|-----------|
| Voting Systems | ⭐⭐⭐⭐⭐ | ⭐ | ⭐ | ⭐ | ⭐ | ⭐⭐ |
| Proposals | ⭐⭐⭐⭐⭐ | ⭐ | ⭐ | ⭐ | ⭐ | ⭐⭐ |
| Delegation | ⭐⭐⭐⭐ | ⭐ | ⭐ | ⭐ | ⭐ | ⭐ |
| **Subtotal** | **14/15** | **3/15** | **3/15** | **3/15** | **3/15** | **5/15** |

### Digital Art & NFTs

| Criterion | ANCHOR | Ordinals | Stamps | Runes | BRC-20 | Atomicals |
|-----------|--------|----------|--------|-------|--------|-----------|
| Image Storage | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ | ⭐ | ⭐⭐⭐⭐ |
| Rich Media | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐ | ⭐⭐⭐⭐ |
| Marketplace Support | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ | ⭐ | ⭐⭐⭐ |
| **Subtotal** | **9/15** | **15/15** | **9/15** | **3/15** | **3/15** | **11/15** |

### Fungible Tokens

| Criterion | ANCHOR | Ordinals | Stamps | Runes | BRC-20 | Atomicals |
|-----------|--------|----------|--------|-------|--------|-----------|
| Token Efficiency | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Liquidity | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Native Support | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Subtotal** | **8/15** | **7/15** | **7/15** | **14/15** | **11/15** | **9/15** |

### Developer Experience

| Criterion | ANCHOR | Ordinals | Stamps | Runes | BRC-20 | Atomicals |
|-----------|--------|----------|--------|-------|--------|-----------|
| SDK Quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Documentation | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Ease of Integration | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Subtotal** | **14/15** | **11/15** | **9/15** | **11/15** | **10/15** | **8/15** |

---

## Scoring Methodology

Each protocol is evaluated across 10 categories on a scale of 1-10:

| Category | Weight | Description |
|----------|--------|-------------|
| **Technical Design** | 15% | Architecture, efficiency, innovation |
| **Data Permanence** | 10% | Resistance to pruning, censorship |
| **Cost Efficiency** | 15% | Transaction costs for common operations |
| **Ecosystem Maturity** | 10% | Tooling, marketplaces, adoption |
| **Developer Experience** | 15% | SDKs, documentation, ease of use |
| **Messaging/Social** | 10% | Threading, replies, social features |
| **Token Capabilities** | 10% | Fungible and non-fungible token support |
| **Flexibility** | 5% | Extensibility, adaptability |
| **Unique Features** | 5% | Distinctive capabilities |
| **Future-Proofing** | 5% | Upgrade path, roadmap |

---

## Final Scores

### ANCHOR Protocol

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Technical Design | 9/10 | 15% | 13.5 |
| Data Permanence | 9/10 | 10% | 9.0 |
| Cost Efficiency | 9/10 | 15% | 13.5 |
| Ecosystem Maturity | 6/10 | 10% | 6.0 |
| Developer Experience | 9/10 | 15% | 13.5 |
| Messaging/Social | 10/10 | 10% | 10.0 |
| Token Capabilities | 7/10 | 10% | 7.0 |
| Flexibility | 10/10 | 5% | 5.0 |
| Unique Features | 10/10 | 5% | 5.0 |
| Future-Proofing | 9/10 | 5% | 4.5 |
| **TOTAL** | | | **87.0/100** |

**Strengths:**
- ✅ Best-in-class for messaging and social applications
- ✅ Unique multi-carrier architecture
- ✅ Excellent developer experience with full SDK
- ✅ Native threading and governance support
- ✅ Most flexible with 60+ extensible kinds

**Weaknesses:**
- ⚠️ Newer protocol, smaller ecosystem
- ⚠️ Token support via interop, not native

---

### Ordinals (Inscriptions)

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Technical Design | 8/10 | 15% | 12.0 |
| Data Permanence | 6/10 | 10% | 6.0 |
| Cost Efficiency | 7/10 | 15% | 10.5 |
| Ecosystem Maturity | 10/10 | 10% | 10.0 |
| Developer Experience | 8/10 | 15% | 12.0 |
| Messaging/Social | 4/10 | 10% | 4.0 |
| Token Capabilities | 8/10 | 10% | 8.0 |
| Flexibility | 8/10 | 5% | 4.0 |
| Unique Features | 9/10 | 5% | 4.5 |
| Future-Proofing | 8/10 | 5% | 4.0 |
| **TOTAL** | | | **82.0/100** |

**Strengths:**
- ✅ Largest ecosystem and adoption
- ✅ Best for NFTs and digital art
- ✅ Strong community and marketplace support
- ✅ Proven technology

**Weaknesses:**
- ⚠️ Prunable data (witness can be discarded)
- ⚠️ No native threading or messaging
- ⚠️ Complex satoshi tracking

---

### Runes

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Technical Design | 9/10 | 15% | 13.5 |
| Data Permanence | 6/10 | 10% | 6.0 |
| Cost Efficiency | 9/10 | 15% | 13.5 |
| Ecosystem Maturity | 7/10 | 10% | 7.0 |
| Developer Experience | 7/10 | 15% | 10.5 |
| Messaging/Social | 2/10 | 10% | 2.0 |
| Token Capabilities | 10/10 | 10% | 10.0 |
| Flexibility | 5/10 | 5% | 2.5 |
| Unique Features | 8/10 | 5% | 4.0 |
| Future-Proofing | 8/10 | 5% | 4.0 |
| **TOTAL** | | | **79.0/100** |

**Strengths:**
- ✅ Best for fungible tokens
- ✅ Efficient UTXO-based design
- ✅ Created by Ordinals founder
- ✅ Low transaction costs

**Weaknesses:**
- ⚠️ Only supports fungible tokens
- ⚠️ No NFT or messaging support
- ⚠️ Still maturing

---

### Atomicals (ARC-20)

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Technical Design | 8/10 | 15% | 12.0 |
| Data Permanence | 8/10 | 10% | 8.0 |
| Cost Efficiency | 6/10 | 15% | 9.0 |
| Ecosystem Maturity | 6/10 | 10% | 6.0 |
| Developer Experience | 6/10 | 15% | 9.0 |
| Messaging/Social | 4/10 | 10% | 4.0 |
| Token Capabilities | 8/10 | 10% | 8.0 |
| Flexibility | 7/10 | 5% | 3.5 |
| Unique Features | 9/10 | 5% | 4.5 |
| Future-Proofing | 7/10 | 5% | 3.5 |
| **TOTAL** | | | **74.0/100** |

**Strengths:**
- ✅ Unique Realms (decentralized names)
- ✅ Bitwork mining for fair distribution
- ✅ UTXO-native tokens
- ✅ Comprehensive feature set

**Weaknesses:**
- ⚠️ Complex protocol
- ⚠️ Smaller ecosystem
- ⚠️ Steeper learning curve

---

### Stamps (SRC-20)

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Technical Design | 7/10 | 15% | 10.5 |
| Data Permanence | 10/10 | 10% | 10.0 |
| Cost Efficiency | 4/10 | 15% | 6.0 |
| Ecosystem Maturity | 6/10 | 10% | 6.0 |
| Developer Experience | 6/10 | 15% | 9.0 |
| Messaging/Social | 3/10 | 10% | 3.0 |
| Token Capabilities | 7/10 | 10% | 7.0 |
| Flexibility | 5/10 | 5% | 2.5 |
| Unique Features | 8/10 | 5% | 4.0 |
| Future-Proofing | 6/10 | 5% | 3.0 |
| **TOTAL** | | | **71.0/100** |

**Strengths:**
- ✅ Truly permanent storage (unprunable)
- ✅ Censorship resistant
- ✅ SRC-20 token support

**Weaknesses:**
- ⚠️ Highest transaction costs
- ⚠️ UTXO bloat concerns
- ⚠️ Limited data size

---

### BRC-20

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Technical Design | 5/10 | 15% | 7.5 |
| Data Permanence | 6/10 | 10% | 6.0 |
| Cost Efficiency | 5/10 | 15% | 7.5 |
| Ecosystem Maturity | 9/10 | 10% | 9.0 |
| Developer Experience | 7/10 | 15% | 10.5 |
| Messaging/Social | 2/10 | 10% | 2.0 |
| Token Capabilities | 8/10 | 10% | 8.0 |
| Flexibility | 3/10 | 5% | 1.5 |
| Unique Features | 5/10 | 5% | 2.5 |
| Future-Proofing | 5/10 | 5% | 2.5 |
| **TOTAL** | | | **68.0/100** |

**Strengths:**
- ✅ First-mover advantage
- ✅ High liquidity and adoption
- ✅ Simple conceptual model

**Weaknesses:**
- ⚠️ Inefficient design (JSON spam)
- ⚠️ Criticized by Ordinals creator
- ⚠️ Limited functionality

---

## Final Ranking

```
┌────────────────────────────────────────────────────────────────────┐
│                     FINAL PROTOCOL RANKING                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🥇 1. ANCHOR          ████████████████████████████████████░░ 87/100│
│     Best for: Messaging, Social, Governance                         │
│                                                                     │
│  🥈 2. Ordinals        ██████████████████████████████████░░░░ 82/100│
│     Best for: NFTs, Digital Art, Media                              │
│                                                                     │
│  🥉 3. Runes           ███████████████████████████████░░░░░░░ 79/100│
│     Best for: Fungible Tokens                                       │
│                                                                     │
│  4. Atomicals          ██████████████████████████████░░░░░░░░ 74/100│
│     Best for: NFTs + Tokens + Names                                 │
│                                                                     │
│  5. Stamps             █████████████████████████████░░░░░░░░░ 71/100│
│     Best for: Permanent Storage                                     │
│                                                                     │
│  6. BRC-20             ████████████████████████████░░░░░░░░░░ 68/100│
│     Best for: Token Trading (legacy)                                │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Conclusion

### Choose Your Protocol Based on Use Case

| If You Need... | Choose |
|----------------|--------|
| Social applications, forums, comments | **ANCHOR** |
| Governance, voting, DAOs | **ANCHOR** |
| Threaded conversations | **ANCHOR** |
| Multi-carrier flexibility | **ANCHOR** |
| NFTs and digital art | **Ordinals** |
| Rich media (video, 3D, HTML) | **Ordinals** |
| Efficient fungible tokens | **Runes** |
| Permanent/unprunable storage | **Stamps** |
| Decentralized naming | **Atomicals** |
| Token trading with liquidity | **BRC-20** |

### Key Takeaways

1. **ANCHOR** leads in messaging and social applications with its unique multi-carrier architecture and native threading support.

2. **Ordinals** remains the king of NFTs and digital artifacts with the largest ecosystem.

3. **Runes** is the most efficient choice for fungible tokens.

4. **Stamps** offers the only truly unprunable storage but at higher costs.

5. **Atomicals** provides unique features (Realms, Bitwork) but with higher complexity.

6. **BRC-20** has first-mover advantage but is being superseded by better designs.

---

## References

- [ANCHOR Protocol Documentation](../README.md)
- [Ordinals Documentation](https://docs.ordinals.com/)
- [Runes Documentation](https://docs.ordinals.com/runes.html)
- [Bitcoin Stamps](https://stampchain.io/)
- [Atomicals Guide](https://atomicals.xyz/)
- [BRC-20 Standard](https://domo-2.gitbook.io/brc-20-experiment/)

---

*This benchmark is maintained by the ANCHOR Protocol team and updated as protocols evolve.*

