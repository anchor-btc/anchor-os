/**
 * Client-side file hashing utilities
 *
 * Uses the Web Crypto API for secure hashing of files in the browser.
 * Supports SHA-256 and SHA-512 algorithms.
 */

import { HashAlgorithm, bytesToHex } from './proof-encoder';

/**
 * Hash result interface
 */
export interface HashResult {
  algorithm: HashAlgorithm;
  hash: Uint8Array;
  hex: string;
}

/**
 * Progress callback type
 */
export type HashProgressCallback = (progress: number) => void;

/**
 * Hash a file using the specified algorithm
 */
export async function hashFile(
  file: File,
  algorithm: HashAlgorithm = HashAlgorithm.SHA256,
  onProgress?: HashProgressCallback
): Promise<HashResult> {
  const algoName = algorithm === HashAlgorithm.SHA256 ? 'SHA-256' : 'SHA-512';

  // For small files, hash directly
  if (file.size <= 10 * 1024 * 1024) {
    // 10MB
    const buffer = await file.arrayBuffer();
    if (onProgress) onProgress(50);

    const hashBuffer = await crypto.subtle.digest(algoName, buffer);
    if (onProgress) onProgress(100);

    const hash = new Uint8Array(hashBuffer);
    return {
      algorithm,
      hash,
      hex: bytesToHex(hash),
    };
  }

  // For large files, use chunked reading
  return hashFileChunked(file, algorithm, onProgress);
}

/**
 * Hash a large file in chunks to avoid memory issues
 */
async function hashFileChunked(
  file: File,
  algorithm: HashAlgorithm,
  onProgress?: HashProgressCallback
): Promise<HashResult> {
  const CHUNK_SIZE = 64 * 1024 * 1024; // 64MB chunks
  const algoName = algorithm === HashAlgorithm.SHA256 ? 'SHA-256' : 'SHA-512';

  // Unfortunately, Web Crypto API doesn't support streaming hashes natively
  // We need to read the entire file, but we can do it in chunks to show progress
  const chunks: Uint8Array[] = [];
  let offset = 0;
  const totalSize = file.size;

  while (offset < totalSize) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const buffer = await chunk.arrayBuffer();
    chunks.push(new Uint8Array(buffer));

    offset += CHUNK_SIZE;
    if (onProgress) {
      onProgress(Math.min(90, (offset / totalSize) * 90));
    }
  }

  // Combine all chunks
  const totalLength = chunks.reduce((sum, arr) => sum + arr.length, 0);
  const combined = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    combined.set(chunk, pos);
    pos += chunk.length;
  }

  // Hash the combined data
  const hashBuffer = await crypto.subtle.digest(algoName, combined);
  if (onProgress) onProgress(100);

  const hash = new Uint8Array(hashBuffer);
  return {
    algorithm,
    hash,
    hex: bytesToHex(hash),
  };
}

/**
 * Hash a Uint8Array directly
 */
export async function hashBytes(
  data: Uint8Array,
  algorithm: HashAlgorithm = HashAlgorithm.SHA256
): Promise<HashResult> {
  const algoName = algorithm === HashAlgorithm.SHA256 ? 'SHA-256' : 'SHA-512';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hashBuffer = await crypto.subtle.digest(algoName, data as any);
  const hash = new Uint8Array(hashBuffer);

  return {
    algorithm,
    hash,
    hex: bytesToHex(hash),
  };
}

/**
 * Hash a string (UTF-8 encoded)
 */
export async function hashString(
  text: string,
  algorithm: HashAlgorithm = HashAlgorithm.SHA256
): Promise<HashResult> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  return hashBytes(data, algorithm);
}

/**
 * Generate both SHA-256 and SHA-512 hashes for a file
 */
export async function hashFileBoth(
  file: File,
  onProgress?: HashProgressCallback
): Promise<{ sha256: HashResult; sha512: HashResult }> {
  // Read file once
  const buffer = await file.arrayBuffer();
  if (onProgress) onProgress(30);

  const [sha256Buffer, sha512Buffer] = await Promise.all([
    crypto.subtle.digest('SHA-256', buffer),
    crypto.subtle.digest('SHA-512', buffer),
  ]);
  if (onProgress) onProgress(100);

  const sha256Hash = new Uint8Array(sha256Buffer);
  const sha512Hash = new Uint8Array(sha512Buffer);

  return {
    sha256: {
      algorithm: HashAlgorithm.SHA256,
      hash: sha256Hash,
      hex: bytesToHex(sha256Hash),
    },
    sha512: {
      algorithm: HashAlgorithm.SHA512,
      hash: sha512Hash,
      hex: bytesToHex(sha512Hash),
    },
  };
}

/**
 * Verify a file matches a given hash
 */
export async function verifyFileHash(
  file: File,
  expectedHash: string,
  algorithm: HashAlgorithm
): Promise<boolean> {
  const result = await hashFile(file, algorithm);
  return result.hex.toLowerCase() === expectedHash.toLowerCase();
}

/**
 * Get file metadata
 */
export function getFileMetadata(file: File): {
  filename: string;
  mimeType: string;
  fileSize: number;
} {
  return {
    filename: file.name,
    mimeType: file.type || 'application/octet-stream',
    fileSize: file.size,
  };
}

/**
 * Check if Web Crypto API is available
 */
export function isCryptoAvailable(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.subtle.digest === 'function'
  );
}

/**
 * Truncate hash for display
 */
export function truncateHash(hash: string, chars = 8): string {
  if (hash.length <= chars * 2 + 3) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
