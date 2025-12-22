# @AnchorProtocol/sdk

TypeScript SDK for the ANCHOR protocol - create and parse chained messages on Bitcoin.

## Features

- 📦 **Dual Package** - Works in Node.js and browsers
- 🔗 **Protocol Compliant** - Encodes and parses ANCHOR v1 messages
- 🔑 **Wallet Support** - Connect to Bitcoin Core (Node.js)
- 🏗️ **Transaction Builder** - Build PSBT transactions
- 📝 **TypeScript** - Full type definitions

## Installation

```bash
npm install @AnchorProtocol/sdk
# or
pnpm add @AnchorProtocol/sdk
# or
yarn add @AnchorProtocol/sdk
```

## Quick Start

### Node.js with Bitcoin Core

```typescript
import { AnchorWallet, WalletConfig } from "@AnchorProtocol/sdk";

// Connect to Bitcoin Core
const wallet = new AnchorWallet(
  WalletConfig.regtest("http://localhost:18443", "user", "pass")
);

// Create a root message (new thread)
const result = await wallet.createRootMessage("Hello, ANCHOR!");
console.log("Created:", result.txid);

// Reply to a message
const reply = await wallet.createReply(
  "This is a reply!",
  result.txid,
  0 // vout
);

// Check balance
const balance = await wallet.getBalance();
console.log("Balance:", balance.total, "sats");

// Mine blocks (regtest)
await wallet.mineBlocks(1);
```

### Browser / Encoding Only

```typescript
import {
  encodeTextMessage,
  encodeReplyMessage,
  parseAnchorPayload,
  isAnchorPayload,
} from "@AnchorProtocol/sdk/browser";

// Encode a root message
const payload = encodeTextMessage("Hello, ANCHOR!");
console.log("Payload:", payload);

// Encode a reply
const replyPayload = encodeReplyMessage(
  "This is a reply!",
  "abc123...", // parent txid
  0 // parent vout
);

// Parse a message
const message = parseAnchorPayload(payload);
console.log("Kind:", message.kind);
console.log("Body:", new TextDecoder().decode(message.body));
```

### Transaction Builder

```typescript
import { createTransactionBuilder, AnchorKind } from "@AnchorProtocol/sdk";

const builder = createTransactionBuilder()
  .setNetwork("regtest")
  .setFeeRate(2)
  .addInput({
    txid: "abc123...",
    vout: 0,
    value: 50000,
    scriptPubKey: "0014...",
  })
  .setChangeAddress("bcrt1q...")
  .setBody("Custom message")
  .replyTo("parent-txid", 0);

const { psbt, fee, payload } = builder.build();

// Sign with external signer
// psbt.signInput(0, keypair);
// psbt.finalizeAllInputs();
// const tx = psbt.extractTransaction();
```

## API Reference

### Types

```typescript
// Message kinds
enum AnchorKind {
  Generic = 0,
  Text = 1,
  State = 2,
  Vote = 3,
}

// Anchor (parent reference)
interface Anchor {
  txidPrefix: Uint8Array; // 8 bytes
  vout: number;
}

// Parsed message
interface AnchorMessage {
  kind: AnchorKind;
  anchors: Anchor[];
  body: Uint8Array;
}
```

### Encoding Functions

```typescript
// Encode a message
encodeAnchorPayload(message: AnchorMessage): Uint8Array

// Create a text message payload
encodeTextMessage(text: string, anchors?: Array<{txid: string, vout: number}>): Uint8Array

// Create a root message (no anchors)
encodeRootMessage(text: string): Uint8Array

// Create a reply
encodeReplyMessage(text: string, parentTxid: string, parentVout?: number): Uint8Array

// Convert txid to 8-byte prefix
txidToPrefix(txid: string): Uint8Array

// Calculate max body size given anchor count
maxBodySize(anchorCount: number): number
```

### Parsing Functions

```typescript
// Check if data is ANCHOR payload
isAnchorPayload(data: Uint8Array): boolean

// Parse payload
parseAnchorPayload(data: Uint8Array): AnchorMessage

// Parse as text message
parseTextMessage(data: Uint8Array): TextMessage

// Check if anchor matches txid
anchorMatchesTxid(anchor: Anchor, txid: string): boolean

// Parse OP_RETURN script
parseFromOpReturn(script: Uint8Array): AnchorMessage | null
```

### Wallet (Node.js only)

```typescript
class AnchorWallet {
  constructor(config: WalletConfig);

  // Balance & Address
  getBalance(): Promise<Balance>;
  getNewAddress(): Promise<string>;
  listUtxos(minConfirmations?: number): Promise<Utxo[]>;

  // Messages
  createRootMessage(text: string): Promise<TransactionResult>;
  createReply(text: string, parentTxid: string, parentVout?: number): Promise<TransactionResult>;
  createMessage(options: CreateMessageOptions): Promise<TransactionResult>;

  // Transactions
  signAndBroadcast(psbt: Psbt): Promise<{txid: string, hex: string}>;
  broadcast(hex: string): Promise<string>;

  // Regtest
  mineBlocks(count?: number): Promise<string[]>;
}
```

### Config Helpers

```typescript
const WalletConfig = {
  mainnet(url, user, pass): WalletConfig,
  testnet(url, user, pass): WalletConfig,
  signet(url, user, pass): WalletConfig,
  regtest(url, user, pass): WalletConfig,
};
```

## Protocol Details

ANCHOR messages are embedded in OP_RETURN outputs:

```
┌─────────────┬──────────┬──────────────────┬────────────────┬─────────────┐
│ Magic (4B)  │ Kind (1B)│ Anchor Count (1B)│ Anchors (9B×N) │ Body (var)  │
└─────────────┴──────────┴──────────────────┴────────────────┴─────────────┘
```

- **Magic**: `0xA11C0001` (ANCHOR v1)
- **Kind**: 0=generic, 1=text, 2=state, 3=vote
- **Anchor**: 8 bytes txid prefix + 1 byte vout
- **Body**: Message content (UTF-8 for text, binary otherwise)

## Browser Support

The `/browser` export excludes Node.js-specific features (wallet):

```typescript
// Works in browser
import { encodeTextMessage, parseAnchorPayload } from "@AnchorProtocol/sdk/browser";

// Won't work in browser (needs Node.js)
import { AnchorWallet } from "@AnchorProtocol/sdk"; // ❌
```

## License

MIT

