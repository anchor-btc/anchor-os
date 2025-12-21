# Carrier Types

A **carrier** is the method used to embed Anchor message data within a Bitcoin transaction. Each carrier has different characteristics for size limits, cost, pruning behavior, and compatibility.

## Overview

| Carrier | ID | Max Size | Prunable | Witness Discount | Status |
|---------|-----|----------|----------|------------------|--------|
| OP_RETURN | 0 | 80 bytes | Yes | No | Active |
| Inscription | 1 | ~4 MB | Yes | Yes (75%) | Active |
| Stamps | 2 | ~8 KB | No | No | Active |
| Taproot Annex | 3 | ~10 KB | Yes | Yes (75%) | Reserved |
| Witness Data | 4 | ~4 MB | Yes | Yes (75%) | Active |

## OP_RETURN (Default)

The simplest and most widely supported carrier. Data is stored in a provably unspendable output using the `OP_RETURN` opcode.

```
OP_RETURN <anchor_message_bytes>
```

### Characteristics

| Property | Value |
|----------|-------|
| Max payload | 80 bytes (83 with opcode) |
| UTXO impact | None (unspendable) |
| Relay policy | Standard, widely relayed |
| Prunable | Yes (by nodes with -prune) |
| Fee calculation | Full weight (no discount) |

### Best For

- Short text messages (<70 chars with header)
- Hashes and proofs (32-64 byte payloads)
- Maximum compatibility

### Example

```typescript
import { CarrierType } from '@AnchorProtocol/anchor-sdk'

const message = createMessage({
  kind: AnchorKind.Text,
  body: 'gm',
  carrier: CarrierType.OpReturn
})
// Payload: 8 bytes (magic + kind + anchor_count + "gm")
```

::: warning Size Limit
Bitcoin Core's default policy limits OP_RETURN to 80 bytes. Messages exceeding this must use a different carrier.
:::

## Inscription (Ordinals-style)

Data is embedded in the witness of a Taproot spend, using the Ordinals envelope format. Benefits from the 75% witness discount.

```
OP_FALSE OP_IF
  OP_PUSH "ord"
  OP_PUSH 1
  OP_PUSH "application/octet-stream"
  OP_PUSH 0
  <data_chunks>
OP_ENDIF
```

### Characteristics

| Property | Value |
|----------|-------|
| Max payload | ~4 MB (block limit) |
| UTXO impact | Creates dust UTXO |
| Relay policy | Widely supported |
| Prunable | Yes |
| Fee calculation | 0.25 weight units/byte |

### Best For

- Large payloads (images, documents)
- When Ordinals ecosystem compatibility matters
- Cost-effective large data storage

### Example

```typescript
const message = createMessage({
  kind: AnchorKind.Image,
  bodyBytes: imageData,  // Up to ~4MB
  carrier: CarrierType.Inscription
})
```

## Stamps (Bare Multisig)

Data is encoded in fake public keys within bare multisig outputs. This creates **unprunable** data that persists in every full node's UTXO set.

```
OP_1 <pubkey1> <pubkey2> ... OP_N OP_CHECKMULTISIG
```

### Characteristics

| Property | Value |
|----------|-------|
| Max payload | ~8 KB |
| UTXO impact | Permanent (until spent) |
| Relay policy | May require higher fees |
| Prunable | **No** - stored in UTXO set |
| Fee calculation | Full weight |

### Best For

- Permanent, unprunable storage
- Critical data that must survive chain reorganizations
- Maximum censorship resistance

### Trade-offs

- Higher fees (no witness discount + UTXO cost)
- Controversial: increases UTXO set bloat
- Outputs should eventually be spent to release UTXOs

::: danger UTXO Impact
Stamps create unspendable UTXOs that every full node must store forever. Use responsibly and consider the network impact.
:::

## Taproot Annex

The Taproot annex is a reserved field in BIP-341 that could carry arbitrary data. Currently **reserved** pending activation.

### Characteristics

| Property | Value |
|----------|-------|
| Max payload | TBD (~10 KB expected) |
| Relay policy | Not currently relayed |
| Status | **Reserved** for future use |

::: info Not Yet Available
The Taproot annex requires additional consensus rules before it can be safely used for data embedding. This carrier is reserved for future protocol versions.
:::

## Witness Data (Raw)

Similar to Inscriptions but without the Ordinals envelope overhead. Data is embedded directly in Tapscript witness.

### Characteristics

| Property | Value |
|----------|-------|
| Max payload | ~4 MB |
| UTXO impact | Minimal |
| Relay policy | Supported |
| Prunable | Yes |
| Fee calculation | 0.25 weight units/byte |

### Best For

- Large payloads without Ordinals compatibility needs
- Most cost-effective for big data
- When you control the parsing stack

## Carrier Selection Guide

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

## Fee Comparison

For a 1000-byte payload at 10 sat/vB:

| Carrier | Weight Units | vBytes | Fee |
|---------|--------------|--------|-----|
| OP_RETURN | 4000 | 1000 | ❌ Exceeds limit |
| Inscription | 1000 | 250 | 2,500 sats |
| Stamps | 4000 | 1000 | 10,000 sats |
| Witness Data | 1000 | 250 | 2,500 sats |

## TypeScript API

```typescript
import { 
  CarrierType, 
  getCarrierInfo, 
  getActiveCarriers 
} from '@AnchorProtocol/anchor-sdk'

// Get carrier details
const info = getCarrierInfo(CarrierType.OpReturn)
// {
//   type: 0,
//   name: "op_return",
//   maxSize: 80,
//   isPrunable: true,
//   utxoImpact: false,
//   witnessDiscount: false,
//   status: "active"
// }

// List active carriers
const active = getActiveCarriers()
// [OpReturn, Inscription, Stamps, WitnessData]
```

## Next Steps

- [Anchoring System](/protocol/anchoring) - Create message threads
- [SDK Integration](/sdk/wallet) - Transaction building
- [Examples](/examples/create-message) - Real-world usage



