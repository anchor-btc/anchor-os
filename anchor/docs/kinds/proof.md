# Kind 11: Proof

The **Proof** kind provides timestamped proof of existence for documents and files. It stores cryptographic hashes on Bitcoin to prove a document existed at a specific block time.

## Overview

- **Kind**: 11 (`0x0B`)
- **Name**: Proof
- **Status**: Extension
- **Max Payload**: 80 bytes for OP_RETURN, larger for Witness

## Operations

| Operation | Value | Description |
|-----------|-------|-------------|
| STAMP | `0x01` | Create proof of existence |
| REVOKE | `0x02` | Invalidate a previous proof |
| BATCH | `0x03` | Multiple proofs in one transaction |

## Hash Algorithms

| Algorithm | Value | Hash Size |
|-----------|-------|-----------|
| SHA-256 | `0x01` | 32 bytes |
| SHA-512 | `0x02` | 64 bytes |

## Payload Format

### STAMP Operation

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | operation | u8 | `0x01` (STAMP) |
| 1 | algorithm | u8 | Hash algorithm |
| 2-33/65 | hash | bytes | File hash (32 or 64 bytes) |
| ... | metadata | bytes | Optional metadata |

### Metadata Format

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | filename_len | u8 | Filename length |
| 1+ | filename | utf8 | Original filename |
| ... | mime_len | u8 | MIME type length |
| ... | mime | utf8 | MIME type |
| ... | file_size | u64 | File size in bytes |
| ... | desc_len | u8 | Description length |
| ... | desc | utf8 | Description text |

### BATCH Operation

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | operation | u8 | `0x03` (BATCH) |
| 1 | count | u8 | Number of entries |
| 2+ | entries | bytes | Repeated proof entries |

## TypeScript Interface

```typescript
enum ProofOperation {
  STAMP = 0x01,
  REVOKE = 0x02,
  BATCH = 0x03,
}

enum HashAlgorithm {
  SHA256 = 0x01,
  SHA512 = 0x02,
}

interface ProofMetadata {
  filename?: string
  mimeType?: string
  fileSize?: number
  description?: string
}

interface ProofPayload {
  operation: ProofOperation
  algorithm: HashAlgorithm
  hash: Uint8Array
  metadata?: ProofMetadata
}

interface BatchProofPayload {
  operation: ProofOperation.BATCH
  entries: Array<{
    algorithm: HashAlgorithm
    hash: Uint8Array
    metadata?: ProofMetadata
  }>
}
```

## Encoding Example

```typescript
const ANCHOR_KIND_PROOF = 11

function encodeProofPayload(payload: ProofPayload): Uint8Array {
  const entry = encodeProofEntry(
    payload.algorithm,
    payload.hash,
    payload.metadata
  )
  
  const result = new Uint8Array(1 + entry.length)
  result[0] = payload.operation
  result.set(entry, 1)
  
  return result
}

function encodeProofEntry(
  algorithm: HashAlgorithm,
  hash: Uint8Array,
  metadata?: ProofMetadata
): Uint8Array {
  const expectedSize = algorithm === HashAlgorithm.SHA256 ? 32 : 64
  if (hash.length !== expectedSize) {
    throw new Error(`Invalid hash size for algorithm`)
  }
  
  const metadataBytes = encodeMetadata(metadata)
  const result = new Uint8Array(1 + hash.length + metadataBytes.length)
  
  let offset = 0
  result[offset++] = algorithm
  result.set(hash, offset)
  offset += hash.length
  result.set(metadataBytes, offset)
  
  return result
}

function encodeMetadata(metadata?: ProofMetadata): Uint8Array {
  if (!metadata) {
    // Empty metadata: all zero-length fields
    return new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  }
  
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  
  // Filename
  const filenameBytes = metadata.filename
    ? encoder.encode(metadata.filename)
    : new Uint8Array(0)
  parts.push(new Uint8Array([filenameBytes.length]))
  parts.push(filenameBytes.slice(0, 255))
  
  // MIME type
  const mimeBytes = metadata.mimeType
    ? encoder.encode(metadata.mimeType)
    : new Uint8Array(0)
  parts.push(new Uint8Array([mimeBytes.length]))
  parts.push(mimeBytes.slice(0, 255))
  
  // File size (8 bytes, big-endian)
  const sizeBytes = new Uint8Array(8)
  new DataView(sizeBytes.buffer).setBigUint64(
    0, BigInt(metadata.fileSize || 0), false
  )
  parts.push(sizeBytes)
  
  // Description
  const descBytes = metadata.description
    ? encoder.encode(metadata.description)
    : new Uint8Array(0)
  parts.push(new Uint8Array([descBytes.length]))
  parts.push(descBytes.slice(0, 255))
  
  // Combine all parts
  const totalSize = parts.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(totalSize)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  
  return result
}
```

## Decoding Example

```typescript
function decodeProofPayload(bytes: Uint8Array): ProofPayload | null {
  if (bytes.length < 2) return null
  
  const operation = bytes[0] as ProofOperation
  
  if (operation === ProofOperation.BATCH) {
    return decodeBatchPayload(bytes)
  }
  
  // Single proof
  let offset = 1
  const algorithm = bytes[offset++] as HashAlgorithm
  const hashSize = algorithm === HashAlgorithm.SHA256 ? 32 : 64
  
  if (bytes.length < offset + hashSize) return null
  const hash = bytes.slice(offset, offset + hashSize)
  offset += hashSize
  
  const metaResult = decodeMetadata(bytes, offset)
  
  return {
    operation,
    algorithm,
    hash,
    metadata: metaResult?.metadata
  }
}
```

## Full Transaction Example

### Create a Proof

```typescript
async function createProof(
  wallet: AnchorWallet,
  file: File
): Promise<string> {
  // Hash the file
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hash = new Uint8Array(hashBuffer)
  
  // Create proof payload
  const payload = encodeProofPayload({
    operation: ProofOperation.STAMP,
    algorithm: HashAlgorithm.SHA256,
    hash,
    metadata: {
      filename: file.name,
      mimeType: file.type,
      fileSize: file.size
    }
  })
  
  // Create and broadcast message
  const message = createAnchorMessage({
    kind: 11,
    bodyBytes: payload,
    carrier: CarrierType.OpReturn
  })
  
  const result = await wallet.broadcast(message)
  console.log('Proof created at block:', result.blockHeight)
  
  return result.txid
}

// Usage
const proofTxid = await createProof(wallet, documentFile)
```

### Batch Multiple Proofs

```typescript
async function createBatchProof(
  wallet: AnchorWallet,
  files: File[]
): Promise<string> {
  const entries = await Promise.all(files.map(async (file) => {
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      await file.arrayBuffer()
    )
    return {
      algorithm: HashAlgorithm.SHA256,
      hash: new Uint8Array(hashBuffer),
      metadata: { filename: file.name }
    }
  }))
  
  const payload = encodeBatchProof({
    operation: ProofOperation.BATCH,
    entries
  })
  
  // May need larger carrier for batch
  const carrier = payload.length > 70
    ? CarrierType.WitnessData
    : CarrierType.OpReturn
  
  const message = createAnchorMessage({
    kind: 11,
    bodyBytes: payload,
    carrier
  })
  
  return (await wallet.broadcast(message)).txid
}
```

### Revoke a Proof

```typescript
async function revokeProof(
  wallet: AnchorWallet,
  originalProofTxid: string,
  hash: Uint8Array,
  reason?: string
): Promise<string> {
  const payload = encodeProofPayload({
    operation: ProofOperation.REVOKE,
    algorithm: HashAlgorithm.SHA256,
    hash,
    metadata: reason ? { description: reason } : undefined
  })
  
  const message = createAnchorMessage({
    kind: 11,
    bodyBytes: payload,
    anchors: [{ txid: originalProofTxid, vout: 0 }],
    carrier: CarrierType.OpReturn
  })
  
  return (await wallet.broadcast(message)).txid
}
```

## Verification

```typescript
class ProofVerifier {
  constructor(private indexer: AnchorIndexer) {}
  
  async verify(
    file: File,
    expectedTxid: string
  ): Promise<{ verified: boolean; timestamp?: Date; error?: string }> {
    // Hash the file
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      await file.arrayBuffer()
    )
    const fileHash = bytesToHex(new Uint8Array(hashBuffer))
    
    // Get the proof from chain
    const proof = await this.indexer.getProof(expectedTxid)
    if (!proof) {
      return { verified: false, error: 'Proof not found' }
    }
    
    // Check for revocation
    const revoked = await this.indexer.isRevoked(expectedTxid)
    if (revoked) {
      return { verified: false, error: 'Proof has been revoked' }
    }
    
    // Compare hashes
    const proofHash = bytesToHex(proof.hash)
    if (fileHash !== proofHash) {
      return { verified: false, error: 'Hash mismatch' }
    }
    
    return {
      verified: true,
      timestamp: proof.blockTime
    }
  }
}
```

## Size Calculations

```typescript
function fitsInOpReturn(payload: ProofPayload): boolean {
  const payloadSize = calculatePayloadSize(payload)
  return payloadSize + 6 <= 80  // 6 = protocol header
}

function calculatePayloadSize(payload: ProofPayload): number {
  const hashSize = payload.algorithm === HashAlgorithm.SHA256 ? 32 : 64
  let size = 2 + hashSize  // operation + algorithm + hash
  
  if (payload.metadata) {
    // Add metadata sizes
    const encoder = new TextEncoder()
    size += 1 + (payload.metadata.filename
      ? encoder.encode(payload.metadata.filename).length : 0)
    size += 1 + (payload.metadata.mimeType
      ? encoder.encode(payload.metadata.mimeType).length : 0)
    size += 8  // file size
    size += 1 + (payload.metadata.description
      ? encoder.encode(payload.metadata.description).length : 0)
  }
  
  return size
}
```

::: tip Minimal Proofs
For OP_RETURN, use only the hash without metadata:
- SHA-256 proof: 34 bytes (operation + algorithm + 32-byte hash)
- Fits easily in 80-byte limit
:::

## Use Cases

### Document Notarization

```typescript
// Timestamp a legal document
const proof = await createProof(wallet, contractPdf)
console.log('Contract notarized:', proof)
```

### Code Releases

```typescript
// Prove source code existed at release time
const sourceHash = await hashDirectory('./dist')
const proof = await createHashProof(wallet, sourceHash, {
  description: 'v1.0.0 release'
})
```

### Media Authenticity

```typescript
// Prove original photo wasn't modified
const photoProof = await createProof(wallet, originalPhoto)
// Later: verify against claimed original
const verified = await verifier.verify(claimedPhoto, photoProof)
```

## See Also

- [Anchor Proofs](https://proofs.anchor.dev) - Live application
- [Generic (Kind 0)](/kinds/generic) - Store raw hashes
- [Anchoring System](/protocol/anchoring) - Revocation chains



The **Proof** kind provides timestamped proof of existence for documents and files. It stores cryptographic hashes on Bitcoin to prove a document existed at a specific block time.

## Overview

- **Kind**: 11 (`0x0B`)
- **Name**: Proof
- **Status**: Extension
- **Max Payload**: 80 bytes for OP_RETURN, larger for Witness

## Operations

| Operation | Value | Description |
|-----------|-------|-------------|
| STAMP | `0x01` | Create proof of existence |
| REVOKE | `0x02` | Invalidate a previous proof |
| BATCH | `0x03` | Multiple proofs in one transaction |

## Hash Algorithms

| Algorithm | Value | Hash Size |
|-----------|-------|-----------|
| SHA-256 | `0x01` | 32 bytes |
| SHA-512 | `0x02` | 64 bytes |

## Payload Format

### STAMP Operation

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | operation | u8 | `0x01` (STAMP) |
| 1 | algorithm | u8 | Hash algorithm |
| 2-33/65 | hash | bytes | File hash (32 or 64 bytes) |
| ... | metadata | bytes | Optional metadata |

### Metadata Format

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | filename_len | u8 | Filename length |
| 1+ | filename | utf8 | Original filename |
| ... | mime_len | u8 | MIME type length |
| ... | mime | utf8 | MIME type |
| ... | file_size | u64 | File size in bytes |
| ... | desc_len | u8 | Description length |
| ... | desc | utf8 | Description text |

### BATCH Operation

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | operation | u8 | `0x03` (BATCH) |
| 1 | count | u8 | Number of entries |
| 2+ | entries | bytes | Repeated proof entries |

## TypeScript Interface

```typescript
enum ProofOperation {
  STAMP = 0x01,
  REVOKE = 0x02,
  BATCH = 0x03,
}

enum HashAlgorithm {
  SHA256 = 0x01,
  SHA512 = 0x02,
}

interface ProofMetadata {
  filename?: string
  mimeType?: string
  fileSize?: number
  description?: string
}

interface ProofPayload {
  operation: ProofOperation
  algorithm: HashAlgorithm
  hash: Uint8Array
  metadata?: ProofMetadata
}

interface BatchProofPayload {
  operation: ProofOperation.BATCH
  entries: Array<{
    algorithm: HashAlgorithm
    hash: Uint8Array
    metadata?: ProofMetadata
  }>
}
```

## Encoding Example

```typescript
const ANCHOR_KIND_PROOF = 11

function encodeProofPayload(payload: ProofPayload): Uint8Array {
  const entry = encodeProofEntry(
    payload.algorithm,
    payload.hash,
    payload.metadata
  )
  
  const result = new Uint8Array(1 + entry.length)
  result[0] = payload.operation
  result.set(entry, 1)
  
  return result
}

function encodeProofEntry(
  algorithm: HashAlgorithm,
  hash: Uint8Array,
  metadata?: ProofMetadata
): Uint8Array {
  const expectedSize = algorithm === HashAlgorithm.SHA256 ? 32 : 64
  if (hash.length !== expectedSize) {
    throw new Error(`Invalid hash size for algorithm`)
  }
  
  const metadataBytes = encodeMetadata(metadata)
  const result = new Uint8Array(1 + hash.length + metadataBytes.length)
  
  let offset = 0
  result[offset++] = algorithm
  result.set(hash, offset)
  offset += hash.length
  result.set(metadataBytes, offset)
  
  return result
}

function encodeMetadata(metadata?: ProofMetadata): Uint8Array {
  if (!metadata) {
    // Empty metadata: all zero-length fields
    return new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  }
  
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  
  // Filename
  const filenameBytes = metadata.filename
    ? encoder.encode(metadata.filename)
    : new Uint8Array(0)
  parts.push(new Uint8Array([filenameBytes.length]))
  parts.push(filenameBytes.slice(0, 255))
  
  // MIME type
  const mimeBytes = metadata.mimeType
    ? encoder.encode(metadata.mimeType)
    : new Uint8Array(0)
  parts.push(new Uint8Array([mimeBytes.length]))
  parts.push(mimeBytes.slice(0, 255))
  
  // File size (8 bytes, big-endian)
  const sizeBytes = new Uint8Array(8)
  new DataView(sizeBytes.buffer).setBigUint64(
    0, BigInt(metadata.fileSize || 0), false
  )
  parts.push(sizeBytes)
  
  // Description
  const descBytes = metadata.description
    ? encoder.encode(metadata.description)
    : new Uint8Array(0)
  parts.push(new Uint8Array([descBytes.length]))
  parts.push(descBytes.slice(0, 255))
  
  // Combine all parts
  const totalSize = parts.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(totalSize)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  
  return result
}
```

## Decoding Example

```typescript
function decodeProofPayload(bytes: Uint8Array): ProofPayload | null {
  if (bytes.length < 2) return null
  
  const operation = bytes[0] as ProofOperation
  
  if (operation === ProofOperation.BATCH) {
    return decodeBatchPayload(bytes)
  }
  
  // Single proof
  let offset = 1
  const algorithm = bytes[offset++] as HashAlgorithm
  const hashSize = algorithm === HashAlgorithm.SHA256 ? 32 : 64
  
  if (bytes.length < offset + hashSize) return null
  const hash = bytes.slice(offset, offset + hashSize)
  offset += hashSize
  
  const metaResult = decodeMetadata(bytes, offset)
  
  return {
    operation,
    algorithm,
    hash,
    metadata: metaResult?.metadata
  }
}
```

## Full Transaction Example

### Create a Proof

```typescript
async function createProof(
  wallet: AnchorWallet,
  file: File
): Promise<string> {
  // Hash the file
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hash = new Uint8Array(hashBuffer)
  
  // Create proof payload
  const payload = encodeProofPayload({
    operation: ProofOperation.STAMP,
    algorithm: HashAlgorithm.SHA256,
    hash,
    metadata: {
      filename: file.name,
      mimeType: file.type,
      fileSize: file.size
    }
  })
  
  // Create and broadcast message
  const message = createAnchorMessage({
    kind: 11,
    bodyBytes: payload,
    carrier: CarrierType.OpReturn
  })
  
  const result = await wallet.broadcast(message)
  console.log('Proof created at block:', result.blockHeight)
  
  return result.txid
}

// Usage
const proofTxid = await createProof(wallet, documentFile)
```

### Batch Multiple Proofs

```typescript
async function createBatchProof(
  wallet: AnchorWallet,
  files: File[]
): Promise<string> {
  const entries = await Promise.all(files.map(async (file) => {
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      await file.arrayBuffer()
    )
    return {
      algorithm: HashAlgorithm.SHA256,
      hash: new Uint8Array(hashBuffer),
      metadata: { filename: file.name }
    }
  }))
  
  const payload = encodeBatchProof({
    operation: ProofOperation.BATCH,
    entries
  })
  
  // May need larger carrier for batch
  const carrier = payload.length > 70
    ? CarrierType.WitnessData
    : CarrierType.OpReturn
  
  const message = createAnchorMessage({
    kind: 11,
    bodyBytes: payload,
    carrier
  })
  
  return (await wallet.broadcast(message)).txid
}
```

### Revoke a Proof

```typescript
async function revokeProof(
  wallet: AnchorWallet,
  originalProofTxid: string,
  hash: Uint8Array,
  reason?: string
): Promise<string> {
  const payload = encodeProofPayload({
    operation: ProofOperation.REVOKE,
    algorithm: HashAlgorithm.SHA256,
    hash,
    metadata: reason ? { description: reason } : undefined
  })
  
  const message = createAnchorMessage({
    kind: 11,
    bodyBytes: payload,
    anchors: [{ txid: originalProofTxid, vout: 0 }],
    carrier: CarrierType.OpReturn
  })
  
  return (await wallet.broadcast(message)).txid
}
```

## Verification

```typescript
class ProofVerifier {
  constructor(private indexer: AnchorIndexer) {}
  
  async verify(
    file: File,
    expectedTxid: string
  ): Promise<{ verified: boolean; timestamp?: Date; error?: string }> {
    // Hash the file
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      await file.arrayBuffer()
    )
    const fileHash = bytesToHex(new Uint8Array(hashBuffer))
    
    // Get the proof from chain
    const proof = await this.indexer.getProof(expectedTxid)
    if (!proof) {
      return { verified: false, error: 'Proof not found' }
    }
    
    // Check for revocation
    const revoked = await this.indexer.isRevoked(expectedTxid)
    if (revoked) {
      return { verified: false, error: 'Proof has been revoked' }
    }
    
    // Compare hashes
    const proofHash = bytesToHex(proof.hash)
    if (fileHash !== proofHash) {
      return { verified: false, error: 'Hash mismatch' }
    }
    
    return {
      verified: true,
      timestamp: proof.blockTime
    }
  }
}
```

## Size Calculations

```typescript
function fitsInOpReturn(payload: ProofPayload): boolean {
  const payloadSize = calculatePayloadSize(payload)
  return payloadSize + 6 <= 80  // 6 = protocol header
}

function calculatePayloadSize(payload: ProofPayload): number {
  const hashSize = payload.algorithm === HashAlgorithm.SHA256 ? 32 : 64
  let size = 2 + hashSize  // operation + algorithm + hash
  
  if (payload.metadata) {
    // Add metadata sizes
    const encoder = new TextEncoder()
    size += 1 + (payload.metadata.filename
      ? encoder.encode(payload.metadata.filename).length : 0)
    size += 1 + (payload.metadata.mimeType
      ? encoder.encode(payload.metadata.mimeType).length : 0)
    size += 8  // file size
    size += 1 + (payload.metadata.description
      ? encoder.encode(payload.metadata.description).length : 0)
  }
  
  return size
}
```

::: tip Minimal Proofs
For OP_RETURN, use only the hash without metadata:
- SHA-256 proof: 34 bytes (operation + algorithm + 32-byte hash)
- Fits easily in 80-byte limit
:::

## Use Cases

### Document Notarization

```typescript
// Timestamp a legal document
const proof = await createProof(wallet, contractPdf)
console.log('Contract notarized:', proof)
```

### Code Releases

```typescript
// Prove source code existed at release time
const sourceHash = await hashDirectory('./dist')
const proof = await createHashProof(wallet, sourceHash, {
  description: 'v1.0.0 release'
})
```

### Media Authenticity

```typescript
// Prove original photo wasn't modified
const photoProof = await createProof(wallet, originalPhoto)
// Later: verify against claimed original
const verified = await verifier.verify(claimedPhoto, photoProof)
```

## See Also

- [Anchor Proofs](https://proofs.anchor.dev) - Live application
- [Generic (Kind 0)](/kinds/generic) - Store raw hashes
- [Anchoring System](/protocol/anchoring) - Revocation chains



The **Proof** kind provides timestamped proof of existence for documents and files. It stores cryptographic hashes on Bitcoin to prove a document existed at a specific block time.

## Overview

- **Kind**: 11 (`0x0B`)
- **Name**: Proof
- **Status**: Extension
- **Max Payload**: 80 bytes for OP_RETURN, larger for Witness

## Operations

| Operation | Value | Description |
|-----------|-------|-------------|
| STAMP | `0x01` | Create proof of existence |
| REVOKE | `0x02` | Invalidate a previous proof |
| BATCH | `0x03` | Multiple proofs in one transaction |

## Hash Algorithms

| Algorithm | Value | Hash Size |
|-----------|-------|-----------|
| SHA-256 | `0x01` | 32 bytes |
| SHA-512 | `0x02` | 64 bytes |

## Payload Format

### STAMP Operation

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | operation | u8 | `0x01` (STAMP) |
| 1 | algorithm | u8 | Hash algorithm |
| 2-33/65 | hash | bytes | File hash (32 or 64 bytes) |
| ... | metadata | bytes | Optional metadata |

### Metadata Format

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | filename_len | u8 | Filename length |
| 1+ | filename | utf8 | Original filename |
| ... | mime_len | u8 | MIME type length |
| ... | mime | utf8 | MIME type |
| ... | file_size | u64 | File size in bytes |
| ... | desc_len | u8 | Description length |
| ... | desc | utf8 | Description text |

### BATCH Operation

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | operation | u8 | `0x03` (BATCH) |
| 1 | count | u8 | Number of entries |
| 2+ | entries | bytes | Repeated proof entries |

## TypeScript Interface

```typescript
enum ProofOperation {
  STAMP = 0x01,
  REVOKE = 0x02,
  BATCH = 0x03,
}

enum HashAlgorithm {
  SHA256 = 0x01,
  SHA512 = 0x02,
}

interface ProofMetadata {
  filename?: string
  mimeType?: string
  fileSize?: number
  description?: string
}

interface ProofPayload {
  operation: ProofOperation
  algorithm: HashAlgorithm
  hash: Uint8Array
  metadata?: ProofMetadata
}

interface BatchProofPayload {
  operation: ProofOperation.BATCH
  entries: Array<{
    algorithm: HashAlgorithm
    hash: Uint8Array
    metadata?: ProofMetadata
  }>
}
```

## Encoding Example

```typescript
const ANCHOR_KIND_PROOF = 11

function encodeProofPayload(payload: ProofPayload): Uint8Array {
  const entry = encodeProofEntry(
    payload.algorithm,
    payload.hash,
    payload.metadata
  )
  
  const result = new Uint8Array(1 + entry.length)
  result[0] = payload.operation
  result.set(entry, 1)
  
  return result
}

function encodeProofEntry(
  algorithm: HashAlgorithm,
  hash: Uint8Array,
  metadata?: ProofMetadata
): Uint8Array {
  const expectedSize = algorithm === HashAlgorithm.SHA256 ? 32 : 64
  if (hash.length !== expectedSize) {
    throw new Error(`Invalid hash size for algorithm`)
  }
  
  const metadataBytes = encodeMetadata(metadata)
  const result = new Uint8Array(1 + hash.length + metadataBytes.length)
  
  let offset = 0
  result[offset++] = algorithm
  result.set(hash, offset)
  offset += hash.length
  result.set(metadataBytes, offset)
  
  return result
}

function encodeMetadata(metadata?: ProofMetadata): Uint8Array {
  if (!metadata) {
    // Empty metadata: all zero-length fields
    return new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  }
  
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  
  // Filename
  const filenameBytes = metadata.filename
    ? encoder.encode(metadata.filename)
    : new Uint8Array(0)
  parts.push(new Uint8Array([filenameBytes.length]))
  parts.push(filenameBytes.slice(0, 255))
  
  // MIME type
  const mimeBytes = metadata.mimeType
    ? encoder.encode(metadata.mimeType)
    : new Uint8Array(0)
  parts.push(new Uint8Array([mimeBytes.length]))
  parts.push(mimeBytes.slice(0, 255))
  
  // File size (8 bytes, big-endian)
  const sizeBytes = new Uint8Array(8)
  new DataView(sizeBytes.buffer).setBigUint64(
    0, BigInt(metadata.fileSize || 0), false
  )
  parts.push(sizeBytes)
  
  // Description
  const descBytes = metadata.description
    ? encoder.encode(metadata.description)
    : new Uint8Array(0)
  parts.push(new Uint8Array([descBytes.length]))
  parts.push(descBytes.slice(0, 255))
  
  // Combine all parts
  const totalSize = parts.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(totalSize)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  
  return result
}
```

## Decoding Example

```typescript
function decodeProofPayload(bytes: Uint8Array): ProofPayload | null {
  if (bytes.length < 2) return null
  
  const operation = bytes[0] as ProofOperation
  
  if (operation === ProofOperation.BATCH) {
    return decodeBatchPayload(bytes)
  }
  
  // Single proof
  let offset = 1
  const algorithm = bytes[offset++] as HashAlgorithm
  const hashSize = algorithm === HashAlgorithm.SHA256 ? 32 : 64
  
  if (bytes.length < offset + hashSize) return null
  const hash = bytes.slice(offset, offset + hashSize)
  offset += hashSize
  
  const metaResult = decodeMetadata(bytes, offset)
  
  return {
    operation,
    algorithm,
    hash,
    metadata: metaResult?.metadata
  }
}
```

## Full Transaction Example

### Create a Proof

```typescript
async function createProof(
  wallet: AnchorWallet,
  file: File
): Promise<string> {
  // Hash the file
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hash = new Uint8Array(hashBuffer)
  
  // Create proof payload
  const payload = encodeProofPayload({
    operation: ProofOperation.STAMP,
    algorithm: HashAlgorithm.SHA256,
    hash,
    metadata: {
      filename: file.name,
      mimeType: file.type,
      fileSize: file.size
    }
  })
  
  // Create and broadcast message
  const message = createAnchorMessage({
    kind: 11,
    bodyBytes: payload,
    carrier: CarrierType.OpReturn
  })
  
  const result = await wallet.broadcast(message)
  console.log('Proof created at block:', result.blockHeight)
  
  return result.txid
}

// Usage
const proofTxid = await createProof(wallet, documentFile)
```

### Batch Multiple Proofs

```typescript
async function createBatchProof(
  wallet: AnchorWallet,
  files: File[]
): Promise<string> {
  const entries = await Promise.all(files.map(async (file) => {
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      await file.arrayBuffer()
    )
    return {
      algorithm: HashAlgorithm.SHA256,
      hash: new Uint8Array(hashBuffer),
      metadata: { filename: file.name }
    }
  }))
  
  const payload = encodeBatchProof({
    operation: ProofOperation.BATCH,
    entries
  })
  
  // May need larger carrier for batch
  const carrier = payload.length > 70
    ? CarrierType.WitnessData
    : CarrierType.OpReturn
  
  const message = createAnchorMessage({
    kind: 11,
    bodyBytes: payload,
    carrier
  })
  
  return (await wallet.broadcast(message)).txid
}
```

### Revoke a Proof

```typescript
async function revokeProof(
  wallet: AnchorWallet,
  originalProofTxid: string,
  hash: Uint8Array,
  reason?: string
): Promise<string> {
  const payload = encodeProofPayload({
    operation: ProofOperation.REVOKE,
    algorithm: HashAlgorithm.SHA256,
    hash,
    metadata: reason ? { description: reason } : undefined
  })
  
  const message = createAnchorMessage({
    kind: 11,
    bodyBytes: payload,
    anchors: [{ txid: originalProofTxid, vout: 0 }],
    carrier: CarrierType.OpReturn
  })
  
  return (await wallet.broadcast(message)).txid
}
```

## Verification

```typescript
class ProofVerifier {
  constructor(private indexer: AnchorIndexer) {}
  
  async verify(
    file: File,
    expectedTxid: string
  ): Promise<{ verified: boolean; timestamp?: Date; error?: string }> {
    // Hash the file
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      await file.arrayBuffer()
    )
    const fileHash = bytesToHex(new Uint8Array(hashBuffer))
    
    // Get the proof from chain
    const proof = await this.indexer.getProof(expectedTxid)
    if (!proof) {
      return { verified: false, error: 'Proof not found' }
    }
    
    // Check for revocation
    const revoked = await this.indexer.isRevoked(expectedTxid)
    if (revoked) {
      return { verified: false, error: 'Proof has been revoked' }
    }
    
    // Compare hashes
    const proofHash = bytesToHex(proof.hash)
    if (fileHash !== proofHash) {
      return { verified: false, error: 'Hash mismatch' }
    }
    
    return {
      verified: true,
      timestamp: proof.blockTime
    }
  }
}
```

## Size Calculations

```typescript
function fitsInOpReturn(payload: ProofPayload): boolean {
  const payloadSize = calculatePayloadSize(payload)
  return payloadSize + 6 <= 80  // 6 = protocol header
}

function calculatePayloadSize(payload: ProofPayload): number {
  const hashSize = payload.algorithm === HashAlgorithm.SHA256 ? 32 : 64
  let size = 2 + hashSize  // operation + algorithm + hash
  
  if (payload.metadata) {
    // Add metadata sizes
    const encoder = new TextEncoder()
    size += 1 + (payload.metadata.filename
      ? encoder.encode(payload.metadata.filename).length : 0)
    size += 1 + (payload.metadata.mimeType
      ? encoder.encode(payload.metadata.mimeType).length : 0)
    size += 8  // file size
    size += 1 + (payload.metadata.description
      ? encoder.encode(payload.metadata.description).length : 0)
  }
  
  return size
}
```

::: tip Minimal Proofs
For OP_RETURN, use only the hash without metadata:
- SHA-256 proof: 34 bytes (operation + algorithm + 32-byte hash)
- Fits easily in 80-byte limit
:::

## Use Cases

### Document Notarization

```typescript
// Timestamp a legal document
const proof = await createProof(wallet, contractPdf)
console.log('Contract notarized:', proof)
```

### Code Releases

```typescript
// Prove source code existed at release time
const sourceHash = await hashDirectory('./dist')
const proof = await createHashProof(wallet, sourceHash, {
  description: 'v1.0.0 release'
})
```

### Media Authenticity

```typescript
// Prove original photo wasn't modified
const photoProof = await createProof(wallet, originalPhoto)
// Later: verify against claimed original
const verified = await verifier.verify(claimedPhoto, photoProof)
```

## See Also

- [Anchor Proofs](https://proofs.anchor.dev) - Live application
- [Generic (Kind 0)](/kinds/generic) - Store raw hashes
- [Anchoring System](/protocol/anchoring) - Revocation chains



The **Proof** kind provides timestamped proof of existence for documents and files. It stores cryptographic hashes on Bitcoin to prove a document existed at a specific block time.

## Overview

- **Kind**: 11 (`0x0B`)
- **Name**: Proof
- **Status**: Extension
- **Max Payload**: 80 bytes for OP_RETURN, larger for Witness

## Operations

| Operation | Value | Description |
|-----------|-------|-------------|
| STAMP | `0x01` | Create proof of existence |
| REVOKE | `0x02` | Invalidate a previous proof |
| BATCH | `0x03` | Multiple proofs in one transaction |

## Hash Algorithms

| Algorithm | Value | Hash Size |
|-----------|-------|-----------|
| SHA-256 | `0x01` | 32 bytes |
| SHA-512 | `0x02` | 64 bytes |

## Payload Format

### STAMP Operation

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | operation | u8 | `0x01` (STAMP) |
| 1 | algorithm | u8 | Hash algorithm |
| 2-33/65 | hash | bytes | File hash (32 or 64 bytes) |
| ... | metadata | bytes | Optional metadata |

### Metadata Format

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | filename_len | u8 | Filename length |
| 1+ | filename | utf8 | Original filename |
| ... | mime_len | u8 | MIME type length |
| ... | mime | utf8 | MIME type |
| ... | file_size | u64 | File size in bytes |
| ... | desc_len | u8 | Description length |
| ... | desc | utf8 | Description text |

### BATCH Operation

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | operation | u8 | `0x03` (BATCH) |
| 1 | count | u8 | Number of entries |
| 2+ | entries | bytes | Repeated proof entries |

## TypeScript Interface

```typescript
enum ProofOperation {
  STAMP = 0x01,
  REVOKE = 0x02,
  BATCH = 0x03,
}

enum HashAlgorithm {
  SHA256 = 0x01,
  SHA512 = 0x02,
}

interface ProofMetadata {
  filename?: string
  mimeType?: string
  fileSize?: number
  description?: string
}

interface ProofPayload {
  operation: ProofOperation
  algorithm: HashAlgorithm
  hash: Uint8Array
  metadata?: ProofMetadata
}

interface BatchProofPayload {
  operation: ProofOperation.BATCH
  entries: Array<{
    algorithm: HashAlgorithm
    hash: Uint8Array
    metadata?: ProofMetadata
  }>
}
```

## Encoding Example

```typescript
const ANCHOR_KIND_PROOF = 11

function encodeProofPayload(payload: ProofPayload): Uint8Array {
  const entry = encodeProofEntry(
    payload.algorithm,
    payload.hash,
    payload.metadata
  )
  
  const result = new Uint8Array(1 + entry.length)
  result[0] = payload.operation
  result.set(entry, 1)
  
  return result
}

function encodeProofEntry(
  algorithm: HashAlgorithm,
  hash: Uint8Array,
  metadata?: ProofMetadata
): Uint8Array {
  const expectedSize = algorithm === HashAlgorithm.SHA256 ? 32 : 64
  if (hash.length !== expectedSize) {
    throw new Error(`Invalid hash size for algorithm`)
  }
  
  const metadataBytes = encodeMetadata(metadata)
  const result = new Uint8Array(1 + hash.length + metadataBytes.length)
  
  let offset = 0
  result[offset++] = algorithm
  result.set(hash, offset)
  offset += hash.length
  result.set(metadataBytes, offset)
  
  return result
}

function encodeMetadata(metadata?: ProofMetadata): Uint8Array {
  if (!metadata) {
    // Empty metadata: all zero-length fields
    return new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  }
  
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  
  // Filename
  const filenameBytes = metadata.filename
    ? encoder.encode(metadata.filename)
    : new Uint8Array(0)
  parts.push(new Uint8Array([filenameBytes.length]))
  parts.push(filenameBytes.slice(0, 255))
  
  // MIME type
  const mimeBytes = metadata.mimeType
    ? encoder.encode(metadata.mimeType)
    : new Uint8Array(0)
  parts.push(new Uint8Array([mimeBytes.length]))
  parts.push(mimeBytes.slice(0, 255))
  
  // File size (8 bytes, big-endian)
  const sizeBytes = new Uint8Array(8)
  new DataView(sizeBytes.buffer).setBigUint64(
    0, BigInt(metadata.fileSize || 0), false
  )
  parts.push(sizeBytes)
  
  // Description
  const descBytes = metadata.description
    ? encoder.encode(metadata.description)
    : new Uint8Array(0)
  parts.push(new Uint8Array([descBytes.length]))
  parts.push(descBytes.slice(0, 255))
  
  // Combine all parts
  const totalSize = parts.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(totalSize)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  
  return result
}
```

## Decoding Example

```typescript
function decodeProofPayload(bytes: Uint8Array): ProofPayload | null {
  if (bytes.length < 2) return null
  
  const operation = bytes[0] as ProofOperation
  
  if (operation === ProofOperation.BATCH) {
    return decodeBatchPayload(bytes)
  }
  
  // Single proof
  let offset = 1
  const algorithm = bytes[offset++] as HashAlgorithm
  const hashSize = algorithm === HashAlgorithm.SHA256 ? 32 : 64
  
  if (bytes.length < offset + hashSize) return null
  const hash = bytes.slice(offset, offset + hashSize)
  offset += hashSize
  
  const metaResult = decodeMetadata(bytes, offset)
  
  return {
    operation,
    algorithm,
    hash,
    metadata: metaResult?.metadata
  }
}
```

## Full Transaction Example

### Create a Proof

```typescript
async function createProof(
  wallet: AnchorWallet,
  file: File
): Promise<string> {
  // Hash the file
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hash = new Uint8Array(hashBuffer)
  
  // Create proof payload
  const payload = encodeProofPayload({
    operation: ProofOperation.STAMP,
    algorithm: HashAlgorithm.SHA256,
    hash,
    metadata: {
      filename: file.name,
      mimeType: file.type,
      fileSize: file.size
    }
  })
  
  // Create and broadcast message
  const message = createAnchorMessage({
    kind: 11,
    bodyBytes: payload,
    carrier: CarrierType.OpReturn
  })
  
  const result = await wallet.broadcast(message)
  console.log('Proof created at block:', result.blockHeight)
  
  return result.txid
}

// Usage
const proofTxid = await createProof(wallet, documentFile)
```

### Batch Multiple Proofs

```typescript
async function createBatchProof(
  wallet: AnchorWallet,
  files: File[]
): Promise<string> {
  const entries = await Promise.all(files.map(async (file) => {
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      await file.arrayBuffer()
    )
    return {
      algorithm: HashAlgorithm.SHA256,
      hash: new Uint8Array(hashBuffer),
      metadata: { filename: file.name }
    }
  }))
  
  const payload = encodeBatchProof({
    operation: ProofOperation.BATCH,
    entries
  })
  
  // May need larger carrier for batch
  const carrier = payload.length > 70
    ? CarrierType.WitnessData
    : CarrierType.OpReturn
  
  const message = createAnchorMessage({
    kind: 11,
    bodyBytes: payload,
    carrier
  })
  
  return (await wallet.broadcast(message)).txid
}
```

### Revoke a Proof

```typescript
async function revokeProof(
  wallet: AnchorWallet,
  originalProofTxid: string,
  hash: Uint8Array,
  reason?: string
): Promise<string> {
  const payload = encodeProofPayload({
    operation: ProofOperation.REVOKE,
    algorithm: HashAlgorithm.SHA256,
    hash,
    metadata: reason ? { description: reason } : undefined
  })
  
  const message = createAnchorMessage({
    kind: 11,
    bodyBytes: payload,
    anchors: [{ txid: originalProofTxid, vout: 0 }],
    carrier: CarrierType.OpReturn
  })
  
  return (await wallet.broadcast(message)).txid
}
```

## Verification

```typescript
class ProofVerifier {
  constructor(private indexer: AnchorIndexer) {}
  
  async verify(
    file: File,
    expectedTxid: string
  ): Promise<{ verified: boolean; timestamp?: Date; error?: string }> {
    // Hash the file
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      await file.arrayBuffer()
    )
    const fileHash = bytesToHex(new Uint8Array(hashBuffer))
    
    // Get the proof from chain
    const proof = await this.indexer.getProof(expectedTxid)
    if (!proof) {
      return { verified: false, error: 'Proof not found' }
    }
    
    // Check for revocation
    const revoked = await this.indexer.isRevoked(expectedTxid)
    if (revoked) {
      return { verified: false, error: 'Proof has been revoked' }
    }
    
    // Compare hashes
    const proofHash = bytesToHex(proof.hash)
    if (fileHash !== proofHash) {
      return { verified: false, error: 'Hash mismatch' }
    }
    
    return {
      verified: true,
      timestamp: proof.blockTime
    }
  }
}
```

## Size Calculations

```typescript
function fitsInOpReturn(payload: ProofPayload): boolean {
  const payloadSize = calculatePayloadSize(payload)
  return payloadSize + 6 <= 80  // 6 = protocol header
}

function calculatePayloadSize(payload: ProofPayload): number {
  const hashSize = payload.algorithm === HashAlgorithm.SHA256 ? 32 : 64
  let size = 2 + hashSize  // operation + algorithm + hash
  
  if (payload.metadata) {
    // Add metadata sizes
    const encoder = new TextEncoder()
    size += 1 + (payload.metadata.filename
      ? encoder.encode(payload.metadata.filename).length : 0)
    size += 1 + (payload.metadata.mimeType
      ? encoder.encode(payload.metadata.mimeType).length : 0)
    size += 8  // file size
    size += 1 + (payload.metadata.description
      ? encoder.encode(payload.metadata.description).length : 0)
  }
  
  return size
}
```

::: tip Minimal Proofs
For OP_RETURN, use only the hash without metadata:
- SHA-256 proof: 34 bytes (operation + algorithm + 32-byte hash)
- Fits easily in 80-byte limit
:::

## Use Cases

### Document Notarization

```typescript
// Timestamp a legal document
const proof = await createProof(wallet, contractPdf)
console.log('Contract notarized:', proof)
```

### Code Releases

```typescript
// Prove source code existed at release time
const sourceHash = await hashDirectory('./dist')
const proof = await createHashProof(wallet, sourceHash, {
  description: 'v1.0.0 release'
})
```

### Media Authenticity

```typescript
// Prove original photo wasn't modified
const photoProof = await createProof(wallet, originalPhoto)
// Later: verify against claimed original
const verified = await verifier.verify(claimedPhoto, photoProof)
```

## See Also

- [Anchor Proofs](https://proofs.anchor.dev) - Live application
- [Generic (Kind 0)](/kinds/generic) - Store raw hashes
- [Anchoring System](/protocol/anchoring) - Revocation chains


