# Anchor Predictions

Trustless lottery with DLC-based payouts on Bitcoin using the Anchor Protocol.

## Overview

Anchor Predictions enables provably fair lotteries where winnings are automatically paid out through Discreet Log Contracts (DLCs). Oracles from the Anchor Oracles network attest to the winning numbers, triggering trustless settlement.

## Features

- **Trustless Payouts**: Winners receive funds automatically via DLC, no central party holds funds
- **Oracle Attestation**: Winning numbers determined by trusted oracles from Anchor Oracles
- **Multiple Lottery Types**: Daily, weekly, and jackpot lotteries with different prize structures
- **BTC & Token Support**: Pay for tickets and receive winnings in BTC or Anchor Tokens
- **Transparent Results**: All lottery data indexed on-chain for full auditability

## How It Works

1. **Create Lottery**: Specify number range, draw block, ticket price, and oracle
2. **Buy Tickets**: Users pick numbers and create DLC-backed tickets
3. **Oracle Draw**: At draw block, oracle attests to winning numbers
4. **Auto Settlement**: DLCs settle automatically, paying winners

## Message Types

| Kind | Value | Description |
|------|-------|-------------|
| LotteryCreate | 40 | Create a new lottery |
| LotteryTicket | 41 | Buy a ticket |
| LotteryDraw | 42 | Oracle attestation of winning numbers |
| LotteryClaim | 43 | Claim winnings with DLC proof |

## Lottery Types

| Type | ID | Description |
|------|-----|-------------|
| Daily | 0 | Draws every ~144 blocks (~24h) |
| Weekly | 1 | Draws every ~1008 blocks (~7 days) |
| Jackpot | 2 | Larger prize pool, less frequent |

## Prize Tiers (Daily Example)

| Tier | Matches | Pool % | Description |
|------|---------|--------|-------------|
| 1 | 6/6 | 50% | Jackpot |
| 2 | 5/6 | 25% | Second prize |
| 3 | 4/6 | 15% | Third prize |
| 4 | 3/6 | 10% | Fourth prize |

## API Endpoints

### Stats
- `GET /api/stats` - Lottery statistics

### Lotteries
- `GET /api/lotteries` - List lotteries
- `GET /api/lotteries/:id` - Lottery details
- `POST /api/lotteries/create` - Create lottery
- `GET /api/lotteries/:id/tickets` - Lottery tickets
- `POST /api/lotteries/:id/buy` - Buy ticket (returns DLC offer)
- `GET /api/lotteries/:id/draw` - Draw result
- `GET /api/lotteries/:id/winners` - Winners list
- `POST /api/lotteries/:id/claim` - Claim prize

### User
- `GET /api/my/tickets` - User's tickets

### Config
- `GET /api/prize-tiers/:type` - Prize tier configuration

### History
- `GET /api/history` - Completed lotteries

## DLC Integration

The lottery uses Discreet Log Contracts for trustless payouts:

1. **Ticket Purchase**: Creates a DLC with adaptor signatures for each possible outcome
2. **Oracle Attestation**: Oracle publishes Schnorr signature for winning numbers
3. **Signature Completion**: Adaptor signature combined with oracle's signature
4. **Settlement**: Complete signature used to claim funds on-chain

## Development

```bash
# Start the database
docker compose up -d anchor-app-predictions-postgres

# Run the backend
cd apps/anchor-predictions/backend
cargo run

# Run the frontend
cd apps/anchor-predictions/frontend
npm run dev
```

## Architecture

```
anchor-predictions/
├── backend/          # Rust/Axum API server + DLC engine + indexer
├── frontend/         # Next.js web interface
├── postgres/         # Database schema
└── README.md
```

## License

MIT

