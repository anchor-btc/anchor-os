# Anchor Domains - Decentralized DNS on Bitcoin

Anchor Domains is a decentralized Domain Name System built on Bitcoin using the Anchor protocol. It allows users to register `.btc`, `.sat`, `.anchor`, `.anc`, and `.bit` domains and store DNS records permanently on the blockchain.

## Features

- **Multi-TLD Support**: Register domains with `.btc`, `.sat`, `.anchor`, `.anc`, or `.bit` TLDs
- **Decentralized Domain Registration**: First-come-first-served domain registration
- **Full DNS Record Support**: A, AAAA, CNAME, TXT, MX, NS, SRV records
- **Permanent Storage**: Records stored on Bitcoin blockchain
- **Multiple Lookup Methods**: Query by domain name or txid prefix
- **Chrome Extension**: Resolve domains directly in your browser
- **Update Support**: Modify records by anchoring to original registration

## Supported TLDs

| TLD | Description |
|-----|-------------|
| `.btc` | Primary Bitcoin-focused TLD |
| `.sat` | Satoshi-inspired TLD |
| `.anchor` | Anchor Protocol branded TLD |
| `.anc` | Short form of Anchor |
| `.bit` | Classic Bitcoin domain TLD |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Anchor Domains Stack                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Chrome Ext   │  │  Frontend    │  │   Backend    │      │
│  │ (Resolver)   │  │  (Next.js)   │  │   (Rust)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                 │                  │               │
│         └─────────────────┼──────────────────┘               │
│                          │                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               Anchor Protocol (Bitcoin)               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Using Docker

```bash
# Start all services (from project root)
docker compose up -d

# Anchor Domains services
# - Backend API: http://localhost:3401
# - Frontend: http://localhost:3400
```

### Local Development

**Backend (Rust)**
```bash
cd apps/anchor-domains/backend
cargo run
```

**Frontend (Next.js)**
```bash
cd apps/anchor-domains/frontend
npm install
npm run dev
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/stats` | GET | Protocol statistics |
| `/resolve/:name` | GET | Resolve domain by name |
| `/resolve/txid/:prefix` | GET | Resolve by txid prefix |
| `/domains` | GET | List all domains |
| `/domains/:name` | GET | Get domain details |
| `/domains/:name/history` | GET | Get domain history |
| `/available/:name` | GET | Check if domain is available |
| `/register` | POST | Register a new domain |
| `/update/:name` | POST | Update domain records |

## DNS Schema

### Payload Format

```
[operation: u8][name_len: u8][name: utf8][records...]

Operations:
  0x01 = REGISTER
  0x02 = UPDATE
  0x03 = TRANSFER

Record format:
  [type: u8][ttl: u16][data_len: u8][data: bytes]
```

### Record Types

| Type | ID | Data Format |
|------|----|----|
| A | 1 | 4 bytes (IPv4) |
| AAAA | 2 | 16 bytes (IPv6) |
| CNAME | 3 | UTF-8 string |
| TXT | 4 | UTF-8 string |
| MX | 5 | priority (u16) + domain |
| NS | 6 | UTF-8 string |
| SRV | 7 | priority (u16) + weight (u16) + port (u16) + target |

## Domain Naming

- Domains must end with `.btc`, `.sat`, `.anchor`, `.anc`, or `.bit`
- Names are case-insensitive
- First registration wins (based on block height)
- Lookup by name: `mysite.btc`, `mysite.sat`
- Lookup by txid prefix: `a1b2c3d4e5f67890` (16 hex chars)

## Examples

### Register a domain

```bash
curl -X POST http://localhost:3401/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mysite.btc",
    "records": [
      {"record_type": "A", "value": "93.184.216.34", "ttl": 300}
    ]
  }'
```

### Resolve a domain

```bash
curl http://localhost:3401/resolve/mysite.btc
```

### Check availability

```bash
curl http://localhost:3401/available/mysite.btc
```

## Chrome Extension

The Anchor Domains Chrome extension intercepts requests to `.btc`, `.sat`, `.anchor`, `.anc`, and `.bit` domains and resolves them using the Anchor Domains API.

### Installation

1. Build the extension: `cd apps/anchor-domains/extension && npm run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist` folder

### Features

- Automatic multi-TLD domain resolution (`.btc`, `.sat`, `.anchor`, `.anc`, `.bit`)
- Local caching with TTL support
- Custom API endpoint configuration
- Omnibox integration (type `dom mysite` to resolve)
- Visual indicator for resolved domains

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://...` | PostgreSQL connection string |
| `BITCOIN_RPC_URL` | `http://localhost:18443` | Bitcoin Core RPC URL |
| `BITCOIN_RPC_USER` | `user` | RPC username |
| `BITCOIN_RPC_PASSWORD` | `pass` | RPC password |
| `WALLET_URL` | `http://localhost:8001` | Wallet service URL |
| `PORT` | `3401` | HTTP server port |
| `POLL_INTERVAL_SECS` | `5` | Blockchain poll interval |
| `CONFIRMATIONS` | `1` | Required confirmations |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3401` | Anchor Domains API URL |
| `NEXT_PUBLIC_WALLET_URL` | `http://localhost:8001` | Wallet service URL |

## License

MIT



