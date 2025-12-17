# Anchor Oracles

Decentralized oracle network for Bitcoin using the Anchor Protocol.

## Overview

Anchor Oracles provides a decentralized system for oracles to attest to real-world events on Bitcoin. Oracles stake funds as collateral and build reputation through accurate attestations.

## Features

- **Oracle Registry**: Register and manage oracle identities on-chain
- **Multiple Categories**: Support for prices, sports, weather, elections, random numbers, and more
- **Reputation System**: Track oracle performance and reliability
- **Staking**: Oracles stake Bitcoin as collateral for honest behavior
- **Dispute Resolution**: Challenge incorrect attestations
- **Schnorr Signatures**: DLC-compatible attestations for trustless contracts

## Message Types

| Kind | Value | Description |
|------|-------|-------------|
| Oracle | 30 | Oracle registration/update |
| OracleAttestation | 31 | Signed attestation of an outcome |
| OracleDispute | 32 | Challenge an attestation |
| OracleSlash | 33 | Slash oracle stake after dispute |

## Categories

| Bit | Category | Description |
|-----|----------|-------------|
| 1 | Block | Block and chain data |
| 2 | Prices | Cryptocurrency and asset prices |
| 4 | Sports | Sports events and results |
| 8 | Weather | Weather data and forecasts |
| 16 | Elections | Election and political outcomes |
| 32 | Random | Random number generation (VRF) |
| 64 | Custom | Custom event types |

## API Endpoints

### Stats
- `GET /api/stats` - Oracle network statistics

### Oracles
- `GET /api/oracles` - List all oracles
- `GET /api/oracles/:pubkey` - Get oracle details
- `GET /api/oracles/:pubkey/attestations` - Oracle's attestation history
- `POST /api/oracles/register` - Register as an oracle

### Attestations
- `GET /api/attestations` - List recent attestations
- `POST /api/attestations/submit` - Submit an attestation

### Events
- `GET /api/events` - List pending event requests
- `POST /api/events/request` - Request an attestation for an event

### Disputes
- `GET /api/disputes` - List active disputes

### Categories
- `GET /api/categories` - List oracle categories with stats

## Development

```bash
# Start the database
docker compose up -d anchor-app-oracles-postgres

# Run the backend
cd apps/anchor-oracles/backend
cargo run

# Run the frontend
cd apps/anchor-oracles/frontend
npm run dev
```

## Architecture

```
anchor-oracles/
├── backend/          # Rust/Axum API server + indexer
├── frontend/         # Next.js web interface
├── postgres/         # Database schema
└── README.md
```

## License

MIT

