# Anchor Proofs

Anchor Proofs is a Bitcoin-powered proof of existence service. Users can timestamp documents, files, and digital content by storing cryptographic hashes on the Bitcoin blockchain, creating immutable evidence that data existed at a specific point in time.

## Overview

- **Protocol Kind**: Proof (Kind 11)
- **Carriers**: OP_RETURN, Inscription, WitnessData, Stamps
- **Frontend**: Next.js
- **Backend**: Rust (Axum) with PostgreSQL
- **Spec Crate**: `anchor-specs` (ProofSpec)

## Carrier Types

Choose how your proof is embedded on the Bitcoin blockchain:

| Carrier | ID | Description | Best For |
|---------|-----|-------------|----------|
| **OP_RETURN** | `0` | Standard Bitcoin output | Quick proofs, minimal data |
| **Inscription** | `1` | Ordinals-style inscription | Permanent, collectible proofs |
| **Stamps** | `2` | Bare multisig (unprunable) | Maximum permanence guarantee |
| **Witness Data** | `4` | Tapscript witness data | Large payloads, 75% fee savings |

### Carrier Recommendations

- **Hash only (no metadata)**: Use **OP_RETURN** - fastest and simplest
- **With filename/description**: Use **Witness Data** - 75% cheaper than OP_RETURN
- **Need Ordinal NFT**: Use **Inscription** - proof becomes an Ordinal
- **Critical permanence**: Use **Stamps** - cannot be pruned by nodes

## Features

- **Stamp Documents**: Create timestamped proofs for any file
- **Batch Proofs**: Register multiple files in a single transaction
- **Hash Algorithms**: Support for SHA-256 and SHA-512
- **File Metadata**: Store filename, MIME type, size, and description
- **Revocation**: Invalidate proofs with on-chain revocation
- **Verification**: Validate files against registered proofs
- **My Proofs**: View all proofs you've created across all your wallet addresses
- **Creator Tracking**: Each proof tracks which address created it

## How It Works

Files are never stored on-chain. Instead:

1. **Hash Locally**: The file is hashed client-side using SHA-256 or SHA-512
2. **Store Hash**: Only the hash (32 or 64 bytes) is stored on Bitcoin
3. **Timestamp**: The Bitcoin block timestamp proves when the hash was registered
4. **Verify Later**: Anyone can hash a file and check if it matches a registered proof

```
┌─────────────────────────────────────────────────────────────────┐
│                         Local Device                            │
│                                                                 │
│    ┌──────────────┐         ┌──────────────────────────────┐   │
│    │  document.pdf │ ─────► │  SHA-256: a1b2c3d4e5f6...    │   │
│    └──────────────┘   hash  └──────────────────────────────┘   │
│                                          │                      │
└──────────────────────────────────────────│──────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Bitcoin Blockchain                          │
│                                                                 │
│    Block 800,000 ─ Proof registered                             │
│    ├── txid: abc123...                                          │
│    └── payload: [Kind:11][STAMP][SHA256][hash][metadata]        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Operations

| Operation | Value | Description |
|-----------|-------|-------------|
| STAMP | `0x01` | Create a new proof of existence |
| REVOKE | `0x02` | Invalidate an existing proof |
| BATCH | `0x03` | Multiple proofs in a single transaction |

## Hash Algorithms

| Algorithm | Value | Hash Size |
|-----------|-------|-----------|
| SHA-256 | `0x01` | 32 bytes |
| SHA-512 | `0x02` | 64 bytes |

## API Endpoints

### Query Proofs

```bash
# List all proofs (paginated)
GET /api/proofs?page=1&per_page=50&include_revoked=false

# Search by filename or description
GET /api/proofs?search=contract

# Get proof by file hash
GET /api/proof/{hash}?algo=sha256

# Get proof by ID
GET /api/proof/id/{id}
```

### My Proofs

```bash
# Get proofs created by your wallet
GET /api/proofs/my?per_page=100
```

### Validate

```bash
# Check if a hash is registered
POST /api/validate
{
  "hash_algo": "sha256",
  "file_hash": "a1b2c3d4e5f6..."
}
```

### Create Proofs

```bash
# Stamp a single file
POST /api/stamp
{
  "hash_algo": "sha256",
  "file_hash": "a1b2c3d4e5f6...",
  "filename": "contract.pdf",
  "mime_type": "application/pdf",
  "file_size": 123456,
  "description": "Service agreement v2.1",
  "carrier": 0
}

# Batch stamp multiple files
POST /api/stamp/batch
{
  "entries": [
    {
      "hash_algo": "sha256",
      "file_hash": "a1b2c3d4e5f6...",
      "filename": "photo1.jpg"
    },
    {
      "hash_algo": "sha256",
      "file_hash": "b2c3d4e5f6a1...",
      "filename": "photo2.jpg"
    }
  ],
  "carrier": 0
}
```

### Revoke

```bash
# Revoke an existing proof
POST /api/revoke
{
  "hash_algo": "sha256",
  "file_hash": "a1b2c3d4e5f6...",
  "carrier": 0
}
```

## Statistics

```bash
# Get protocol statistics
GET /api/stats

# Response
{
  "total_proofs": 1234,
  "active_proofs": 1200,
  "revoked_proofs": 34,
  "sha256_proofs": 1100,
  "sha512_proofs": 134,
  "total_transactions": 1150,
  "last_block_height": 800000,
  "total_file_size": 5678901234
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                       │
│                  File Upload & Hash Generation                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Rust/Axum)                        │
├─────────────────────────────────────────────────────────────────┤
│  handlers/     │  db/          │  services/    │  indexer.rs   │
│  - system      │  - proofs     │  - wallet     │  - block scan │
│  - proofs      │  - indexer    │    client     │  - proof      │
│  - stamp       │    state      │               │    parsing    │
│  - my-proofs   │  - creator    │               │  - creator    │
│                │    address    │               │    tracking   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌───────────┐   ┌───────────┐   ┌───────────┐
       │ PostgreSQL│   │  Bitcoin  │   │  Anchor   │
       │           │   │   Core    │   │  Wallet   │
       └───────────┘   └───────────┘   └───────────┘
```

## Integration with anchor-specs

The backend uses `anchor-specs` for all Proof operations:

```rust
use anchor_specs::proof::{ProofSpec, ProofEntry, ProofMetadata, HashAlgorithm};
use anchor_specs::KindSpec;

// Create a stamp proof
let entry = ProofEntry::sha256(hash_bytes, ProofMetadata::new()
    .with_filename("document.pdf")
    .with_file_size(12345))?;
let spec = ProofSpec::stamp(entry);

// Validate and encode
spec.validate()?;
let payload = spec.to_bytes();

// Parse from blockchain
let spec = ProofSpec::from_bytes(&body)?;
match spec.operation {
    ProofOperation::Stamp => { /* handle stamp */ },
    ProofOperation::Revoke => { /* handle revoke */ },
    ProofOperation::Batch => { /* handle batch */ },
}
```

This ensures consistent validation and encoding across all Anchor applications.

## Revocation System

Revocation uses the Anchor protocol's anchoring system:

1. **Reference Original**: The revoke transaction includes an anchor to the original proof
2. **Verify Ownership**: Only the original creator can revoke a proof
3. **Immutable Record**: Both the proof and its revocation remain on-chain

```
Original Proof (Block 800,000)           Revocation (Block 800,100)
┌─────────────────────────┐              ┌─────────────────────────┐
│ txid: abc123...         │◄─────anchor──│ txid: def456...         │
│ operation: STAMP        │              │ operation: REVOKE       │
│ hash: a1b2c3d4...       │              │ hash: a1b2c3d4...       │
└─────────────────────────┘              └─────────────────────────┘
```

## Database Schema

```sql
-- Proofs table
CREATE TABLE proofs (
    id SERIAL PRIMARY KEY,
    hash_algo SMALLINT NOT NULL,     -- 1=SHA-256, 2=SHA-512
    file_hash BYTEA NOT NULL,
    filename VARCHAR(255),
    mime_type VARCHAR(100),
    file_size BIGINT,
    description TEXT,
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL,
    creator_address VARCHAR(100),     -- Tracks who created the proof
    block_hash BYTEA,
    block_height INTEGER,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_txid BYTEA,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (txid, vout),
    UNIQUE (file_hash, hash_algo)
);

-- Index for creator address (My Proofs feature)
CREATE INDEX idx_proofs_creator_address ON proofs(creator_address)
    WHERE creator_address IS NOT NULL;
```

## Use Cases

### Document Notarization

Prove that a contract, will, or legal document existed at a specific time:

```bash
# Hash and timestamp a contract
curl -X POST http://localhost:3501/api/stamp \
  -H "Content-Type: application/json" \
  -d '{
    "hash_algo": "sha256",
    "file_hash": "'$(sha256sum contract.pdf | cut -d' ' -f1)'",
    "filename": "contract.pdf",
    "description": "Business agreement"
  }'
```

### Code Releases

Prove source code authenticity at release time:

```bash
# Hash a release archive
tar -czf release-v1.0.0.tar.gz src/
hash=$(sha256sum release-v1.0.0.tar.gz | cut -d' ' -f1)

# Timestamp the release
curl -X POST http://localhost:3501/api/stamp \
  -H "Content-Type: application/json" \
  -d "{\"hash_algo\":\"sha256\",\"file_hash\":\"$hash\",\"description\":\"v1.0.0\"}"
```

### Media Authenticity

Prove original photos or videos haven't been modified:

```bash
# Batch timestamp a photo collection
curl -X POST http://localhost:3501/api/stamp/batch \
  -H "Content-Type: application/json" \
  -d '{
    "entries": [
      {"hash_algo":"sha256","file_hash":"<photo1-hash>","filename":"IMG_001.jpg"},
      {"hash_algo":"sha256","file_hash":"<photo2-hash>","filename":"IMG_002.jpg"}
    ]
  }'
```

## Running Locally

```bash
# Start all services
docker compose --profile app-proofs up -d

# Or start individually
docker compose up -d app-proofs-backend app-proofs-frontend

# Access the application
open http://localhost:3500
```

## Ports

| Service | Port |
|---------|------|
| Frontend | 3500 |
| Backend API | 3501 |
| Swagger UI | 3501/swagger-ui |

## See Also

- [Proof Kind (Kind 11)](/kinds/proof) - Payload specification
- [Anchor Canvas](/apps/canvas) - Collaborative pixel canvas
- [Anchor Places](/apps/places) - Location markers
- [Anchoring System](/protocol/anchoring) - Revocation chains

