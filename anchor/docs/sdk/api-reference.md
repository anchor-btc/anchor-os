# API Reference

Complete reference for the Anchor Protocol SDK.

## Constants

### ANCHOR_MAGIC

Protocol identifier and version bytes.

```typescript
const ANCHOR_MAGIC: Uint8Array = new Uint8Array([0xa1, 0x1c, 0x00, 0x01])
```

### Size Constants

```typescript
const TXID_PREFIX_SIZE = 8      // Bytes for txid prefix
const ANCHOR_SIZE = 9           // Bytes per anchor (prefix + vout)
const MIN_PAYLOAD_SIZE = 6      // Magic + kind + anchor_count
const MAX_OP_RETURN_SIZE = 80   // Standard OP_RETURN limit
const MAX_WITNESS_SIZE = 4_000_000  // ~4MB witness limit
```

## Enums

### AnchorKind

```typescript
enum AnchorKind {
  Generic = 0,   // Raw binary
  Text = 1,      // UTF-8 text
  State = 2,     // State update
  Vote = 3,      // Governance
}
```

### CarrierType

```typescript
enum CarrierType {
  OpReturn = 0,      // OP_RETURN output
  Inscription = 1,   // Ordinals inscription
  Stamps = 2,        // Bare multisig
  TaprootAnnex = 3,  // Reserved
  WitnessData = 4,   // Raw witness
}
```

### CarrierStatus

```typescript
enum CarrierStatus {
  Active = 'active',
  Reserved = 'reserved',
  Proposed = 'proposed',
  Deprecated = 'deprecated',
}
```

### AnchorErrorCode

```typescript
enum AnchorErrorCode {
  InvalidMagic = 'INVALID_MAGIC',
  PayloadTooShort = 'PAYLOAD_TOO_SHORT',
  TruncatedAnchors = 'TRUNCATED_ANCHORS',
  MessageTooLarge = 'MESSAGE_TOO_LARGE',
  InvalidTxid = 'INVALID_TXID',
  InsufficientFunds = 'INSUFFICIENT_FUNDS',
  NoUtxos = 'NO_UTXOS',
  RpcError = 'RPC_ERROR',
  SigningError = 'SIGNING_ERROR',
}
```

## Interfaces

### AnchorMessage

```typescript
interface AnchorMessage {
  kind: number
  anchors: Anchor[]
  body: Uint8Array
}
```

### Anchor

```typescript
interface Anchor {
  txidPrefix: Uint8Array  // 8 bytes
  vout: number            // 0-255
}
```

### TextMessage

```typescript
interface TextMessage extends AnchorMessage {
  kind: 1
  text: string
}
```

### CreateMessageOptions

```typescript
interface CreateMessageOptions {
  kind?: AnchorKind
  body?: string              // For text messages
  bodyBytes?: Uint8Array     // For binary messages
  anchors?: Array<{ txid: string; vout: number }>
  carrier?: CarrierType
}
```

### CarrierInfo

```typescript
interface CarrierInfo {
  type: CarrierType
  name: string
  maxSize: number
  isPrunable: boolean
  utxoImpact: boolean
  witnessDiscount: boolean
  status: CarrierStatus
}
```

### WalletConfig

```typescript
interface WalletConfig {
  rpcUrl: string
  rpcUser: string
  rpcPassword: string
  network: Network
  walletName?: string
  feeRate?: number
}
```

### TransactionResult

```typescript
interface TransactionResult {
  txid: string
  hex: string
  vout: number
  carrier: CarrierType
  fee?: number
  size?: number
}
```

### Balance

```typescript
interface Balance {
  confirmed: number
  unconfirmed: number
  total: number
}
```

### Utxo

```typescript
interface Utxo {
  txid: string
  vout: number
  value: number
  scriptPubKey: string
}
```

### AnchorResolution

```typescript
type AnchorResolution =
  | { status: 'resolved'; txid: string }
  | { status: 'orphan' }
  | { status: 'ambiguous'; candidates: string[] }
```

## Functions

### createMessage

Create an encoded Anchor message.

```typescript
function createMessage(options: CreateMessageOptions): Uint8Array
```

**Parameters:**
- `options.kind` - Message kind (default: `AnchorKind.Text`)
- `options.body` - Text body (for text messages)
- `options.bodyBytes` - Binary body
- `options.anchors` - Parent references
- `options.carrier` - Carrier type

**Returns:** Encoded message as `Uint8Array`

**Example:**
```typescript
const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Hello!',
  anchors: [{ txid: 'abc...', vout: 0 }]
})
```

---

### parseMessage

Parse an Anchor message from bytes.

```typescript
function parseMessage(bytes: Uint8Array): AnchorMessage | null
```

**Parameters:**
- `bytes` - Raw message bytes

**Returns:** Parsed `AnchorMessage` or `null` if invalid

**Example:**
```typescript
const message = parseMessage(bytes)
if (message) {
  console.log('Kind:', message.kind)
}
```

---

### createAnchor

Create an anchor reference from a transaction ID.

```typescript
function createAnchor(txid: string, vout: number): Anchor
```

**Parameters:**
- `txid` - 64-character hex transaction ID
- `vout` - Output index (0-255)

**Returns:** `Anchor` with 8-byte prefix and vout

---

### getCarrierInfo

Get information about a carrier type.

```typescript
function getCarrierInfo(type: CarrierType): CarrierInfo
```

**Returns:** Carrier details including max size, pruning, discount

---

### getActiveCarriers

Get list of active carrier types.

```typescript
function getActiveCarriers(): CarrierType[]
```

**Returns:** Array of active `CarrierType` values

---

### bytesToHex

Convert bytes to hexadecimal string.

```typescript
function bytesToHex(bytes: Uint8Array): string
```

---

### hexToBytes

Convert hexadecimal string to bytes.

```typescript
function hexToBytes(hex: string): Uint8Array
```

---

### encodeVarint

Encode a number as Bitcoin varint.

```typescript
function encodeVarint(value: bigint): Uint8Array
```

---

### decodeVarint

Decode a Bitcoin varint from bytes.

```typescript
function decodeVarint(bytes: Uint8Array, offset: number): [bigint, number]
```

**Returns:** Tuple of `[value, bytesRead]`

## Classes

### AnchorWallet

Bitcoin wallet for Anchor operations.

```typescript
class AnchorWallet {
  constructor(config: WalletConfig)
  
  // Broadcasting
  broadcast(message: Uint8Array, options?: BroadcastOptions): Promise<TransactionResult>
  broadcastRaw(hex: string): Promise<string>
  
  // Balance and UTXOs
  getBalance(): Promise<Balance>
  getUtxos(): Promise<Utxo[]>
  
  // Fee estimation
  estimateFee(blocks: number): Promise<number>
  
  // Address management
  getNewAddress(type?: AddressType): Promise<string>
  
  // Transaction queries
  getTransaction(txid: string): Promise<Transaction>
  listTransactions(options?: ListOptions): Promise<Transaction[]>
  
  // Static constructors
  static fromPrivateKey(wif: string, network: Network): AnchorWallet
  static fromMnemonic(phrase: string, network: Network, path?: string): AnchorWallet
}
```

### AnchorError

Custom error class for Anchor operations.

```typescript
class AnchorError extends Error {
  code: AnchorErrorCode
  
  constructor(code: AnchorErrorCode, message: string)
}
```

## Type Guards

### isTextMessage

```typescript
function isTextMessage(message: AnchorMessage): message is TextMessage
```

### isAnchorMessage

```typescript
function isAnchorMessage(bytes: Uint8Array): boolean
```

## Kind-Specific APIs

### DNS (`@AnchorProtocol/anchor-sdk/dns`)

```typescript
// Enums
enum DnsOperation { REGISTER, UPDATE, TRANSFER }
enum RecordType { A, AAAA, CNAME, TXT, MX, NS, SRV }

// Functions
function encodeDnsPayload(payload: DnsPayload): Uint8Array
function decodeDnsPayload(bytes: Uint8Array): DnsPayload | null
function createAnchorDnsMessage(payload: DnsPayload, anchors?: Anchor[]): Uint8Array

// Utilities
function ipv4ToBytes(ip: string): Uint8Array
function bytesToIpv4(bytes: Uint8Array): string
function isValidDomainName(name: string): boolean
```

### Token (`@AnchorProtocol/anchor-sdk/token`)

```typescript
// Enums
enum TokenOperation { DEPLOY, MINT, TRANSFER, BURN, SPLIT }
enum DeployFlags { NONE, OPEN_MINT, FIXED_SUPPLY, BURNABLE }

// Functions
function encodeDeployPayload(payload: DeployPayload): Uint8Array
function encodeMintPayload(payload: MintPayload): Uint8Array
function encodeTransferPayload(payload: TransferPayload): Uint8Array
function encodeBurnPayload(payload: BurnPayload): Uint8Array
function decodeTokenPayload(bytes: Uint8Array): ParsedTokenOperation | null

// Utilities
function formatTokenAmount(amount: bigint, decimals: number): string
function parseTokenAmount(str: string, decimals: number): bigint
function isValidTicker(ticker: string): boolean
```

### Proof (`@AnchorProtocol/anchor-sdk/proof`)

```typescript
// Enums
enum ProofOperation { STAMP, REVOKE, BATCH }
enum HashAlgorithm { SHA256, SHA512 }

// Functions
function encodeProofPayload(payload: ProofPayload): Uint8Array
function decodeProofPayload(bytes: Uint8Array): ProofPayload | null
function createAnchorProofsMessage(payload: ProofPayload, anchors?: Anchor[]): Uint8Array

// Utilities
function getHashSize(algo: HashAlgorithm): number
function isValidHash(hash: string, algo: HashAlgorithm): boolean
```

### GeoMarker (`@AnchorProtocol/anchor-sdk/geo`)

```typescript
// Functions
function encodeGeoMarker(payload: GeoMarkerPayload): Uint8Array
function decodeGeoMarker(bytes: Uint8Array): GeoMarkerPayload | null
function encodeGeoMarkerHex(payload: GeoMarkerPayload): string

// Utilities
function calculatePayloadSize(messageLength: number): number
function fitsInOpReturn(messageLength: number): boolean
function maxOpReturnMessageLength(): number
```

### Pixel (`@AnchorProtocol/anchor-sdk/pixel`)

```typescript
// Functions
function encodePixel(pixel: Pixel): Uint8Array
function decodePixel(bytes: Uint8Array, offset?: number): Pixel
function encodePixelPayload(pixels: Pixel[]): Uint8Array
function decodePixelPayload(bytes: Uint8Array): Pixel[]
function createAnchorPixelMessage(pixels: Pixel[]): Uint8Array

// Utilities
function validatePixel(pixel: Pixel, width?: number, height?: number): boolean
function batchPixels(pixels: Pixel[]): Pixel[][]
function estimateFee(pixelCount: number, feeRate?: number): number
```

## See Also

- [Getting Started](/sdk/getting-started) - Quick start guide
- [Encoding](/sdk/encoding) - Create messages
- [Parsing](/sdk/parsing) - Read messages
- [Wallet](/sdk/wallet) - Transaction management



Complete reference for the Anchor Protocol SDK.

## Constants

### ANCHOR_MAGIC

Protocol identifier and version bytes.

```typescript
const ANCHOR_MAGIC: Uint8Array = new Uint8Array([0xa1, 0x1c, 0x00, 0x01])
```

### Size Constants

```typescript
const TXID_PREFIX_SIZE = 8      // Bytes for txid prefix
const ANCHOR_SIZE = 9           // Bytes per anchor (prefix + vout)
const MIN_PAYLOAD_SIZE = 6      // Magic + kind + anchor_count
const MAX_OP_RETURN_SIZE = 80   // Standard OP_RETURN limit
const MAX_WITNESS_SIZE = 4_000_000  // ~4MB witness limit
```

## Enums

### AnchorKind

```typescript
enum AnchorKind {
  Generic = 0,   // Raw binary
  Text = 1,      // UTF-8 text
  State = 2,     // State update
  Vote = 3,      // Governance
}
```

### CarrierType

```typescript
enum CarrierType {
  OpReturn = 0,      // OP_RETURN output
  Inscription = 1,   // Ordinals inscription
  Stamps = 2,        // Bare multisig
  TaprootAnnex = 3,  // Reserved
  WitnessData = 4,   // Raw witness
}
```

### CarrierStatus

```typescript
enum CarrierStatus {
  Active = 'active',
  Reserved = 'reserved',
  Proposed = 'proposed',
  Deprecated = 'deprecated',
}
```

### AnchorErrorCode

```typescript
enum AnchorErrorCode {
  InvalidMagic = 'INVALID_MAGIC',
  PayloadTooShort = 'PAYLOAD_TOO_SHORT',
  TruncatedAnchors = 'TRUNCATED_ANCHORS',
  MessageTooLarge = 'MESSAGE_TOO_LARGE',
  InvalidTxid = 'INVALID_TXID',
  InsufficientFunds = 'INSUFFICIENT_FUNDS',
  NoUtxos = 'NO_UTXOS',
  RpcError = 'RPC_ERROR',
  SigningError = 'SIGNING_ERROR',
}
```

## Interfaces

### AnchorMessage

```typescript
interface AnchorMessage {
  kind: number
  anchors: Anchor[]
  body: Uint8Array
}
```

### Anchor

```typescript
interface Anchor {
  txidPrefix: Uint8Array  // 8 bytes
  vout: number            // 0-255
}
```

### TextMessage

```typescript
interface TextMessage extends AnchorMessage {
  kind: 1
  text: string
}
```

### CreateMessageOptions

```typescript
interface CreateMessageOptions {
  kind?: AnchorKind
  body?: string              // For text messages
  bodyBytes?: Uint8Array     // For binary messages
  anchors?: Array<{ txid: string; vout: number }>
  carrier?: CarrierType
}
```

### CarrierInfo

```typescript
interface CarrierInfo {
  type: CarrierType
  name: string
  maxSize: number
  isPrunable: boolean
  utxoImpact: boolean
  witnessDiscount: boolean
  status: CarrierStatus
}
```

### WalletConfig

```typescript
interface WalletConfig {
  rpcUrl: string
  rpcUser: string
  rpcPassword: string
  network: Network
  walletName?: string
  feeRate?: number
}
```

### TransactionResult

```typescript
interface TransactionResult {
  txid: string
  hex: string
  vout: number
  carrier: CarrierType
  fee?: number
  size?: number
}
```

### Balance

```typescript
interface Balance {
  confirmed: number
  unconfirmed: number
  total: number
}
```

### Utxo

```typescript
interface Utxo {
  txid: string
  vout: number
  value: number
  scriptPubKey: string
}
```

### AnchorResolution

```typescript
type AnchorResolution =
  | { status: 'resolved'; txid: string }
  | { status: 'orphan' }
  | { status: 'ambiguous'; candidates: string[] }
```

## Functions

### createMessage

Create an encoded Anchor message.

```typescript
function createMessage(options: CreateMessageOptions): Uint8Array
```

**Parameters:**
- `options.kind` - Message kind (default: `AnchorKind.Text`)
- `options.body` - Text body (for text messages)
- `options.bodyBytes` - Binary body
- `options.anchors` - Parent references
- `options.carrier` - Carrier type

**Returns:** Encoded message as `Uint8Array`

**Example:**
```typescript
const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Hello!',
  anchors: [{ txid: 'abc...', vout: 0 }]
})
```

---

### parseMessage

Parse an Anchor message from bytes.

```typescript
function parseMessage(bytes: Uint8Array): AnchorMessage | null
```

**Parameters:**
- `bytes` - Raw message bytes

**Returns:** Parsed `AnchorMessage` or `null` if invalid

**Example:**
```typescript
const message = parseMessage(bytes)
if (message) {
  console.log('Kind:', message.kind)
}
```

---

### createAnchor

Create an anchor reference from a transaction ID.

```typescript
function createAnchor(txid: string, vout: number): Anchor
```

**Parameters:**
- `txid` - 64-character hex transaction ID
- `vout` - Output index (0-255)

**Returns:** `Anchor` with 8-byte prefix and vout

---

### getCarrierInfo

Get information about a carrier type.

```typescript
function getCarrierInfo(type: CarrierType): CarrierInfo
```

**Returns:** Carrier details including max size, pruning, discount

---

### getActiveCarriers

Get list of active carrier types.

```typescript
function getActiveCarriers(): CarrierType[]
```

**Returns:** Array of active `CarrierType` values

---

### bytesToHex

Convert bytes to hexadecimal string.

```typescript
function bytesToHex(bytes: Uint8Array): string
```

---

### hexToBytes

Convert hexadecimal string to bytes.

```typescript
function hexToBytes(hex: string): Uint8Array
```

---

### encodeVarint

Encode a number as Bitcoin varint.

```typescript
function encodeVarint(value: bigint): Uint8Array
```

---

### decodeVarint

Decode a Bitcoin varint from bytes.

```typescript
function decodeVarint(bytes: Uint8Array, offset: number): [bigint, number]
```

**Returns:** Tuple of `[value, bytesRead]`

## Classes

### AnchorWallet

Bitcoin wallet for Anchor operations.

```typescript
class AnchorWallet {
  constructor(config: WalletConfig)
  
  // Broadcasting
  broadcast(message: Uint8Array, options?: BroadcastOptions): Promise<TransactionResult>
  broadcastRaw(hex: string): Promise<string>
  
  // Balance and UTXOs
  getBalance(): Promise<Balance>
  getUtxos(): Promise<Utxo[]>
  
  // Fee estimation
  estimateFee(blocks: number): Promise<number>
  
  // Address management
  getNewAddress(type?: AddressType): Promise<string>
  
  // Transaction queries
  getTransaction(txid: string): Promise<Transaction>
  listTransactions(options?: ListOptions): Promise<Transaction[]>
  
  // Static constructors
  static fromPrivateKey(wif: string, network: Network): AnchorWallet
  static fromMnemonic(phrase: string, network: Network, path?: string): AnchorWallet
}
```

### AnchorError

Custom error class for Anchor operations.

```typescript
class AnchorError extends Error {
  code: AnchorErrorCode
  
  constructor(code: AnchorErrorCode, message: string)
}
```

## Type Guards

### isTextMessage

```typescript
function isTextMessage(message: AnchorMessage): message is TextMessage
```

### isAnchorMessage

```typescript
function isAnchorMessage(bytes: Uint8Array): boolean
```

## Kind-Specific APIs

### DNS (`@AnchorProtocol/anchor-sdk/dns`)

```typescript
// Enums
enum DnsOperation { REGISTER, UPDATE, TRANSFER }
enum RecordType { A, AAAA, CNAME, TXT, MX, NS, SRV }

// Functions
function encodeDnsPayload(payload: DnsPayload): Uint8Array
function decodeDnsPayload(bytes: Uint8Array): DnsPayload | null
function createAnchorDnsMessage(payload: DnsPayload, anchors?: Anchor[]): Uint8Array

// Utilities
function ipv4ToBytes(ip: string): Uint8Array
function bytesToIpv4(bytes: Uint8Array): string
function isValidDomainName(name: string): boolean
```

### Token (`@AnchorProtocol/anchor-sdk/token`)

```typescript
// Enums
enum TokenOperation { DEPLOY, MINT, TRANSFER, BURN, SPLIT }
enum DeployFlags { NONE, OPEN_MINT, FIXED_SUPPLY, BURNABLE }

// Functions
function encodeDeployPayload(payload: DeployPayload): Uint8Array
function encodeMintPayload(payload: MintPayload): Uint8Array
function encodeTransferPayload(payload: TransferPayload): Uint8Array
function encodeBurnPayload(payload: BurnPayload): Uint8Array
function decodeTokenPayload(bytes: Uint8Array): ParsedTokenOperation | null

// Utilities
function formatTokenAmount(amount: bigint, decimals: number): string
function parseTokenAmount(str: string, decimals: number): bigint
function isValidTicker(ticker: string): boolean
```

### Proof (`@AnchorProtocol/anchor-sdk/proof`)

```typescript
// Enums
enum ProofOperation { STAMP, REVOKE, BATCH }
enum HashAlgorithm { SHA256, SHA512 }

// Functions
function encodeProofPayload(payload: ProofPayload): Uint8Array
function decodeProofPayload(bytes: Uint8Array): ProofPayload | null
function createAnchorProofsMessage(payload: ProofPayload, anchors?: Anchor[]): Uint8Array

// Utilities
function getHashSize(algo: HashAlgorithm): number
function isValidHash(hash: string, algo: HashAlgorithm): boolean
```

### GeoMarker (`@AnchorProtocol/anchor-sdk/geo`)

```typescript
// Functions
function encodeGeoMarker(payload: GeoMarkerPayload): Uint8Array
function decodeGeoMarker(bytes: Uint8Array): GeoMarkerPayload | null
function encodeGeoMarkerHex(payload: GeoMarkerPayload): string

// Utilities
function calculatePayloadSize(messageLength: number): number
function fitsInOpReturn(messageLength: number): boolean
function maxOpReturnMessageLength(): number
```

### Pixel (`@AnchorProtocol/anchor-sdk/pixel`)

```typescript
// Functions
function encodePixel(pixel: Pixel): Uint8Array
function decodePixel(bytes: Uint8Array, offset?: number): Pixel
function encodePixelPayload(pixels: Pixel[]): Uint8Array
function decodePixelPayload(bytes: Uint8Array): Pixel[]
function createAnchorPixelMessage(pixels: Pixel[]): Uint8Array

// Utilities
function validatePixel(pixel: Pixel, width?: number, height?: number): boolean
function batchPixels(pixels: Pixel[]): Pixel[][]
function estimateFee(pixelCount: number, feeRate?: number): number
```

## See Also

- [Getting Started](/sdk/getting-started) - Quick start guide
- [Encoding](/sdk/encoding) - Create messages
- [Parsing](/sdk/parsing) - Read messages
- [Wallet](/sdk/wallet) - Transaction management



Complete reference for the Anchor Protocol SDK.

## Constants

### ANCHOR_MAGIC

Protocol identifier and version bytes.

```typescript
const ANCHOR_MAGIC: Uint8Array = new Uint8Array([0xa1, 0x1c, 0x00, 0x01])
```

### Size Constants

```typescript
const TXID_PREFIX_SIZE = 8      // Bytes for txid prefix
const ANCHOR_SIZE = 9           // Bytes per anchor (prefix + vout)
const MIN_PAYLOAD_SIZE = 6      // Magic + kind + anchor_count
const MAX_OP_RETURN_SIZE = 80   // Standard OP_RETURN limit
const MAX_WITNESS_SIZE = 4_000_000  // ~4MB witness limit
```

## Enums

### AnchorKind

```typescript
enum AnchorKind {
  Generic = 0,   // Raw binary
  Text = 1,      // UTF-8 text
  State = 2,     // State update
  Vote = 3,      // Governance
}
```

### CarrierType

```typescript
enum CarrierType {
  OpReturn = 0,      // OP_RETURN output
  Inscription = 1,   // Ordinals inscription
  Stamps = 2,        // Bare multisig
  TaprootAnnex = 3,  // Reserved
  WitnessData = 4,   // Raw witness
}
```

### CarrierStatus

```typescript
enum CarrierStatus {
  Active = 'active',
  Reserved = 'reserved',
  Proposed = 'proposed',
  Deprecated = 'deprecated',
}
```

### AnchorErrorCode

```typescript
enum AnchorErrorCode {
  InvalidMagic = 'INVALID_MAGIC',
  PayloadTooShort = 'PAYLOAD_TOO_SHORT',
  TruncatedAnchors = 'TRUNCATED_ANCHORS',
  MessageTooLarge = 'MESSAGE_TOO_LARGE',
  InvalidTxid = 'INVALID_TXID',
  InsufficientFunds = 'INSUFFICIENT_FUNDS',
  NoUtxos = 'NO_UTXOS',
  RpcError = 'RPC_ERROR',
  SigningError = 'SIGNING_ERROR',
}
```

## Interfaces

### AnchorMessage

```typescript
interface AnchorMessage {
  kind: number
  anchors: Anchor[]
  body: Uint8Array
}
```

### Anchor

```typescript
interface Anchor {
  txidPrefix: Uint8Array  // 8 bytes
  vout: number            // 0-255
}
```

### TextMessage

```typescript
interface TextMessage extends AnchorMessage {
  kind: 1
  text: string
}
```

### CreateMessageOptions

```typescript
interface CreateMessageOptions {
  kind?: AnchorKind
  body?: string              // For text messages
  bodyBytes?: Uint8Array     // For binary messages
  anchors?: Array<{ txid: string; vout: number }>
  carrier?: CarrierType
}
```

### CarrierInfo

```typescript
interface CarrierInfo {
  type: CarrierType
  name: string
  maxSize: number
  isPrunable: boolean
  utxoImpact: boolean
  witnessDiscount: boolean
  status: CarrierStatus
}
```

### WalletConfig

```typescript
interface WalletConfig {
  rpcUrl: string
  rpcUser: string
  rpcPassword: string
  network: Network
  walletName?: string
  feeRate?: number
}
```

### TransactionResult

```typescript
interface TransactionResult {
  txid: string
  hex: string
  vout: number
  carrier: CarrierType
  fee?: number
  size?: number
}
```

### Balance

```typescript
interface Balance {
  confirmed: number
  unconfirmed: number
  total: number
}
```

### Utxo

```typescript
interface Utxo {
  txid: string
  vout: number
  value: number
  scriptPubKey: string
}
```

### AnchorResolution

```typescript
type AnchorResolution =
  | { status: 'resolved'; txid: string }
  | { status: 'orphan' }
  | { status: 'ambiguous'; candidates: string[] }
```

## Functions

### createMessage

Create an encoded Anchor message.

```typescript
function createMessage(options: CreateMessageOptions): Uint8Array
```

**Parameters:**
- `options.kind` - Message kind (default: `AnchorKind.Text`)
- `options.body` - Text body (for text messages)
- `options.bodyBytes` - Binary body
- `options.anchors` - Parent references
- `options.carrier` - Carrier type

**Returns:** Encoded message as `Uint8Array`

**Example:**
```typescript
const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Hello!',
  anchors: [{ txid: 'abc...', vout: 0 }]
})
```

---

### parseMessage

Parse an Anchor message from bytes.

```typescript
function parseMessage(bytes: Uint8Array): AnchorMessage | null
```

**Parameters:**
- `bytes` - Raw message bytes

**Returns:** Parsed `AnchorMessage` or `null` if invalid

**Example:**
```typescript
const message = parseMessage(bytes)
if (message) {
  console.log('Kind:', message.kind)
}
```

---

### createAnchor

Create an anchor reference from a transaction ID.

```typescript
function createAnchor(txid: string, vout: number): Anchor
```

**Parameters:**
- `txid` - 64-character hex transaction ID
- `vout` - Output index (0-255)

**Returns:** `Anchor` with 8-byte prefix and vout

---

### getCarrierInfo

Get information about a carrier type.

```typescript
function getCarrierInfo(type: CarrierType): CarrierInfo
```

**Returns:** Carrier details including max size, pruning, discount

---

### getActiveCarriers

Get list of active carrier types.

```typescript
function getActiveCarriers(): CarrierType[]
```

**Returns:** Array of active `CarrierType` values

---

### bytesToHex

Convert bytes to hexadecimal string.

```typescript
function bytesToHex(bytes: Uint8Array): string
```

---

### hexToBytes

Convert hexadecimal string to bytes.

```typescript
function hexToBytes(hex: string): Uint8Array
```

---

### encodeVarint

Encode a number as Bitcoin varint.

```typescript
function encodeVarint(value: bigint): Uint8Array
```

---

### decodeVarint

Decode a Bitcoin varint from bytes.

```typescript
function decodeVarint(bytes: Uint8Array, offset: number): [bigint, number]
```

**Returns:** Tuple of `[value, bytesRead]`

## Classes

### AnchorWallet

Bitcoin wallet for Anchor operations.

```typescript
class AnchorWallet {
  constructor(config: WalletConfig)
  
  // Broadcasting
  broadcast(message: Uint8Array, options?: BroadcastOptions): Promise<TransactionResult>
  broadcastRaw(hex: string): Promise<string>
  
  // Balance and UTXOs
  getBalance(): Promise<Balance>
  getUtxos(): Promise<Utxo[]>
  
  // Fee estimation
  estimateFee(blocks: number): Promise<number>
  
  // Address management
  getNewAddress(type?: AddressType): Promise<string>
  
  // Transaction queries
  getTransaction(txid: string): Promise<Transaction>
  listTransactions(options?: ListOptions): Promise<Transaction[]>
  
  // Static constructors
  static fromPrivateKey(wif: string, network: Network): AnchorWallet
  static fromMnemonic(phrase: string, network: Network, path?: string): AnchorWallet
}
```

### AnchorError

Custom error class for Anchor operations.

```typescript
class AnchorError extends Error {
  code: AnchorErrorCode
  
  constructor(code: AnchorErrorCode, message: string)
}
```

## Type Guards

### isTextMessage

```typescript
function isTextMessage(message: AnchorMessage): message is TextMessage
```

### isAnchorMessage

```typescript
function isAnchorMessage(bytes: Uint8Array): boolean
```

## Kind-Specific APIs

### DNS (`@AnchorProtocol/anchor-sdk/dns`)

```typescript
// Enums
enum DnsOperation { REGISTER, UPDATE, TRANSFER }
enum RecordType { A, AAAA, CNAME, TXT, MX, NS, SRV }

// Functions
function encodeDnsPayload(payload: DnsPayload): Uint8Array
function decodeDnsPayload(bytes: Uint8Array): DnsPayload | null
function createAnchorDnsMessage(payload: DnsPayload, anchors?: Anchor[]): Uint8Array

// Utilities
function ipv4ToBytes(ip: string): Uint8Array
function bytesToIpv4(bytes: Uint8Array): string
function isValidDomainName(name: string): boolean
```

### Token (`@AnchorProtocol/anchor-sdk/token`)

```typescript
// Enums
enum TokenOperation { DEPLOY, MINT, TRANSFER, BURN, SPLIT }
enum DeployFlags { NONE, OPEN_MINT, FIXED_SUPPLY, BURNABLE }

// Functions
function encodeDeployPayload(payload: DeployPayload): Uint8Array
function encodeMintPayload(payload: MintPayload): Uint8Array
function encodeTransferPayload(payload: TransferPayload): Uint8Array
function encodeBurnPayload(payload: BurnPayload): Uint8Array
function decodeTokenPayload(bytes: Uint8Array): ParsedTokenOperation | null

// Utilities
function formatTokenAmount(amount: bigint, decimals: number): string
function parseTokenAmount(str: string, decimals: number): bigint
function isValidTicker(ticker: string): boolean
```

### Proof (`@AnchorProtocol/anchor-sdk/proof`)

```typescript
// Enums
enum ProofOperation { STAMP, REVOKE, BATCH }
enum HashAlgorithm { SHA256, SHA512 }

// Functions
function encodeProofPayload(payload: ProofPayload): Uint8Array
function decodeProofPayload(bytes: Uint8Array): ProofPayload | null
function createAnchorProofsMessage(payload: ProofPayload, anchors?: Anchor[]): Uint8Array

// Utilities
function getHashSize(algo: HashAlgorithm): number
function isValidHash(hash: string, algo: HashAlgorithm): boolean
```

### GeoMarker (`@AnchorProtocol/anchor-sdk/geo`)

```typescript
// Functions
function encodeGeoMarker(payload: GeoMarkerPayload): Uint8Array
function decodeGeoMarker(bytes: Uint8Array): GeoMarkerPayload | null
function encodeGeoMarkerHex(payload: GeoMarkerPayload): string

// Utilities
function calculatePayloadSize(messageLength: number): number
function fitsInOpReturn(messageLength: number): boolean
function maxOpReturnMessageLength(): number
```

### Pixel (`@AnchorProtocol/anchor-sdk/pixel`)

```typescript
// Functions
function encodePixel(pixel: Pixel): Uint8Array
function decodePixel(bytes: Uint8Array, offset?: number): Pixel
function encodePixelPayload(pixels: Pixel[]): Uint8Array
function decodePixelPayload(bytes: Uint8Array): Pixel[]
function createAnchorPixelMessage(pixels: Pixel[]): Uint8Array

// Utilities
function validatePixel(pixel: Pixel, width?: number, height?: number): boolean
function batchPixels(pixels: Pixel[]): Pixel[][]
function estimateFee(pixelCount: number, feeRate?: number): number
```

## See Also

- [Getting Started](/sdk/getting-started) - Quick start guide
- [Encoding](/sdk/encoding) - Create messages
- [Parsing](/sdk/parsing) - Read messages
- [Wallet](/sdk/wallet) - Transaction management



Complete reference for the Anchor Protocol SDK.

## Constants

### ANCHOR_MAGIC

Protocol identifier and version bytes.

```typescript
const ANCHOR_MAGIC: Uint8Array = new Uint8Array([0xa1, 0x1c, 0x00, 0x01])
```

### Size Constants

```typescript
const TXID_PREFIX_SIZE = 8      // Bytes for txid prefix
const ANCHOR_SIZE = 9           // Bytes per anchor (prefix + vout)
const MIN_PAYLOAD_SIZE = 6      // Magic + kind + anchor_count
const MAX_OP_RETURN_SIZE = 80   // Standard OP_RETURN limit
const MAX_WITNESS_SIZE = 4_000_000  // ~4MB witness limit
```

## Enums

### AnchorKind

```typescript
enum AnchorKind {
  Generic = 0,   // Raw binary
  Text = 1,      // UTF-8 text
  State = 2,     // State update
  Vote = 3,      // Governance
}
```

### CarrierType

```typescript
enum CarrierType {
  OpReturn = 0,      // OP_RETURN output
  Inscription = 1,   // Ordinals inscription
  Stamps = 2,        // Bare multisig
  TaprootAnnex = 3,  // Reserved
  WitnessData = 4,   // Raw witness
}
```

### CarrierStatus

```typescript
enum CarrierStatus {
  Active = 'active',
  Reserved = 'reserved',
  Proposed = 'proposed',
  Deprecated = 'deprecated',
}
```

### AnchorErrorCode

```typescript
enum AnchorErrorCode {
  InvalidMagic = 'INVALID_MAGIC',
  PayloadTooShort = 'PAYLOAD_TOO_SHORT',
  TruncatedAnchors = 'TRUNCATED_ANCHORS',
  MessageTooLarge = 'MESSAGE_TOO_LARGE',
  InvalidTxid = 'INVALID_TXID',
  InsufficientFunds = 'INSUFFICIENT_FUNDS',
  NoUtxos = 'NO_UTXOS',
  RpcError = 'RPC_ERROR',
  SigningError = 'SIGNING_ERROR',
}
```

## Interfaces

### AnchorMessage

```typescript
interface AnchorMessage {
  kind: number
  anchors: Anchor[]
  body: Uint8Array
}
```

### Anchor

```typescript
interface Anchor {
  txidPrefix: Uint8Array  // 8 bytes
  vout: number            // 0-255
}
```

### TextMessage

```typescript
interface TextMessage extends AnchorMessage {
  kind: 1
  text: string
}
```

### CreateMessageOptions

```typescript
interface CreateMessageOptions {
  kind?: AnchorKind
  body?: string              // For text messages
  bodyBytes?: Uint8Array     // For binary messages
  anchors?: Array<{ txid: string; vout: number }>
  carrier?: CarrierType
}
```

### CarrierInfo

```typescript
interface CarrierInfo {
  type: CarrierType
  name: string
  maxSize: number
  isPrunable: boolean
  utxoImpact: boolean
  witnessDiscount: boolean
  status: CarrierStatus
}
```

### WalletConfig

```typescript
interface WalletConfig {
  rpcUrl: string
  rpcUser: string
  rpcPassword: string
  network: Network
  walletName?: string
  feeRate?: number
}
```

### TransactionResult

```typescript
interface TransactionResult {
  txid: string
  hex: string
  vout: number
  carrier: CarrierType
  fee?: number
  size?: number
}
```

### Balance

```typescript
interface Balance {
  confirmed: number
  unconfirmed: number
  total: number
}
```

### Utxo

```typescript
interface Utxo {
  txid: string
  vout: number
  value: number
  scriptPubKey: string
}
```

### AnchorResolution

```typescript
type AnchorResolution =
  | { status: 'resolved'; txid: string }
  | { status: 'orphan' }
  | { status: 'ambiguous'; candidates: string[] }
```

## Functions

### createMessage

Create an encoded Anchor message.

```typescript
function createMessage(options: CreateMessageOptions): Uint8Array
```

**Parameters:**
- `options.kind` - Message kind (default: `AnchorKind.Text`)
- `options.body` - Text body (for text messages)
- `options.bodyBytes` - Binary body
- `options.anchors` - Parent references
- `options.carrier` - Carrier type

**Returns:** Encoded message as `Uint8Array`

**Example:**
```typescript
const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Hello!',
  anchors: [{ txid: 'abc...', vout: 0 }]
})
```

---

### parseMessage

Parse an Anchor message from bytes.

```typescript
function parseMessage(bytes: Uint8Array): AnchorMessage | null
```

**Parameters:**
- `bytes` - Raw message bytes

**Returns:** Parsed `AnchorMessage` or `null` if invalid

**Example:**
```typescript
const message = parseMessage(bytes)
if (message) {
  console.log('Kind:', message.kind)
}
```

---

### createAnchor

Create an anchor reference from a transaction ID.

```typescript
function createAnchor(txid: string, vout: number): Anchor
```

**Parameters:**
- `txid` - 64-character hex transaction ID
- `vout` - Output index (0-255)

**Returns:** `Anchor` with 8-byte prefix and vout

---

### getCarrierInfo

Get information about a carrier type.

```typescript
function getCarrierInfo(type: CarrierType): CarrierInfo
```

**Returns:** Carrier details including max size, pruning, discount

---

### getActiveCarriers

Get list of active carrier types.

```typescript
function getActiveCarriers(): CarrierType[]
```

**Returns:** Array of active `CarrierType` values

---

### bytesToHex

Convert bytes to hexadecimal string.

```typescript
function bytesToHex(bytes: Uint8Array): string
```

---

### hexToBytes

Convert hexadecimal string to bytes.

```typescript
function hexToBytes(hex: string): Uint8Array
```

---

### encodeVarint

Encode a number as Bitcoin varint.

```typescript
function encodeVarint(value: bigint): Uint8Array
```

---

### decodeVarint

Decode a Bitcoin varint from bytes.

```typescript
function decodeVarint(bytes: Uint8Array, offset: number): [bigint, number]
```

**Returns:** Tuple of `[value, bytesRead]`

## Classes

### AnchorWallet

Bitcoin wallet for Anchor operations.

```typescript
class AnchorWallet {
  constructor(config: WalletConfig)
  
  // Broadcasting
  broadcast(message: Uint8Array, options?: BroadcastOptions): Promise<TransactionResult>
  broadcastRaw(hex: string): Promise<string>
  
  // Balance and UTXOs
  getBalance(): Promise<Balance>
  getUtxos(): Promise<Utxo[]>
  
  // Fee estimation
  estimateFee(blocks: number): Promise<number>
  
  // Address management
  getNewAddress(type?: AddressType): Promise<string>
  
  // Transaction queries
  getTransaction(txid: string): Promise<Transaction>
  listTransactions(options?: ListOptions): Promise<Transaction[]>
  
  // Static constructors
  static fromPrivateKey(wif: string, network: Network): AnchorWallet
  static fromMnemonic(phrase: string, network: Network, path?: string): AnchorWallet
}
```

### AnchorError

Custom error class for Anchor operations.

```typescript
class AnchorError extends Error {
  code: AnchorErrorCode
  
  constructor(code: AnchorErrorCode, message: string)
}
```

## Type Guards

### isTextMessage

```typescript
function isTextMessage(message: AnchorMessage): message is TextMessage
```

### isAnchorMessage

```typescript
function isAnchorMessage(bytes: Uint8Array): boolean
```

## Kind-Specific APIs

### DNS (`@AnchorProtocol/anchor-sdk/dns`)

```typescript
// Enums
enum DnsOperation { REGISTER, UPDATE, TRANSFER }
enum RecordType { A, AAAA, CNAME, TXT, MX, NS, SRV }

// Functions
function encodeDnsPayload(payload: DnsPayload): Uint8Array
function decodeDnsPayload(bytes: Uint8Array): DnsPayload | null
function createAnchorDnsMessage(payload: DnsPayload, anchors?: Anchor[]): Uint8Array

// Utilities
function ipv4ToBytes(ip: string): Uint8Array
function bytesToIpv4(bytes: Uint8Array): string
function isValidDomainName(name: string): boolean
```

### Token (`@AnchorProtocol/anchor-sdk/token`)

```typescript
// Enums
enum TokenOperation { DEPLOY, MINT, TRANSFER, BURN, SPLIT }
enum DeployFlags { NONE, OPEN_MINT, FIXED_SUPPLY, BURNABLE }

// Functions
function encodeDeployPayload(payload: DeployPayload): Uint8Array
function encodeMintPayload(payload: MintPayload): Uint8Array
function encodeTransferPayload(payload: TransferPayload): Uint8Array
function encodeBurnPayload(payload: BurnPayload): Uint8Array
function decodeTokenPayload(bytes: Uint8Array): ParsedTokenOperation | null

// Utilities
function formatTokenAmount(amount: bigint, decimals: number): string
function parseTokenAmount(str: string, decimals: number): bigint
function isValidTicker(ticker: string): boolean
```

### Proof (`@AnchorProtocol/anchor-sdk/proof`)

```typescript
// Enums
enum ProofOperation { STAMP, REVOKE, BATCH }
enum HashAlgorithm { SHA256, SHA512 }

// Functions
function encodeProofPayload(payload: ProofPayload): Uint8Array
function decodeProofPayload(bytes: Uint8Array): ProofPayload | null
function createAnchorProofsMessage(payload: ProofPayload, anchors?: Anchor[]): Uint8Array

// Utilities
function getHashSize(algo: HashAlgorithm): number
function isValidHash(hash: string, algo: HashAlgorithm): boolean
```

### GeoMarker (`@AnchorProtocol/anchor-sdk/geo`)

```typescript
// Functions
function encodeGeoMarker(payload: GeoMarkerPayload): Uint8Array
function decodeGeoMarker(bytes: Uint8Array): GeoMarkerPayload | null
function encodeGeoMarkerHex(payload: GeoMarkerPayload): string

// Utilities
function calculatePayloadSize(messageLength: number): number
function fitsInOpReturn(messageLength: number): boolean
function maxOpReturnMessageLength(): number
```

### Pixel (`@AnchorProtocol/anchor-sdk/pixel`)

```typescript
// Functions
function encodePixel(pixel: Pixel): Uint8Array
function decodePixel(bytes: Uint8Array, offset?: number): Pixel
function encodePixelPayload(pixels: Pixel[]): Uint8Array
function decodePixelPayload(bytes: Uint8Array): Pixel[]
function createAnchorPixelMessage(pixels: Pixel[]): Uint8Array

// Utilities
function validatePixel(pixel: Pixel, width?: number, height?: number): boolean
function batchPixels(pixels: Pixel[]): Pixel[][]
function estimateFee(pixelCount: number, feeRate?: number): number
```

## See Also

- [Getting Started](/sdk/getting-started) - Quick start guide
- [Encoding](/sdk/encoding) - Create messages
- [Parsing](/sdk/parsing) - Read messages
- [Wallet](/sdk/wallet) - Transaction management


