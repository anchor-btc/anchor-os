/**
 * AnchorProofs API client
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3012";

// Types
export interface ProofStats {
  total_proofs: number;
  active_proofs: number;
  revoked_proofs: number;
  sha256_proofs: number;
  sha512_proofs: number;
  total_transactions: number;
  last_block_height: number | null;
  last_update: string | null;
  total_file_size: number;
}

export interface Proof {
  id: number;
  hash_algo: number;
  hash_algo_name: string;
  file_hash: string;
  filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  description: string | null;
  txid: string;
  txid_prefix: string;
  vout: number;
  block_height: number | null;
  is_revoked: boolean;
  revoked_txid: string | null;
  created_at: string;
}

export interface ProofListItem {
  id: number;
  hash_algo: number;
  hash_algo_name: string;
  file_hash: string;
  filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  txid: string;
  txid_prefix: string;
  block_height: number | null;
  is_revoked: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ValidationResult {
  is_valid: boolean;
  proof: Proof | null;
}

export interface CreateTxResponse {
  txid: string;
  vout: number;
  hex: string;
  carrier: number;
  carrier_name: string;
}

export interface StampRequest {
  hash_algo: string;
  file_hash: string;
  filename?: string;
  mime_type?: string;
  file_size?: number;
  description?: string;
  carrier?: number;
}

export interface BatchStampRequest {
  entries: StampRequest[];
  carrier?: number;
}

// API functions

/**
 * Get protocol statistics
 */
export async function getStats(): Promise<ProofStats> {
  const response = await fetch(`${API_BASE}/api/stats`);
  if (!response.ok) {
    throw new Error("Failed to fetch stats");
  }
  return response.json();
}

/**
 * List proofs with pagination
 */
export async function listProofs(
  page = 1,
  perPage = 50,
  search?: string,
  includeRevoked = false
): Promise<PaginatedResponse<ProofListItem>> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
    include_revoked: includeRevoked.toString(),
  });
  if (search) {
    params.set("search", search);
  }

  const response = await fetch(`${API_BASE}/api/proofs?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch proofs");
  }
  return response.json();
}

/**
 * Get proof by file hash
 */
export async function getProofByHash(
  hash: string,
  algo?: string
): Promise<Proof> {
  const params = algo ? `?algo=${algo}` : "";
  const response = await fetch(`${API_BASE}/api/proof/${hash}${params}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Proof not found");
    }
    throw new Error("Failed to fetch proof");
  }
  return response.json();
}

/**
 * Get proof by ID
 */
export async function getProofById(id: number): Promise<Proof> {
  const response = await fetch(`${API_BASE}/api/proof/id/${id}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Proof not found");
    }
    throw new Error("Failed to fetch proof");
  }
  return response.json();
}

/**
 * Validate a file hash
 */
export async function validateHash(
  fileHash: string,
  hashAlgo: string
): Promise<ValidationResult> {
  const response = await fetch(`${API_BASE}/api/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_hash: fileHash,
      hash_algo: hashAlgo,
    }),
  });
  if (!response.ok) {
    throw new Error("Failed to validate hash");
  }
  return response.json();
}

/**
 * Create a proof of existence
 */
export async function stampProof(req: StampRequest): Promise<CreateTxResponse> {
  const response = await fetch(`${API_BASE}/api/stamp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to create proof");
  }
  return response.json();
}

/**
 * Create batch proofs
 */
export async function stampBatch(
  req: BatchStampRequest
): Promise<CreateTxResponse> {
  const response = await fetch(`${API_BASE}/api/stamp/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to create batch proof");
  }
  return response.json();
}

/**
 * Revoke a proof
 */
export async function revokeProof(
  fileHash: string,
  hashAlgo: string
): Promise<CreateTxResponse> {
  const response = await fetch(`${API_BASE}/api/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_hash: fileHash,
      hash_algo: hashAlgo,
    }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to revoke proof");
  }
  return response.json();
}

/**
 * Mine blocks (for testing)
 */
export async function mineBlocks(count = 1): Promise<void> {
  const walletUrl = process.env.NEXT_PUBLIC_WALLET_URL || "http://localhost:3001";
  await fetch(`${walletUrl}/api/mine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks: count }),
  });
}

// My Proofs types and functions

export interface MyProofsResponse {
  proofs: ProofListItem[];
  total_proofs: number;
  unique_transactions: number;
  page: number;
  per_page: number;
}

/**
 * Fetch proofs created by the connected wallet
 */
export async function getMyProofs(perPage = 100): Promise<MyProofsResponse> {
  const response = await fetch(`${API_BASE}/api/proofs/my?per_page=${perPage}`);
  if (!response.ok) {
    throw new Error("Failed to fetch my proofs");
  }
  return response.json();
}
