# Anchor Predictions

**Binary Prediction Markets on Bitcoin** - Trade on real-world outcomes using an Automated Market Maker (AMM).

## Overview

Anchor Predictions enables trustless binary (YES/NO) prediction markets on Bitcoin. Markets are created with questions about future events, and users can bet on outcomes. An oracle resolves the market, and winners receive payouts.

## Features

- **Binary Markets** - Simple YES/NO outcomes for any question
- **AMM Pricing** - Automated Market Maker with constant product formula
- **Oracle Resolution** - Markets resolved by trusted oracles
- **On-Chain Settlement** - All bets and payouts recorded on Bitcoin
- **Real-Time Odds** - Prices update with each bet placed

## How It Works

1. **Create Market** - Ask a yes/no question, set resolution date, choose oracle
2. **Place Bets** - Buy YES or NO shares at current AMM price
3. **Resolution** - Oracle attests to the outcome at resolution block
4. **Claim Winnings** - Winners claim their payouts

## Message Types

### Kind 40: MarketCreate

Create a new prediction market.

```
[market_id: 32 bytes]
[question_len: 2 bytes BE]
[question: variable UTF-8]
[description_len: 2 bytes BE]
[description: variable UTF-8]
[resolution_block: 4 bytes BE]
[oracle_pubkey: 32 bytes]
[initial_liquidity: 8 bytes BE]
```

### Kind 41: PlaceBet

Place a bet on a market outcome.

```
[market_id: 32 bytes]
[outcome: 1 byte] (0=NO, 1=YES)
[amount_sats: 8 bytes BE]
[min_shares: 8 bytes BE]
[user_pubkey: 33 bytes]
```

### Kind 42: MarketResolve

Oracle resolves the market.

```
[market_id: 32 bytes]
[resolution: 1 byte] (0=NO, 1=YES, 2=INVALID)
[oracle_pubkey: 32 bytes]
[schnorr_signature: 64 bytes]
```

### Kind 43: ClaimWinnings

Claim winnings from a resolved market.

```
[market_id: 32 bytes]
[position_id: 4 bytes BE]
[user_pubkey: 33 bytes]
[signature: 64 bytes]
```

## AMM Formula

Uses Constant Product Market Maker (CPMM):

```
k = YES_pool × NO_pool (constant)

Price of YES = NO_pool / (YES_pool + NO_pool)
Price of NO = YES_pool / (YES_pool + NO_pool)

When buying YES:
- Add sats to NO pool
- Calculate new YES pool to maintain k
- Shares out = old YES pool - new YES pool
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats` | GET | Protocol statistics |
| `/api/markets` | GET | List all markets |
| `/api/markets/:id` | GET | Get market details |
| `/api/markets/create` | POST | Create new market |
| `/api/markets/:id/quote` | POST | Get bet quote |
| `/api/markets/:id/bet` | POST | Place a bet |
| `/api/markets/:id/positions` | GET | List positions |
| `/api/markets/:id/winners` | GET | List winners |
| `/api/markets/:id/claim` | POST | Claim winnings |
| `/api/my/positions` | GET | User's positions |
| `/api/history` | GET | Resolved markets |

## Development

### Backend

```bash
cd apps/anchor-predictions/backend
cargo run
```

### Frontend

```bash
cd apps/anchor-predictions/frontend
npm install
npm run dev
```

### Docker

```bash
docker compose build app-predictions-backend app-predictions-frontend
docker compose up -d app-predictions-backend app-predictions-frontend
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ANCHOR PREDICTIONS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    │
│  │   Frontend  │───▶│   Backend    │───▶│   PostgreSQL    │    │
│  │  (Next.js)  │    │  (Rust/Axum) │    │    (Markets,    │    │
│  │             │    │              │    │   Positions)    │    │
│  └─────────────┘    └──────────────┘    └─────────────────┘    │
│                            │                                    │
│                            ▼                                    │
│                     ┌──────────────┐                            │
│                     │   Indexer    │                            │
│                     │  (Bitcoin    │                            │
│                     │   Blocks)    │                            │
│                     └──────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## License

MIT
