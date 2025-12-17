# Anchor Tokens

A UTXO-based token protocol on Bitcoin using the Anchor Protocol. Similar to Runes, tokens are attached to Bitcoin UTXOs, enabling efficient token operations with minimal fees.

## Features

- **UTXO-Based Model**: Tokens are attached to Bitcoin UTXOs, just like Runes
- **Full Token Lifecycle**: Deploy, mint, transfer, burn, and split operations
- **Fee Optimized**: Uses Witness Data carrier for 75% fee discount
- **Varint Encoding**: Compact LEB128 encoding for minimal payload size
- **First-Come-First-Served**: Ticker registration is based on block confirmation

## Token Operations

| Operation | Code | Description |
|-----------|------|-------------|
| DEPLOY | 0x01 | Create a new token with ticker, decimals, max supply |
| MINT | 0x02 | Mint new tokens to an output |
| TRANSFER | 0x03 | Transfer tokens to one or more outputs |
| BURN | 0x04 | Permanently destroy tokens |
| SPLIT | 0x05 | Split a UTXO into multiple UTXOs |

## Quick Start

```bash
# Start all services
docker compose up -d

# Access the web interface
open http://localhost:3017
```

## Ports

| Service | Port | Description |
|---------|------|-------------|
| Backend API | 3016 | REST API for tokens |
| Frontend | 3017 | Web interface |

## API Endpoints

### Tokens
- `GET /tokens` - List all tokens
- `GET /tokens/:ticker` - Get token by ticker
- `GET /tokens/:ticker/holders` - Get token holders
- `GET /tokens/:ticker/history` - Get operation history

### Addresses
- `GET /address/:addr/balances` - Get token balances
- `GET /address/:addr/utxos` - Get token UTXOs

### Transactions
- `POST /tx/deploy` - Create deploy transaction
- `POST /tx/mint` - Create mint transaction
- `POST /tx/transfer` - Create transfer transaction
- `POST /tx/burn` - Create burn transaction

## Binary Payload Format

```
[operation: u8][token_id: varint][...operation_data]
```

### DEPLOY
```
[0x01][ticker_len: u8][ticker: utf8][decimals: u8][max_supply: varint][mint_limit: varint][flags: u8]
```

### MINT
```
[0x02][token_id: varint][amount: varint][output_idx: u8]
```

### TRANSFER
```
[0x03][token_id: varint][count: u8][[output_idx: u8][amount: varint]...]
```

### BURN
```
[0x04][token_id: varint][amount: varint]
```

## Fee Comparison

| Carrier | Discount | 1 Transfer Cost @ 1 sat/vB |
|---------|----------|---------------------------|
| OP_RETURN | None | ~180 sats |
| Witness Data | 75% | ~45 sats |

## Development

### Backend
```bash
cd apps/anchor-tokens/backend
cargo run
```

### Frontend
```bash
cd apps/anchor-tokens/frontend
npm install
npm run dev
```

## License

MIT
