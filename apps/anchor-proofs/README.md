# AnchorProofs - Proof of Existence on Bitcoin

AnchorProofs is a proof of existence application built on the Anchor Protocol. It allows users to timestamp any file on the Bitcoin blockchain, creating an immutable record that the file existed at a specific point in time.

## Features

- **File Timestamping**: Upload any file and create a permanent proof of existence on Bitcoin
- **Multiple Hash Algorithms**: Support for both SHA-256 and SHA-512 hashes
- **File Validation**: Verify if a file has been previously timestamped
- **Batch Stamping**: Register multiple files in a single transaction
- **Revocation**: Invalidate a proof if needed
- **PDF Certificates**: Generate downloadable certificates for proofs
- **Client-Side Hashing**: Files never leave your browser - only the hash is sent

## Architecture

```
apps/anchorproof/
├── backend/           # Rust API server with indexer
│   ├── src/
│   │   ├── main.rs       # Entry point
│   │   ├── config.rs     # Configuration
│   │   ├── db.rs         # Database operations
│   │   ├── handlers.rs   # HTTP handlers
│   │   ├── indexer.rs    # Blockchain indexer
│   │   └── models.rs     # Data models
│   └── Cargo.toml
├── frontend/          # Next.js web application
│   ├── src/
│   │   ├── app/          # Pages
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities
│   └── package.json
└── postgres/
    └── init.sql       # Database schema
```

## Protocol Specification

AnchorProofs uses **Kind 11** (Custom) in the Anchor Protocol.

### Payload Format

```
[operation: u8][hash_algo: u8][hash: 32/64 bytes][metadata...]

Metadata (optional):
[filename_len: u8][filename: utf8]
[mime_len: u8][mime: utf8]
[file_size: u64]
[desc_len: u8][desc: utf8]
```

### Operations

| Value | Name | Description |
|-------|------|-------------|
| 0x01 | STAMP | Register new proof of existence |
| 0x02 | REVOKE | Invalidate existing proof (requires anchor to original) |
| 0x03 | BATCH | Multiple proofs in single transaction |

### Hash Algorithms

| Value | Algorithm | Size |
|-------|-----------|------|
| 0x01 | SHA-256 | 32 bytes |
| 0x02 | SHA-512 | 64 bytes |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/stats` | Protocol statistics |
| GET | `/api/proofs` | List all proofs (paginated) |
| GET | `/api/proof/{hash}` | Get proof by file hash |
| GET | `/api/proof/id/{id}` | Get proof by ID |
| POST | `/api/validate` | Check if hash exists |
| POST | `/api/stamp` | Create new proof |
| POST | `/api/stamp/batch` | Create batch proof |
| POST | `/api/revoke` | Revoke existing proof |

## Development

### Prerequisites

- Rust 1.75+
- Node.js 20+
- PostgreSQL 16+
- Bitcoin Core (regtest)

### Running Locally

1. Start the infrastructure:
```bash
docker-compose up -d bitcoin postgres wallet
```

2. Run the backend:
```bash
cd apps/anchorproof/backend
cargo run
```

3. Run the frontend:
```bash
cd apps/anchorproof/frontend
npm install
npm run dev
```

4. Open http://localhost:3011

### Running with Docker

```bash
docker-compose up -d anchorproof-backend anchorproof-web
```

- Frontend: http://localhost:3013
- Backend API: http://localhost:3012
- Swagger UI: http://localhost:3012/swagger-ui

## Use Cases

- **Intellectual Property**: Prove you created a document/artwork before a certain date
- **Legal Documents**: Timestamp contracts, agreements, or evidence
- **Research**: Establish priority for scientific discoveries
- **Business Records**: Create tamper-proof audit trails
- **Personal**: Timestamp photos, videos, or important files

## How It Works

1. **Upload**: User selects a file in their browser
2. **Hash**: File is hashed locally using SHA-256 or SHA-512
3. **Publish**: Hash is embedded in a Bitcoin transaction using Anchor Protocol
4. **Index**: Backend indexer detects and stores the proof
5. **Verify**: Anyone can verify by uploading the same file and comparing hashes

## Security Considerations

- Files never leave your browser - only the hash is transmitted
- SHA-256/SHA-512 are cryptographically secure hash functions
- Bitcoin's blockchain provides immutability and timestamping
- Proofs can be independently verified using any Bitcoin node

## License

MIT License - see LICENSE file for details.
