# Anchor OS - Complete Features List

## 🎯 Overview

**Anchor OS** is a Bitcoin-native operating system for decentralized applications. It enables embedding structured messages in Bitcoin transactions that reference previous messages through compact 64-bit anchors, creating a directed acyclic graph (DAG) of related messages.

---

## 🔧 Core Protocol

### Message Format
- **Binary Protocol**: Compact message format with magic bytes (`0xA11C0001`), kind identifier, anchors, and payload
- **Message Threading**: Reference parent messages via 64-bit anchors (8-byte txid prefix + 1-byte vout)
- **Extensible Kinds**: Support for multiple message types (Text, DNS, Tokens, Proofs, etc.)
- **Multi-Carrier Support**: Embed data via OP_RETURN, Inscriptions, Stamps, Witness Data, or Taproot Annex

### Carrier Types

| Carrier | Max Size | Fee Discount | Prunable | Best For |
|---------|----------|--------------|----------|----------|
| OP_RETURN | ~100 KB | None | Yes | Short messages, batch operations |
| Inscription | ~4 MB | 75% | Yes | Large data, Ordinals compatibility |
| Stamps | ~8 KB | None | **No** | Permanent storage, censorship resistance |
| Witness Data | ~4 MB | 75% | Yes | Large payloads, cost efficiency |
| Taproot Annex | ~10 KB | 75% | Yes | Private data (reserved) |

### Message Kinds

| Kind | ID | Description |
|------|----|-------------|
| Generic | 0 | Raw binary data |
| Text | 1 | UTF-8 text messages |
| State | 2 | State updates (pixels, canvas) |
| Vote | 3 | Voting operations |
| Image | 4 | Image data |
| GeoMarker | 5 | Geographic coordinates |
| DNS | 10 | Domain name registration |
| Proof | 11 | Proof of existence |
| Token | 20 | Token operations |
| Oracle | 30-33 | Oracle attestations |
| Lottery | 40-43 | Lottery/prediction operations |

---

## 📦 Applications

### 1. Anchor Threads
**Social messaging on Bitcoin**
- Threaded conversations with replies
- Forum-style discussions
- Permanent message history
- Message threading via anchors

### 2. Anchor Canvas
**Collaborative pixel art on Bitcoin**
- Place pixels on a shared canvas
- Permanent pixel ownership
- Real-time updates
- Community-driven art creation

### 3. Anchor Domains (DNS)
**Decentralized DNS on Bitcoin**
- **Multi-TLD Support**: `.btc`, `.sat`, `.anchor`, `.anc`, `.bit`
- **Full DNS Records**: A, AAAA, CNAME, TXT, MX, NS, SRV
- **Domain Operations**: Register, Update, Transfer
- **Lookup Methods**: By domain name or txid prefix
- **Chrome Extension**: Resolve domains directly in browser
- **Permanent Storage**: Records stored forever on blockchain
- **First-Come-First-Served**: Registration based on block confirmation

### 4. Anchor Places
**Geographic markers on Bitcoin**
- **Pin Messages on Map**: Geo-located markers stored permanently
- **Coordinate Ownership**: First marker at coordinates "owns" location
- **Categories**: General, Tourism, Commerce, Event, Warning, Historic
- **Reply System**: Comment on markers via threading
- **Full-Text Search**: Search across all marker messages
- **Real-Time Updates**: Markers appear on confirmation

### 5. Anchor Proofs
**Proof of Existence on Bitcoin**
- **File Timestamping**: Create immutable records of file existence
- **Multiple Hash Algorithms**: SHA-256 and SHA-512 support
- **File Validation**: Verify if files were previously timestamped
- **Batch Stamping**: Register multiple files in single transaction
- **Revocation Support**: Invalidate proofs if needed
- **PDF Certificates**: Downloadable proof certificates
- **Client-Side Hashing**: Files never leave browser, only hash is sent
- **Use Cases**: Intellectual property, legal documents, research, audit trails

### 6. Anchor Tokens
**UTXO-based tokens on Bitcoin (Similar to Runes)**
- **UTXO Model**: Tokens attached to Bitcoin UTXOs
- **Full Lifecycle**: Deploy, Mint, Transfer, Burn, Split
- **Fee Optimized**: 75% discount with Witness Data carrier
- **Varint Encoding**: Compact LEB128 for minimal payload
- **First-Come-First-Served**: Ticker registration by block confirmation
- **Holder Tracking**: View token holders and operation history

### 7. Anchor Oracles
**Decentralized oracle network on Bitcoin**
- **Oracle Registry**: Register and manage oracle identities on-chain
- **Multiple Categories**: Prices, Sports, Weather, Elections, Random (VRF), Custom
- **Reputation System**: Track oracle performance and reliability
- **Staking**: Oracles stake BTC as collateral for honest behavior
- **Dispute Resolution**: Challenge incorrect attestations
- **Schnorr Signatures**: DLC-compatible attestations for trustless contracts
- **Slash Mechanism**: Penalize dishonest oracles

### 8. Anchor Predictions
**Trustless prediction markets on Bitcoin**
- **Trustless Payouts**: Winners receive funds via DLC (Discreet Log Contracts)
- **Oracle Attestation**: Winning numbers determined by Anchor Oracles
- **Multiple Types**: Daily, Weekly, and Jackpot lotteries
- **BTC & Token Support**: Pay with BTC or Anchor Tokens
- **Transparent Results**: All data indexed on-chain for auditability
- **Prize Tiers**: Multiple prize tiers (Jackpot 50%, Second 25%, Third 15%, Fourth 10%)
- **DLC Integration**: Trustless settlement with adaptor signatures

---

## 🖥️ Dashboard

### Node Management
- **Bitcoin Node Status**: Real-time blockchain info, sync status, mempool
- **Service Management**: Start, stop, restart Docker services
- **Container Logs**: View and search container logs
- **Resource Monitoring**: CPU, memory, disk usage charts

### Wallet Features
- **Balance Management**: View BTC balance and UTXOs
- **Transaction History**: Recent transactions with details
- **Message Creation**: Create and broadcast Anchor messages
- **Backup & Restore**: Wallet backup functionality

### Identity Management
- **Create Identities**: Multiple identity support
- **DNS Publishing**: Publish identities to Anchor Domains
- **Profile Management**: Avatar, name, description

### System Features
- **Setup Wizard**: Guided initial configuration
- **Network Selection**: Mainnet, Testnet, Regtest
- **Appearance Settings**: Theme customization (Dark/Light)
- **Language Support**: Internationalization (i18n)
- **Security Settings**: Lock screen with inactivity timeout
- **Notification System**: Real-time system notifications

### Infrastructure Monitoring
- **Electrs/Fulcrum**: Electrum server status
- **PostgreSQL**: Database connections and status
- **Tor**: Privacy network integration status
- **Cloudflare**: DNS tunnel status
- **Tailscale**: VPN network status

### Widgets
- **Bitcoin Price**: Real-time BTC price
- **Mempool Summary**: Transaction pool statistics
- **Services Status**: Quick service overview
- **Backup Status**: Last backup information
- **Customizable Dashboard**: Drag-and-drop widget placement

---

## 🛠️ SDKs & Libraries

### Rust Libraries (crates.io)

#### anchor-core
- Binary encoding/decoding of Anchor messages
- Multi-carrier support
- Message detection in Bitcoin transactions
- Zero-copy parsing

#### anchor-specs
- Type-safe payload structures (DNS, Proof, Token, GeoMarker, etc.)
- Built-in validation for domain names, coordinates, hashes
- Carrier recommendations per kind
- `KindSpec` trait for consistent API

#### anchor-wallet-lib
- Bitcoin Core RPC integration
- PSBT transaction building
- Message creation (root and replies)
- Balance and UTXO management

### JavaScript/TypeScript Libraries (npm)

#### @AnchorProtocol/sdk
- Dual package (Node.js and browser)
- Full Anchor v1 encoding/parsing
- Wallet support (Bitcoin Core RPC)
- PSBT builder for external signing
- Full TypeScript definitions

#### @AnchorProtocol/ui
- React Design System
- Tailwind CSS styling
- shadcn/ui components
- Themed for each app (Threads, Canvas, etc.)

---

## 🏗️ Infrastructure

### Core Services
- **Bitcoin Core**: Full Bitcoin node (Regtest/Testnet/Mainnet)
- **PostgreSQL**: Database for indexing and app data
- **Anchor Indexer**: Blockchain indexer for Anchor messages
- **Anchor Wallet**: Transaction API for message creation
- **Anchor Testnet**: Test transaction generator

### Electrum Servers
- **Electrs**: Rust Electrum server
- **Fulcrum**: High-performance Electrum server

### Networking
- **Tor**: Privacy network for anonymous connections
- **Tailscale**: VPN mesh networking
- **Cloudflare Tunnel**: Public access without port forwarding

### Development Tools
- **Docker Compose**: Complete containerized environment
- **Database Migrations**: Centralized migration management
- **Hot Reload**: Development with live reloading
- **Swagger UI**: API documentation

---

## 📚 Documentation

### VitePress Docs Site
- Quickstart guide (5 minutes to first message)
- Core concepts (Message format, Carriers, Threading)
- SDK reference (TypeScript & Rust)
- Message kinds documentation
- Tutorial guides
- App documentation

---

## 🔐 Security Features

- **Bitcoin Security**: Inherits Bitcoin's censorship resistance and immutability
- **Cryptographic Timestamping**: Verifiable timestamps via blockchain
- **Client-Side Hashing**: Sensitive data never leaves the browser
- **Lock Screen**: Inactivity timeout protection
- **Wallet Encryption**: Secure key management

---

## 🌐 Network Support

| Network | Description |
|---------|-------------|
| Mainnet | Production Bitcoin network |
| Testnet | Testing on testnet3/testnet4 |
| Regtest | Local development network |

---

## 📈 API Endpoints

### Dashboard API (port 8010)
- Health check
- Bitcoin node info
- Docker container management
- System notifications
- Backup management

### Wallet API (port 8001)
- Wallet balance
- UTXO listing
- Message creation
- Block mining (regtest)
- Swagger UI documentation

### App APIs (various ports)
- Each app has its own REST API
- Statistics endpoints
- Data querying
- Transaction creation

---

## 🚀 Getting Started

```bash
# Clone and start
git clone https://github.com/AnchorProtocol/anchor.git
cd anchor
docker compose up -d

# Access the dashboard
open http://localhost:8000
```

### Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Dashboard | 8000 | Node management & monitoring |
| Docs | 3900 | Protocol documentation |
| Threads | 3100 | Social messaging |
| Canvas | 3200 | Collaborative pixel art |
| Places | 3300 | Geographic markers |
| Domains | 3400 | DNS on Bitcoin |
| Proofs | 3500 | Proof of existence |
| Tokens | 3600 | Token operations |
| Oracles | 3700 | Oracle attestations |
| Predictions | 3800 | Prediction markets |

---

## 📄 License

MIT License



