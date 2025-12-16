/**
 * AnchorProof Encoder/Decoder
 *
 * Encodes/decodes Proof of Existence records for the Anchor Protocol.
 * Uses AnchorKind::Custom(11) for proof operations.
 *
 * Payload format:
 * [operation: u8][hash_algo: u8][hash: 32/64 bytes][metadata...]
 *
 * Metadata format (optional, length-prefixed):
 * [filename_len: u8][filename: utf8]
 * [mime_len: u8][mime: utf8]
 * [file_size: u64]
 * [desc_len: u8][desc: utf8]
 *
 * Batch format:
 * [operation: u8][count: u8][entries...]
 * Entry: [hash_algo: u8][hash: 32/64 bytes][metadata...]
 */

// Anchor protocol constants
const ANCHOR_MAGIC = new Uint8Array([0xa1, 0x1c, 0x00, 0x01]);
const ANCHOR_KIND_PROOF = 11; // Custom kind for Proof of Existence

/**
 * Proof Operations
 */
export enum ProofOperation {
  STAMP = 0x01, // Register proof of existence
  REVOKE = 0x02, // Invalidate a previous proof
  BATCH = 0x03, // Multiple proofs in single TX
}

/**
 * Hash Algorithms
 */
export enum HashAlgorithm {
  SHA256 = 0x01, // 32 bytes
  SHA512 = 0x02, // 64 bytes
}

/**
 * Get hash size for algorithm
 */
export function getHashSize(algo: HashAlgorithm): number {
  switch (algo) {
    case HashAlgorithm.SHA256:
      return 32;
    case HashAlgorithm.SHA512:
      return 64;
    default:
      throw new Error(`Unknown hash algorithm: ${algo}`);
  }
}

/**
 * Get human-readable algorithm name
 */
export function getAlgorithmName(algo: HashAlgorithm): string {
  switch (algo) {
    case HashAlgorithm.SHA256:
      return "SHA-256";
    case HashAlgorithm.SHA512:
      return "SHA-512";
    default:
      return "UNKNOWN";
  }
}

/**
 * Get operation name
 */
export function getOperationName(op: ProofOperation): string {
  switch (op) {
    case ProofOperation.STAMP:
      return "STAMP";
    case ProofOperation.REVOKE:
      return "REVOKE";
    case ProofOperation.BATCH:
      return "BATCH";
    default:
      return "UNKNOWN";
  }
}

/**
 * Proof metadata interface
 */
export interface ProofMetadata {
  filename?: string;
  mimeType?: string;
  fileSize?: number;
  description?: string;
}

/**
 * Single proof payload interface
 */
export interface ProofPayload {
  operation: ProofOperation;
  algorithm: HashAlgorithm;
  hash: Uint8Array;
  metadata?: ProofMetadata;
}

/**
 * Batch proof payload interface
 */
export interface BatchProofPayload {
  operation: ProofOperation.BATCH;
  entries: Array<{
    algorithm: HashAlgorithm;
    hash: Uint8Array;
    metadata?: ProofMetadata;
  }>;
}

/**
 * Combined payload type
 */
export type AnchorProofPayload = ProofPayload | BatchProofPayload;

/**
 * Encode metadata to bytes
 */
function encodeMetadata(metadata?: ProofMetadata): Uint8Array {
  if (!metadata) {
    return new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); // Empty metadata: 0-len strings + 0 size
  }

  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];

  // Filename (length-prefixed)
  const filenameBytes = metadata.filename
    ? encoder.encode(metadata.filename)
    : new Uint8Array(0);
  parts.push(new Uint8Array([Math.min(filenameBytes.length, 255)]));
  if (filenameBytes.length > 0) {
    parts.push(filenameBytes.slice(0, 255));
  }

  // MIME type (length-prefixed)
  const mimeBytes = metadata.mimeType
    ? encoder.encode(metadata.mimeType)
    : new Uint8Array(0);
  parts.push(new Uint8Array([Math.min(mimeBytes.length, 255)]));
  if (mimeBytes.length > 0) {
    parts.push(mimeBytes.slice(0, 255));
  }

  // File size (8 bytes, big-endian)
  const sizeBytes = new Uint8Array(8);
  const sizeView = new DataView(sizeBytes.buffer);
  sizeView.setBigUint64(0, BigInt(metadata.fileSize || 0), false);
  parts.push(sizeBytes);

  // Description (length-prefixed)
  const descBytes = metadata.description
    ? encoder.encode(metadata.description)
    : new Uint8Array(0);
  parts.push(new Uint8Array([Math.min(descBytes.length, 255)]));
  if (descBytes.length > 0) {
    parts.push(descBytes.slice(0, 255));
  }

  // Calculate total size
  const totalSize = parts.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalSize);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

/**
 * Decode metadata from bytes
 */
function decodeMetadata(
  bytes: Uint8Array,
  offset: number
): { metadata: ProofMetadata; bytesRead: number } | null {
  if (bytes.length < offset + 10) {
    return null;
  }

  const decoder = new TextDecoder();
  let pos = offset;

  // Filename
  const filenameLen = bytes[pos++];
  if (bytes.length < pos + filenameLen) return null;
  const filename =
    filenameLen > 0 ? decoder.decode(bytes.slice(pos, pos + filenameLen)) : undefined;
  pos += filenameLen;

  // MIME type
  if (bytes.length < pos + 1) return null;
  const mimeLen = bytes[pos++];
  if (bytes.length < pos + mimeLen) return null;
  const mimeType =
    mimeLen > 0 ? decoder.decode(bytes.slice(pos, pos + mimeLen)) : undefined;
  pos += mimeLen;

  // File size
  if (bytes.length < pos + 8) return null;
  const sizeView = new DataView(bytes.buffer, bytes.byteOffset + pos);
  const fileSize = Number(sizeView.getBigUint64(0, false));
  pos += 8;

  // Description
  if (bytes.length < pos + 1) return null;
  const descLen = bytes[pos++];
  if (bytes.length < pos + descLen) return null;
  const description =
    descLen > 0 ? decoder.decode(bytes.slice(pos, pos + descLen)) : undefined;
  pos += descLen;

  return {
    metadata: {
      filename,
      mimeType,
      fileSize: fileSize > 0 ? fileSize : undefined,
      description,
    },
    bytesRead: pos - offset,
  };
}

/**
 * Encode a single proof entry (without operation byte)
 */
function encodeProofEntry(
  algorithm: HashAlgorithm,
  hash: Uint8Array,
  metadata?: ProofMetadata
): Uint8Array {
  const expectedSize = getHashSize(algorithm);
  if (hash.length !== expectedSize) {
    throw new Error(
      `Invalid hash size for ${getAlgorithmName(algorithm)}: expected ${expectedSize}, got ${hash.length}`
    );
  }

  const metadataBytes = encodeMetadata(metadata);
  const result = new Uint8Array(1 + hash.length + metadataBytes.length);

  let offset = 0;
  result[offset++] = algorithm;
  result.set(hash, offset);
  offset += hash.length;
  result.set(metadataBytes, offset);

  return result;
}

/**
 * Encode a proof payload to bytes
 */
export function encodeProofPayload(payload: AnchorProofPayload): Uint8Array {
  if (payload.operation === ProofOperation.BATCH) {
    const batchPayload = payload as BatchProofPayload;
    const entries = batchPayload.entries.map((e) =>
      encodeProofEntry(e.algorithm, e.hash, e.metadata)
    );
    const totalSize =
      2 + entries.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalSize);

    let offset = 0;
    result[offset++] = ProofOperation.BATCH;
    result[offset++] = entries.length;

    for (const entry of entries) {
      result.set(entry, offset);
      offset += entry.length;
    }

    return result;
  }

  const singlePayload = payload as ProofPayload;
  const entry = encodeProofEntry(
    singlePayload.algorithm,
    singlePayload.hash,
    singlePayload.metadata
  );
  const result = new Uint8Array(1 + entry.length);
  result[0] = singlePayload.operation;
  result.set(entry, 1);

  return result;
}

/**
 * Decode a proof payload from bytes
 */
export function decodeProofPayload(bytes: Uint8Array): AnchorProofPayload | null {
  if (bytes.length < 2) {
    return null;
  }

  const operation = bytes[0] as ProofOperation;

  if (operation === ProofOperation.BATCH) {
    const count = bytes[1];
    const entries: BatchProofPayload["entries"] = [];
    let offset = 2;

    for (let i = 0; i < count; i++) {
      if (bytes.length < offset + 1) return null;
      const algorithm = bytes[offset++] as HashAlgorithm;
      const hashSize = getHashSize(algorithm);

      if (bytes.length < offset + hashSize) return null;
      const hash = bytes.slice(offset, offset + hashSize);
      offset += hashSize;

      const metaResult = decodeMetadata(bytes, offset);
      if (!metaResult) return null;
      offset += metaResult.bytesRead;

      entries.push({
        algorithm,
        hash,
        metadata: metaResult.metadata,
      });
    }

    return {
      operation: ProofOperation.BATCH,
      entries,
    };
  }

  // Single proof (STAMP or REVOKE)
  let offset = 1;
  if (bytes.length < offset + 1) return null;
  const algorithm = bytes[offset++] as HashAlgorithm;
  const hashSize = getHashSize(algorithm);

  if (bytes.length < offset + hashSize) return null;
  const hash = bytes.slice(offset, offset + hashSize);
  offset += hashSize;

  const metaResult = decodeMetadata(bytes, offset);

  return {
    operation,
    algorithm,
    hash,
    metadata: metaResult?.metadata,
  };
}

/**
 * Create a full Anchor protocol message for Proof of Existence
 */
export function createAnchorProofMessage(
  payload: AnchorProofPayload,
  anchors: Array<{ txidPrefix: Uint8Array; vout: number }> = []
): Uint8Array {
  const body = encodeProofPayload(payload);

  // Calculate total size
  const anchorSize = anchors.length * 9; // 8 bytes prefix + 1 byte vout
  const totalSize = 4 + 1 + 1 + anchorSize + body.length;
  const message = new Uint8Array(totalSize);

  let offset = 0;

  // Magic bytes
  message.set(ANCHOR_MAGIC, offset);
  offset += 4;

  // Kind (Proof = 11)
  message[offset++] = ANCHOR_KIND_PROOF;

  // Anchor count
  message[offset++] = anchors.length;

  // Anchors
  for (const anchor of anchors) {
    message.set(anchor.txidPrefix, offset);
    offset += 8;
    message[offset++] = anchor.vout;
  }

  // Body
  message.set(body, offset);

  return message;
}

/**
 * Convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Validate a file hash format
 */
export function isValidHash(hash: string, algorithm: HashAlgorithm): boolean {
  const expectedLen = getHashSize(algorithm) * 2; // hex chars
  return new RegExp(`^[a-f0-9]{${expectedLen}}$`, "i").test(hash);
}

/**
 * Check if a string is a valid txid prefix (16 hex chars)
 */
export function isTxidPrefix(value: string): boolean {
  return /^[a-f0-9]{16}$/i.test(value);
}

/**
 * Calculate payload size for a proof
 */
export function calculatePayloadSize(payload: AnchorProofPayload): number {
  return encodeProofPayload(payload).length;
}

/**
 * Check if payload fits in OP_RETURN (80 bytes max)
 */
export function fitsInOpReturn(payload: AnchorProofPayload): boolean {
  // Protocol overhead: 4 (magic) + 1 (kind) + 1 (anchor_count) = 6 bytes
  const payloadSize = calculatePayloadSize(payload);
  return payloadSize + 6 <= 80;
}

/**
 * Estimate fee for proof transaction
 */
export function estimateFee(payload: AnchorProofPayload, feeRate = 1): number {
  const baseTxSize = 150; // vbytes
  const payloadSize = calculatePayloadSize(payload);
  const opReturnOverhead = 10;
  const totalSize = baseTxSize + opReturnOverhead + payloadSize;
  return totalSize * feeRate;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Get MIME type category
 */
export function getMimeCategory(mimeType?: string): string {
  if (!mimeType) return "unknown";
  const [category] = mimeType.split("/");
  return category || "unknown";
}
