# Anchor Applications

The Anchor Protocol powers a suite of decentralized applications built on Bitcoin. Each app uses specific message kinds to store data permanently on the blockchain.

## Applications

### Anchor Canvas

A collaborative pixel canvas where users paint pixels on a shared 4580x4580 canvas. Each pixel is permanently recorded on Bitcoin.

- **Kind**: [State (Kind 2)](/kinds/state)
- **Documentation**: [Anchor Canvas](/apps/canvas)

---

### Anchor Threads

A decentralized forum with Bitcoin-backed posts. Messages are threaded using anchoring to create reply chains.

- **Kind**: [Text (Kind 1)](/kinds/text)
- **Features**: Threading, replies, permanent posts

---

### Anchor Domains

Decentralized domain name registration on Bitcoin. Register .btc, .sat, .anchor, .anc, and .bit domains.

- **Kind**: [DNS (Kind 10)](/kinds/dns)
- **Features**: Domain registration, transfers, DNS records

---

### Anchor Tokens

Create and manage fungible tokens on Bitcoin using the Anchor protocol.

- **Kind**: [Token (Kind 20)](/kinds/token)
- **Features**: Deploy, mint, transfer tokens

---

### Anchor Proofs

Document timestamping and proof of existence. Hash any file and anchor it to Bitcoin.

- **Kind**: [Proof (Kind 11)](/kinds/proof)
- **Features**: SHA-256 hashing, timestamping, verification

---

### Anchor Places

Geographic markers anchored to Bitcoin. Pin locations with permanent, verifiable data. The first marker at any coordinate "owns" that location.

- **Kind**: [GeoMarker (Kind 5)](/kinds/geomarker)
- **Documentation**: [Anchor Places](/apps/places)
- **Features**: Coordinate ownership, categories, replies, search

---

### Anchor Oracles

Decentralized oracle attestations for external data on Bitcoin.

- **Kind**: Oracle (Kind 30-33)
- **Features**: Price feeds, event attestations, dispute resolution

---

### Anchor Predictions

Prediction markets powered by Bitcoin.

- **Kind**: Lottery (Kind 40-43)
- **Features**: Create markets, place bets, claim winnings

## Running Applications

All applications can be run using Docker Compose profiles:

```bash
# Run a specific app
docker compose --profile app-canvas up -d
docker compose --profile app-threads up -d
docker compose --profile app-domains up -d
docker compose --profile app-places up -d

# Run multiple apps
docker compose --profile app-canvas --profile app-places up -d

# View logs
docker compose logs -f <service-name>
```

## Building Your Own App

Want to build an application on Anchor? Start with:

1. [Concepts](/concepts/) - Understand the message format
2. [Message Kinds](/kinds/) - Choose or define a kind for your data
3. [SDK](/sdk/) - Use the SDK to encode/decode messages
4. [Wallet API](/sdk/wallet) - Broadcast transactions

