# Kind 20: Token

The **Token** kind enables fungible token operations on Bitcoin. It provides a complete token lifecycle including deployment, minting, transfers, and burns.

## Overview

- **Kind**: 20 (`0x14`)
- **Name**: Token
- **Status**: Extension
- **Max Payload**: Variable (uses varint encoding)

## Operations

| Operation | Value | Description |
|-----------|-------|-------------|
| DEPLOY | `0x01` | Create a new token |
| MINT | `0x02` | Mint new tokens |
| TRANSFER | `0x03` | Transfer tokens |
| BURN | `0x04` | Destroy tokens |
| SPLIT | `0x05` | Split tokens across outputs |

## Token IDs

Each token is identified by the **block height** where its DEPLOY transaction was confirmed. This provides:

- Unique, sequential IDs
- Easy lookup and verification
- No pre-registration required

## Payload Formats

### DEPLOY

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | operation | u8 | `0x01` |
| 1 | ticker_len | u8 | Ticker length |
| 2+ | ticker | utf8 | Token symbol (max 32 bytes) |
| ... | decimals | u8 | Decimal places (0-18) |
| ... | max_supply | varint | Maximum supply |
| ... | mint_limit | varint | Max per mint (0 = unlimited) |
| ... | flags | u8 | Token flags |

#### Deploy Flags

| Flag | Value | Description |
|------|-------|-------------|
| NONE | `0x00` | No special flags |
| OPEN_MINT | `0x01` | Anyone can mint |
| FIXED_SUPPLY | `0x02` | No minting after deploy |
| BURNABLE | `0x04` | Tokens can be burned |

### MINT

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | operation | u8 | `0x02` |
| 1+ | token_id | varint | Token ID (block height) |
| ... | amount | varint | Amount to mint |
| ... | output_idx | u8 | Output index for tokens |

### TRANSFER

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | operation | u8 | `0x03` |
| 1+ | token_id | varint | Token ID |
| ... | count | u8 | Number of allocations |
| ... | allocations | bytes | Output allocations |

Each allocation:

| Field | Type | Description |
|-------|------|-------------|
| output_idx | u8 | Output index |
| amount | varint | Amount to send |

### BURN

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | operation | u8 | `0x04` |
| 1+ | token_id | varint | Token ID |
| ... | amount | varint | Amount to burn |

## TypeScript Interface

```typescript
enum TokenOperation {
  DEPLOY = 0x01,
  MINT = 0x02,
  TRANSFER = 0x03,
  BURN = 0x04,
  SPLIT = 0x05,
}

enum DeployFlags {
  NONE = 0x00,
  OPEN_MINT = 0x01,
  FIXED_SUPPLY = 0x02,
  BURNABLE = 0x04,
}

interface DeployPayload {
  ticker: string
  decimals: number
  maxSupply: bigint
  mintLimit?: bigint
  flags: number
}

interface MintPayload {
  tokenId: bigint
  amount: bigint
  outputIndex: number
}

interface TransferPayload {
  tokenId: bigint
  allocations: Array<{
    outputIndex: number
    amount: bigint
  }>
}

interface BurnPayload {
  tokenId: bigint
  amount: bigint
}
```

## Encoding Example

```typescript
const ANCHOR_KIND_TOKEN = 20

function encodeDeployPayload(payload: DeployPayload): Uint8Array {
  const encoder = new TextEncoder()
  const tickerBytes = encoder.encode(payload.ticker.toUpperCase())
  
  if (tickerBytes.length > 32) {
    throw new Error('Ticker too long')
  }
  
  const maxSupplyVarint = encodeVarint(payload.maxSupply)
  const mintLimitVarint = encodeVarint(payload.mintLimit ?? 0n)
  
  const size = 1 + 1 + tickerBytes.length + 1 + 
    maxSupplyVarint.length + mintLimitVarint.length + 1
  
  const result = new Uint8Array(size)
  let offset = 0
  
  result[offset++] = TokenOperation.DEPLOY
  result[offset++] = tickerBytes.length
  result.set(tickerBytes, offset)
  offset += tickerBytes.length
  result[offset++] = payload.decimals
  result.set(maxSupplyVarint, offset)
  offset += maxSupplyVarint.length
  result.set(mintLimitVarint, offset)
  offset += mintLimitVarint.length
  result[offset++] = payload.flags
  
  return result
}

function encodeMintPayload(payload: MintPayload): Uint8Array {
  const tokenIdVarint = encodeVarint(payload.tokenId)
  const amountVarint = encodeVarint(payload.amount)
  
  const size = 1 + tokenIdVarint.length + amountVarint.length + 1
  const result = new Uint8Array(size)
  let offset = 0
  
  result[offset++] = TokenOperation.MINT
  result.set(tokenIdVarint, offset)
  offset += tokenIdVarint.length
  result.set(amountVarint, offset)
  offset += amountVarint.length
  result[offset++] = payload.outputIndex
  
  return result
}

function encodeTransferPayload(payload: TransferPayload): Uint8Array {
  const tokenIdVarint = encodeVarint(payload.tokenId)
  
  let allocationsSize = 0
  const encodedAllocs: Array<{ idx: number; amount: Uint8Array }> = []
  
  for (const alloc of payload.allocations) {
    const amountVarint = encodeVarint(alloc.amount)
    encodedAllocs.push({ idx: alloc.outputIndex, amount: amountVarint })
    allocationsSize += 1 + amountVarint.length
  }
  
  const size = 1 + tokenIdVarint.length + 1 + allocationsSize
  const result = new Uint8Array(size)
  let offset = 0
  
  result[offset++] = TokenOperation.TRANSFER
  result.set(tokenIdVarint, offset)
  offset += tokenIdVarint.length
  result[offset++] = payload.allocations.length
  
  for (const alloc of encodedAllocs) {
    result[offset++] = alloc.idx
    result.set(alloc.amount, offset)
    offset += alloc.amount.length
  }
  
  return result
}
```

## Varint Encoding

Token amounts use Bitcoin-style variable-length integers:

```typescript
function encodeVarint(value: bigint): Uint8Array {
  if (value < 0n) throw new Error('Negative varint')
  
  if (value < 0xFDn) {
    return new Uint8Array([Number(value)])
  }
  if (value <= 0xFFFFn) {
    const result = new Uint8Array(3)
    result[0] = 0xFD
    new DataView(result.buffer).setUint16(1, Number(value), true)
    return result
  }
  if (value <= 0xFFFFFFFFn) {
    const result = new Uint8Array(5)
    result[0] = 0xFE
    new DataView(result.buffer).setUint32(1, Number(value), true)
    return result
  }
  const result = new Uint8Array(9)
  result[0] = 0xFF
  new DataView(result.buffer).setBigUint64(1, value, true)
  return result
}

function decodeVarint(
  bytes: Uint8Array,
  offset: number
): [bigint, number] {
  const first = bytes[offset]
  
  if (first < 0xFD) {
    return [BigInt(first), 1]
  }
  if (first === 0xFD) {
    const value = new DataView(bytes.buffer, bytes.byteOffset + offset + 1)
      .getUint16(0, true)
    return [BigInt(value), 3]
  }
  if (first === 0xFE) {
    const value = new DataView(bytes.buffer, bytes.byteOffset + offset + 1)
      .getUint32(0, true)
    return [BigInt(value), 5]
  }
  const value = new DataView(bytes.buffer, bytes.byteOffset + offset + 1)
    .getBigUint64(0, true)
  return [value, 9]
}
```

## Full Transaction Examples

### Deploy a Token

```typescript
async function deployToken(
  wallet: AnchorWallet,
  ticker: string,
  maxSupply: bigint,
  decimals = 8
): Promise<{ txid: string; tokenId: bigint }> {
  const payload = encodeDeployPayload({
    ticker,
    decimals,
    maxSupply,
    mintLimit: maxSupply / 100n,  // 1% per mint
    flags: DeployFlags.OPEN_MINT | DeployFlags.BURNABLE
  })
  
  const message = createAnchorMessage({
    kind: 20,
    bodyBytes: payload,
    carrier: CarrierType.OpReturn
  })
  
  const result = await wallet.broadcast(message)
  
  // Token ID = block height
  const tokenId = BigInt(result.blockHeight!)
  
  return { txid: result.txid, tokenId }
}

// Deploy "SATS" token with 21M supply
const { txid, tokenId } = await deployToken(
  wallet,
  'SATS',
  21_000_000_00000000n,  // 21M with 8 decimals
  8
)
```

### Mint Tokens

```typescript
async function mintTokens(
  wallet: AnchorWallet,
  tokenId: bigint,
  amount: bigint,
  deployTxid: string
): Promise<string> {
  const payload = encodeMintPayload({
    tokenId,
    amount,
    outputIndex: 1  // Tokens go to output 1
  })
  
  const message = createAnchorMessage({
    kind: 20,
    bodyBytes: payload,
    anchors: [{ txid: deployTxid, vout: 0 }],
    carrier: CarrierType.OpReturn
  })
  
  return (await wallet.broadcast(message)).txid
}
```

### Transfer Tokens

```typescript
async function transferTokens(
  wallet: AnchorWallet,
  tokenId: bigint,
  recipients: Array<{ address: string; amount: bigint }>,
  sourceTxid: string
): Promise<string> {
  // Build allocations (output 0 = change, 1+ = recipients)
  const allocations = recipients.map((r, i) => ({
    outputIndex: i + 1,
    amount: r.amount
  }))
  
  const payload = encodeTransferPayload({
    tokenId,
    allocations
  })
  
  const message = createAnchorMessage({
    kind: 20,
    bodyBytes: payload,
    anchors: [{ txid: sourceTxid, vout: 0 }],
    carrier: CarrierType.OpReturn
  })
  
  return (await wallet.broadcast(message, {
    outputs: recipients.map(r => ({
      address: r.address,
      value: 546  // dust amount
    }))
  })).txid
}
```

## Token Indexing

```typescript
interface TokenInfo {
  id: bigint
  ticker: string
  decimals: number
  maxSupply: bigint
  mintLimit: bigint
  flags: number
  deployTxid: string
  deployBlock: number
  totalMinted: bigint
  totalBurned: bigint
}

interface TokenBalance {
  tokenId: bigint
  balance: bigint
  utxos: Array<{
    txid: string
    vout: number
    amount: bigint
  }>
}

class TokenIndexer {
  async getToken(id: bigint): Promise<TokenInfo | null> {
    // Query deploy transaction at block height = id
  }
  
  async getBalance(
    address: string,
    tokenId: bigint
  ): Promise<TokenBalance> {
    // Sum unspent token UTXOs
  }
  
  async getTransferHistory(
    address: string,
    tokenId: bigint
  ): Promise<TokenTransfer[]> {
    // Query transfer transactions
  }
}
```

## Amount Formatting

```typescript
function formatTokenAmount(amount: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals)
  const intPart = amount / divisor
  const fracPart = amount % divisor
  
  if (decimals === 0) {
    return intPart.toString()
  }
  
  const fracStr = fracPart.toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '')
  
  return fracStr ? `${intPart}.${fracStr}` : intPart.toString()
}

function parseTokenAmount(str: string, decimals: number): bigint {
  const [intPart, fracPart = ''] = str.split('.')
  const divisor = 10n ** BigInt(decimals)
  const fracValue = BigInt(
    fracPart.padEnd(decimals, '0').slice(0, decimals)
  )
  
  return BigInt(intPart) * divisor + fracValue
}

// Example
formatTokenAmount(12345678n, 8)  // "0.12345678"
parseTokenAmount('1.5', 8)        // 150000000n
```

## Validation

```typescript
function isValidTicker(ticker: string): boolean {
  if (ticker.length < 1 || ticker.length > 32) return false
  return /^[A-Za-z0-9]+$/.test(ticker)
}

function validateDeploy(payload: DeployPayload): string[] {
  const errors: string[] = []
  
  if (!isValidTicker(payload.ticker)) {
    errors.push('Invalid ticker format')
  }
  if (payload.decimals > 18) {
    errors.push('Decimals must be 0-18')
  }
  if (payload.maxSupply <= 0n) {
    errors.push('Max supply must be positive')
  }
  if (payload.mintLimit && payload.mintLimit > payload.maxSupply) {
    errors.push('Mint limit exceeds max supply')
  }
  
  return errors
}
```

## Fee Savings with Witness

```typescript
function calculateFeeSavings(
  payloadSize: number,
  feeRate = 1
): { opReturnFee: number; witnessFee: number; savings: number } {
  const baseTxSize = 150
  const protocolOverhead = 6
  
  // OP_RETURN (no discount)
  const opReturnFee = (baseTxSize + 10 + payloadSize + protocolOverhead) * feeRate
  
  // Witness (75% discount)
  const witnessVbytes = Math.ceil((payloadSize + protocolOverhead) / 4)
  const witnessFee = (baseTxSize + witnessVbytes) * feeRate
  
  return {
    opReturnFee,
    witnessFee,
    savings: opReturnFee - witnessFee
  }
}
```

## See Also

- [Anchor Tokens](https://tokens.anchor.dev) - Live application
- [Vote (Kind 3)](/kinds/vote) - Token-weighted voting
- [Carriers](/concepts/carriers) - Witness discount



