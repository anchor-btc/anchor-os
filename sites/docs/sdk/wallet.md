# Wallet

Create, sign, and broadcast Anchor messages to Bitcoin.

## Configuration

::: code-group

```typescript [TypeScript]
import { AnchorWallet } from '@AnchorProtocol/sdk'

const wallet = new AnchorWallet({
  rpcUrl: 'http://localhost:18443',
  rpcUser: 'bitcoin',
  rpcPassword: 'password',
  network: 'regtest',
  walletName: 'anchor-wallet', // optional
  feeRate: 10 // optional, sat/vB
})
```

```rust [Rust]
use anchor_wallet_lib::{AnchorWallet, WalletConfig};

// Regtest
let config = WalletConfig::regtest("http://127.0.0.1:18443", "user", "pass");

// Mainnet
let config = WalletConfig::mainnet("http://127.0.0.1:8332", "user", "pass");

// Testnet
let config = WalletConfig::testnet("http://127.0.0.1:18332", "user", "pass");

let wallet = AnchorWallet::new(config)?;
```

:::

## Broadcasting Messages

### Simple Broadcast

::: code-group

```typescript [TypeScript]
import { createMessage, AnchorKind } from '@AnchorProtocol/sdk'

const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Hello, Bitcoin!'
})

const result = await wallet.broadcast(message)

console.log('TXID:', result.txid)
console.log('Output:', result.vout)
```

```rust [Rust]
// Root message (new thread)
let txid = wallet.create_root_message("Hello, Bitcoin!")?;
println!("TXID: {}", txid);

// Reply to a message
let reply_txid = wallet.create_reply(
    "This is a reply!",
    &parent_txid,
    0, // vout
)?;
```

:::

### With Options

::: code-group

```typescript [TypeScript]
const result = await wallet.broadcast(message, {
  feeRate: 20,
  changeAddress: 'bc1q...',
  enableRbf: true,
  dryRun: false // set true to skip broadcast
})
```

```rust [Rust]
use anchor_wallet_lib::{TransactionBuilder, AnchorKind};

let builder = TransactionBuilder::new()
    .kind(AnchorKind::Text)
    .body_text("Custom message")
    .anchor(parent_txid, 0)
    .input(utxo_txid, 0, 50000)
    .change_script(change_script)
    .fee_rate(2.0);

let anchor_tx = builder.build()?;
let hex = anchor_tx.to_hex();
```

:::

## Balance and UTXOs

### Get Balance

::: code-group

```typescript [TypeScript]
const balance = await wallet.getBalance()

console.log('Confirmed:', balance.confirmed)
console.log('Unconfirmed:', balance.unconfirmed)
console.log('Total:', balance.total)
```

```rust [Rust]
let balance = wallet.get_balance()?;

println!("Confirmed: {} sats", balance.confirmed);
println!("Unconfirmed: {} sats", balance.unconfirmed);
```

:::

### List UTXOs

::: code-group

```typescript [TypeScript]
const utxos = await wallet.getUtxos()

for (const utxo of utxos) {
  console.log(`${utxo.txid}:${utxo.vout} - ${utxo.value} sats`)
}
```

```rust [Rust]
let utxos = wallet.list_utxos()?;

for utxo in utxos {
    println!("{} - {} sats", utxo.txid, utxo.amount);
}
```

:::

## Fee Estimation

::: code-group

```typescript [TypeScript]
// Target confirmation in N blocks
const feeRate = await wallet.estimateFee(6)
console.log(`Recommended: ${feeRate} sat/vB`)

// Calculate fee for a message
import { calculateFee } from '@AnchorProtocol/sdk'

const fee = calculateFee(message, {
  feeRate: 10,
  numInputs: 1,
  carrier: CarrierType.OpReturn
})
```

```rust [Rust]
// Fee estimation is automatic in TransactionBuilder
let builder = TransactionBuilder::new()
    .kind(AnchorKind::Text)
    .body_text("Message")
    .fee_rate(2.0); // sat/vB

let anchor_tx = builder.build()?;
```

:::

## Address Management

::: code-group

```typescript [TypeScript]
const address = await wallet.getNewAddress('bech32')
// 'legacy' | 'p2sh-segwit' | 'bech32' | 'bech32m'
```

```rust [Rust]
let address = wallet.get_new_address()?;
println!("Address: {}", address);
```

:::

## Transaction History

::: code-group

```typescript [TypeScript]
// Get single transaction
const tx = await wallet.getTransaction(txid)
console.log('Confirmations:', tx.confirmations)

// List all transactions
const history = await wallet.listTransactions({ count: 100 })
```

```rust [Rust]
// Get transaction info
let tx = wallet.get_transaction(&txid)?;
println!("Confirmations: {}", tx.confirmations);
```

:::

## Error Handling

::: code-group

```typescript [TypeScript]
import { AnchorError, AnchorErrorCode } from '@AnchorProtocol/sdk'

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
    }
  }
}
```

```rust [Rust]
use anchor_wallet_lib::{Result, WalletError};

match wallet.create_root_message("test") {
    Ok(txid) => println!("Success: {}", txid),
    Err(WalletError::InsufficientFunds { needed, available }) => {
        println!("Need {} sats, have {}", needed, available);
    }
    Err(WalletError::NoUtxos) => {
        println!("No UTXOs available");
    }
    Err(e) => println!("Error: {}", e),
}
```

:::

## RBF (Replace-By-Fee)

::: code-group

```typescript [TypeScript]
// Enable RBF
const result = await wallet.broadcast(message, {
  enableRbf: true
})

// Bump fee later
const newResult = await wallet.bumpFee(txid, {
  feeRate: 20 // new higher fee rate
})
```

```rust [Rust]
// RBF is enabled by default in anchor-wallet-lib
let txid = wallet.create_root_message("test")?;

// Bump fee (if needed)
let new_txid = wallet.bump_fee(&txid, 20.0)?;
```

:::

## Mining (Regtest)

::: code-group

```typescript [TypeScript]
// Generate blocks (regtest only)
await wallet.generateBlocks(10)
```

```rust [Rust]
// Generate blocks (regtest only)
let block_hashes = wallet.mine_blocks(10)?;
```

:::

## Complete Example

::: code-group

```typescript [TypeScript]
import { AnchorWallet, createMessage, AnchorKind } from '@AnchorProtocol/sdk'

async function sendMessage(text: string) {
  const wallet = new AnchorWallet({
    rpcUrl: process.env.BITCOIN_RPC_URL!,
    rpcUser: process.env.BITCOIN_RPC_USER!,
    rpcPassword: process.env.BITCOIN_RPC_PASSWORD!,
    network: 'mainnet'
  })
  
  // Check balance
  const balance = await wallet.getBalance()
  if (balance.confirmed < 10000) {
    throw new Error('Insufficient balance')
  }
  
  // Estimate fee
  const feeRate = await wallet.estimateFee(6)
  
  // Create and broadcast
  const message = createMessage({
    kind: AnchorKind.Text,
    body: text
  })
  
  const result = await wallet.broadcast(message, { feeRate })
  console.log('TXID:', result.txid)
  
  return result.txid
}
```

```rust [Rust]
use anchor_wallet_lib::{AnchorWallet, WalletConfig, WalletError};

fn send_message(text: &str) -> Result<String, WalletError> {
    let config = WalletConfig::mainnet(
        "http://127.0.0.1:8332",
        &std::env::var("BITCOIN_RPC_USER").unwrap(),
        &std::env::var("BITCOIN_RPC_PASSWORD").unwrap(),
    );
    
    let wallet = AnchorWallet::new(config)?;
    
    // Check balance
    let balance = wallet.get_balance()?;
    if balance.confirmed < 10000 {
        return Err(WalletError::InsufficientFunds {
            needed: 10000,
            available: balance.confirmed,
        });
    }
    
    // Create and broadcast
    let txid = wallet.create_root_message(text)?;
    println!("TXID: {}", txid);
    
    Ok(txid)
}
```

:::

## See Also

- [Encoding](/sdk/encoding) - Create message payloads
- [Parsing](/sdk/parsing) - Read on-chain messages
- [API Reference](/sdk/api-reference) - Complete API
