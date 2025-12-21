# Wallet Integration

The SDK provides wallet integration for creating, signing, and broadcasting Anchor messages to Bitcoin.

## AnchorWallet

### Configuration

```typescript
import { AnchorWallet, Network } from '@AnchorProtocol/anchor-sdk'

const wallet = new AnchorWallet({
  // Bitcoin Core RPC
  rpcUrl: 'http://localhost:8332',
  rpcUser: 'bitcoin',
  rpcPassword: 'password',
  
  // Network type
  network: 'mainnet' as Network,
  
  // Optional: wallet name for multi-wallet
  walletName: 'anchor-wallet',
  
  // Optional: default fee rate (sat/vB)
  feeRate: 10
})
```

### Network Types

```typescript
type Network = 'mainnet' | 'testnet' | 'signet' | 'regtest'

// Network-specific ports
const RPC_PORTS = {
  mainnet: 8332,
  testnet: 18332,
  signet: 38332,
  regtest: 18443
}
```

## Broadcasting Messages

### Simple Broadcast

```typescript
import { createMessage, AnchorKind } from '@AnchorProtocol/anchor-sdk'

const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Hello, Bitcoin!'
})

const result = await wallet.broadcast(message)

console.log('Transaction ID:', result.txid)
console.log('Output index:', result.vout)
console.log('Carrier used:', result.carrier)
```

### With Options

```typescript
const result = await wallet.broadcast(message, {
  // Override fee rate
  feeRate: 20,
  
  // Add change address
  changeAddress: 'bc1q...',
  
  // Add additional outputs
  outputs: [
    { address: 'bc1q...', value: 10000 }
  ],
  
  // Don't broadcast, just return signed tx
  dryRun: false
})
```

### Result Type

```typescript
interface TransactionResult {
  txid: string           // Transaction ID
  hex: string            // Raw transaction hex
  vout: number           // Output index of Anchor message
  carrier: CarrierType   // Carrier type used
  fee?: number           // Fee paid in satoshis
  size?: number          // Transaction size in vbytes
}
```

## UTXO Management

### Get Balance

```typescript
const balance = await wallet.getBalance()

console.log('Confirmed:', balance.confirmed)
console.log('Unconfirmed:', balance.unconfirmed)
console.log('Total:', balance.total)
```

### List UTXOs

```typescript
const utxos = await wallet.getUtxos()

for (const utxo of utxos) {
  console.log(`${utxo.txid}:${utxo.vout} - ${utxo.value} sats`)
}
```

### Select UTXOs

```typescript
const utxos = await wallet.selectUtxos({
  amount: 10000,        // Required amount in sats
  feeRate: 10,          // Fee rate for calculation
  excludeUnconfirmed: true
})
```

## Fee Estimation

### Get Fee Rate

```typescript
// Target confirmation in N blocks
const feeRate = await wallet.estimateFee(6)  // 6-block target
console.log(`Recommended: ${feeRate} sat/vB`)
```

### Calculate Transaction Fee

```typescript
import { calculateFee } from '@AnchorProtocol/anchor-sdk'

const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Hello!'
})

const fee = calculateFee(message, {
  feeRate: 10,
  numInputs: 1,
  carrier: CarrierType.OpReturn
})

console.log(`Estimated fee: ${fee} sats`)
```

### Witness Discount

```typescript
import { calculateFeeSavings } from '@AnchorProtocol/anchor-sdk'

const payloadSize = 1000  // bytes

const savings = calculateFeeSavings(payloadSize, 10)  // 10 sat/vB

console.log('OP_RETURN fee:', savings.opReturnFee)
console.log('Witness fee:', savings.witnessFee)
console.log('Savings:', savings.savings, `(${savings.savingsPercent.toFixed(1)}%)`)
```

## Transaction Building

### Create Without Broadcasting

```typescript
const tx = await wallet.createTransaction(message, {
  dryRun: true  // Don't broadcast
})

console.log('Raw transaction:', tx.hex)
console.log('Estimated fee:', tx.fee)
```

### Sign External Transaction

```typescript
const signedHex = await wallet.signTransaction(unsignedHex)
```

### Broadcast Raw Transaction

```typescript
const txid = await wallet.broadcastRaw(signedHex)
```

## Address Management

### Get New Address

```typescript
const address = await wallet.getNewAddress()
console.log('Receive address:', address)
```

### Get Address Type

```typescript
const address = await wallet.getNewAddress('bech32')
// 'legacy' | 'p2sh-segwit' | 'bech32' | 'bech32m'
```

## Transaction History

### Get Transaction

```typescript
const tx = await wallet.getTransaction(txid)

console.log('Confirmations:', tx.confirmations)
console.log('Block height:', tx.blockHeight)
console.log('Outputs:', tx.vout.length)
```

### List Transactions

```typescript
const history = await wallet.listTransactions({
  count: 100,
  skip: 0
})

for (const tx of history) {
  console.log(`${tx.txid}: ${tx.amount} sats`)
}
```

## Error Handling

```typescript
import { 
  AnchorWallet, 
  AnchorError, 
  AnchorErrorCode 
} from '@AnchorProtocol/anchor-sdk'

try {
  const result = await wallet.broadcast(message)
} catch (error) {
  if (error instanceof AnchorError) {
    switch (error.code) {
      case AnchorErrorCode.InsufficientFunds:
        console.log('Not enough balance')
        break
      case AnchorErrorCode.NoUtxos:
        console.log('No available UTXOs')
        break
      case AnchorErrorCode.RpcError:
        console.log('Bitcoin RPC error:', error.message)
        break
      case AnchorErrorCode.SigningError:
        console.log('Failed to sign transaction')
        break
      default:
        console.log('Error:', error.message)
    }
  }
}
```

## External Wallet Support

### With Private Key

```typescript
import { AnchorWallet } from '@AnchorProtocol/anchor-sdk'

const wallet = AnchorWallet.fromPrivateKey(
  'your-wif-private-key',
  'mainnet'
)
```

### With Seed Phrase

```typescript
const wallet = AnchorWallet.fromMnemonic(
  'abandon abandon abandon ... about',
  'mainnet',
  "m/84'/0'/0'/0/0"  // derivation path
)
```

### Read-Only (Electrum)

```typescript
const readOnlyWallet = new AnchorWallet({
  electrumUrl: 'wss://electrum.example.com:50004',
  network: 'mainnet',
  address: 'bc1q...'  // Watch-only address
})

// Can read but not sign
const balance = await readOnlyWallet.getBalance()
```

## RBF (Replace-By-Fee)

### Create RBF-enabled Transaction

```typescript
const result = await wallet.broadcast(message, {
  enableRbf: true
})
```

### Bump Fee

```typescript
const newResult = await wallet.bumpFee(txid, {
  feeRate: 20  // New higher fee rate
})

console.log('Replacement txid:', newResult.txid)
```

## Batch Transactions

### Multiple Messages in One TX

```typescript
const messages = [
  createMessage({ kind: AnchorKind.Text, body: 'Message 1' }),
  createMessage({ kind: AnchorKind.Text, body: 'Message 2' })
]

const result = await wallet.broadcastBatch(messages)

console.log('TXID:', result.txid)
console.log('Message outputs:', result.vouts)  // [0, 1]
```

## Best Practices

1. **Use regtest** for development
2. **Monitor mempool** for fee estimation
3. **Handle errors** gracefully
4. **Enable RBF** for important transactions
5. **Verify transactions** after broadcast

## Example: Complete Flow

```typescript
import { 
  AnchorWallet, 
  createMessage, 
  AnchorKind,
  CarrierType 
} from '@AnchorProtocol/anchor-sdk'

async function sendMessage(text: string) {
  // 1. Configure wallet
  const wallet = new AnchorWallet({
    rpcUrl: process.env.BITCOIN_RPC_URL!,
    rpcUser: process.env.BITCOIN_RPC_USER!,
    rpcPassword: process.env.BITCOIN_RPC_PASSWORD!,
    network: 'mainnet'
  })
  
  // 2. Check balance
  const balance = await wallet.getBalance()
  if (balance.confirmed < 10000) {
    throw new Error('Insufficient balance')
  }
  
  // 3. Get fee estimate
  const feeRate = await wallet.estimateFee(6)
  
  // 4. Create message
  const message = createMessage({
    kind: AnchorKind.Text,
    body: text,
    carrier: CarrierType.OpReturn
  })
  
  // 5. Broadcast
  const result = await wallet.broadcast(message, { feeRate })
  
  console.log('Success!')
  console.log('TXID:', result.txid)
  console.log('Fee:', result.fee, 'sats')
  
  return result.txid
}
```

## See Also

- [Encoding Messages](/sdk/encoding) - Create messages
- [Parsing Messages](/sdk/parsing) - Read messages
- [API Reference](/sdk/api-reference) - Complete API


