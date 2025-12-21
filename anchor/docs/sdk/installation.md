# Installation

## Package Manager

Install the Anchor SDK using your preferred package manager:

::: code-group

```bash [npm]
npm install @AnchorProtocol/anchor-sdk
```

```bash [pnpm]
pnpm add @AnchorProtocol/anchor-sdk
```

```bash [yarn]
yarn add @AnchorProtocol/anchor-sdk
```

```bash [bun]
bun add @AnchorProtocol/anchor-sdk
```

:::

## Requirements

### Runtime

- **Node.js** 18.0.0 or higher
- **Browser**: Modern browsers with ES2020 support

### TypeScript

The SDK is written in TypeScript and includes type definitions:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true
  }
}
```

## Module Systems

### ES Modules (Recommended)

```typescript
import { 
  createMessage, 
  parseMessage, 
  AnchorKind 
} from '@AnchorProtocol/anchor-sdk'
```

### CommonJS

```javascript
const { 
  createMessage, 
  parseMessage, 
  AnchorKind 
} = require('@AnchorProtocol/anchor-sdk')
```

## Bitcoin Node Setup

To broadcast messages, you need access to a Bitcoin node.

### Option 1: Bitcoin Core

Run a local Bitcoin Core node:

```bash
# Start regtest for development
bitcoind -regtest -rpcuser=bitcoin -rpcpassword=password
```

Configure the SDK:

```typescript
import { AnchorWallet } from '@AnchorProtocol/anchor-sdk'

const wallet = new AnchorWallet({
  rpcUrl: 'http://localhost:18443',  // regtest RPC
  rpcUser: 'bitcoin',
  rpcPassword: 'password',
  network: 'regtest'
})
```

### Option 2: Electrum Server

For lighter infrastructure, use an Electrum server:

```typescript
import { AnchorWallet } from '@AnchorProtocol/anchor-sdk'

const wallet = new AnchorWallet({
  electrumUrl: 'wss://electrum.example.com:50004',
  network: 'mainnet'
})
```

### Option 3: Third-party APIs

Use services like Mempool.space for read operations:

```typescript
import { AnchorIndexer } from '@AnchorProtocol/anchor-sdk'

const indexer = new AnchorIndexer({
  apiUrl: 'https://mempool.space/api'
})

// Read transactions (broadcasting requires separate wallet)
const tx = await indexer.getTransaction(txid)
```

## Development Setup

### Create a New Project

```bash
# Create project
mkdir my-anchor-app
cd my-anchor-app
npm init -y

# Install dependencies
npm install @AnchorProtocol/anchor-sdk
npm install -D typescript @types/node

# Initialize TypeScript
npx tsc --init
```

### Project Structure

```
my-anchor-app/
├── src/
│   └── index.ts
├── package.json
└── tsconfig.json
```

### Example `package.json`

```json
{
  "name": "my-anchor-app",
  "type": "module",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@AnchorProtocol/anchor-sdk": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Example `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

## Browser Bundling

### Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    'process.env': {}
  },
  optimizeDeps: {
    include: ['@AnchorProtocol/anchor-sdk']
  }
})
```

### Webpack

```javascript
// webpack.config.js
module.exports = {
  resolve: {
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer/')
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer']
    })
  ]
}
```

## Environment Variables

For production, use environment variables:

```bash
# .env
BITCOIN_RPC_URL=http://localhost:8332
BITCOIN_RPC_USER=bitcoin
BITCOIN_RPC_PASSWORD=your-secure-password
BITCOIN_NETWORK=mainnet
```

```typescript
import { AnchorWallet } from '@AnchorProtocol/anchor-sdk'

const wallet = new AnchorWallet({
  rpcUrl: process.env.BITCOIN_RPC_URL!,
  rpcUser: process.env.BITCOIN_RPC_USER!,
  rpcPassword: process.env.BITCOIN_RPC_PASSWORD!,
  network: process.env.BITCOIN_NETWORK as Network
})
```

## Verify Installation

Run this script to verify everything works:

```typescript
// src/verify.ts
import { 
  ANCHOR_MAGIC, 
  AnchorKind, 
  createMessage 
} from '@AnchorProtocol/anchor-sdk'

console.log('Magic bytes:', Buffer.from(ANCHOR_MAGIC).toString('hex'))
// Should print: a11c0001

const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Hello, Anchor!'
})

console.log('Message created:', message.length, 'bytes')
console.log('Success!')
```

```bash
npx tsx src/verify.ts
```

## Troubleshooting

### Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

Ensure your `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

### Bitcoin RPC Connection Failed

1. Check if bitcoind is running
2. Verify RPC credentials in `bitcoin.conf`
3. Ensure RPC port is accessible

```bash
# Test connection
curl --user bitcoin:password \
  --data-binary '{"jsonrpc":"1.0","method":"getblockchaininfo"}' \
  -H 'content-type: text/plain;' \
  http://localhost:8332/
```

## Next Steps

- [Encoding Messages](/sdk/encoding) - Create messages
- [Parsing Messages](/sdk/parsing) - Read on-chain data
- [Wallet Integration](/sdk/wallet) - Broadcast transactions


