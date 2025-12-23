# Carrier Types

A **carrier** is the method used to embed Anchor message data within a Bitcoin transaction.

## Overview

| Carrier | ID | Max Size | Prunable | Witness Discount | Status |
|---------|-----|----------|----------|------------------|--------|
| OP_RETURN | 0 | 100 KB* | Yes | No | Active |
| Inscription | 1 | ~4 MB | Yes | Yes (75%) | Active |
| Stamps | 2 | ~8 KB | No | No | Active |
| Taproot Annex | 3 | ~10 KB | Yes | Yes (75%) | Reserved |
| Witness Data | 4 | ~4 MB | Yes | Yes (75%) | Active |

*OP_RETURN size depends on `datacarriersize` setting. Bitcoin Core v30+ supports up to 100KB.

## OP_RETURN (Default)

Data stored in a provably unspendable output.

```
OP_RETURN <anchor_message_bytes>
```

| Property | Value |
|----------|-------|
| Max payload | 100 KB (with `datacarriersize=100000`) |
| UTXO impact | None (unspendable) |
| Prunable | Yes |
| Fee calculation | Full weight |

**Best for:** Text messages, batch operations, maximum compatibility.

## Inscription

Data embedded in Taproot witness using Ordinals envelope format.

| Property | Value |
|----------|-------|
| Max payload | ~4 MB |
| UTXO impact | Creates dust UTXO |
| Prunable | Yes |
| Fee calculation | 0.25 weight units/byte |

**Best for:** Large payloads, Ordinals compatibility.

## Stamps

Data encoded in bare multisig outputs. **Unprunable**.

| Property | Value |
|----------|-------|
| Max payload | ~8 KB |
| UTXO impact | Permanent until spent |
| Prunable | **No** |
| Fee calculation | Full weight |

**Best for:** Permanent storage, maximum censorship resistance.

::: danger UTXO Impact
Stamps create unspendable UTXOs that every full node must store forever.
:::

## Witness Data

Data embedded directly in Tapscript witness without Ordinals envelope.

| Property | Value |
|----------|-------|
| Max payload | ~4 MB |
| UTXO impact | Minimal |
| Prunable | Yes |
| Fee calculation | 0.25 weight units/byte |

**Best for:** Large payloads, cost efficiency.

## Selection Guide

```
              ┌─────────────────────┐
              │  Message Size?      │
              └─────────┬───────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
   < 70 bytes     70B - 8KB        > 8KB
        │               │               │
        ▼               ▼               ▼
  ┌───────────┐  ┌─────────────┐  ┌───────────────┐
  │ OP_RETURN │  │ Need        │  │ Witness Data  │
  │           │  │ permanence? │  │ or Inscription│
  └───────────┘  └──────┬──────┘  └───────────────┘
                        │
              ┌─────────┼─────────┐
             Yes                  No
              │                   │
              ▼                   ▼
        ┌─────────┐        ┌─────────────┐
        │ Stamps  │        │ Witness Data│
        └─────────┘        └─────────────┘
```

## See Also

- [Message Format](/concepts/message-format) - Binary structure
- [Threading](/concepts/threading) - Message chains
- [SDK Encoding](/sdk/encoding) - TypeScript SDK

