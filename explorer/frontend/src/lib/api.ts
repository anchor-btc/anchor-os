const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
const WALLET_URL = process.env.NEXT_PUBLIC_WALLET_URL || "http://localhost:3001";

// Types
export interface Message {
  id: number;
  txid: string;
  vout: number;
  block_height: number | null;
  kind: number;
  kind_name: string;
  body_hex: string;
  body_text: string | null;
  anchors: Anchor[];
  reply_count: number;
  created_at: string;
}

export interface Anchor {
  index: number;
  txid_prefix: string;
  vout: number;
  resolved_txid: string | null;
  is_ambiguous: boolean;
  is_orphan: boolean;
}

export interface Stats {
  total_messages: number;
  total_roots: number;
  total_replies: number;
  total_anchors: number;
  resolved_anchors: number;
  orphan_anchors: number;
  ambiguous_anchors: number;
  last_block_height: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ThreadNode {
  message: Message;
  replies: ThreadNode[];
}

export interface Thread {
  root: Message;
  replies: ThreadNode[];
  total_messages: number;
}

export interface WalletBalance {
  confirmed: number;
  unconfirmed: number;
  total: number;
}

export interface CreateMessageRequest {
  kind?: number;
  body: string;
  body_is_hex?: boolean;
  parent_txid?: string;
  parent_vout?: number;
}

export interface CreateMessageResponse {
  txid: string;
  vout: number;
  hex: string;
}

// API Functions
export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_URL}/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function fetchMessages(
  page = 1,
  perPage = 20
): Promise<PaginatedResponse<Message>> {
  const res = await fetch(`${API_URL}/messages?page=${page}&per_page=${perPage}`);
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

export async function fetchRoots(
  page = 1,
  perPage = 20
): Promise<PaginatedResponse<Message>> {
  const res = await fetch(`${API_URL}/roots?page=${page}&per_page=${perPage}`);
  if (!res.ok) throw new Error("Failed to fetch roots");
  return res.json();
}

export interface FilterOptions {
  txid?: string;
  block_height?: number;
  block_min?: number;
  block_max?: number;
  kind?: number;
  text?: string;
  from_date?: string;
  to_date?: string;
  min_size?: number;
  max_size?: number;
  min_replies?: number;
  sort?: "newest" | "oldest" | "replies" | "size";
}

export async function fetchRootsFiltered(
  page = 1,
  perPage = 20,
  filters: FilterOptions = {}
): Promise<PaginatedResponse<Message>> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });

  // Add filter parameters
  if (filters.txid) params.set("txid", filters.txid);
  if (filters.block_height !== undefined) params.set("block_height", filters.block_height.toString());
  if (filters.block_min !== undefined) params.set("block_min", filters.block_min.toString());
  if (filters.block_max !== undefined) params.set("block_max", filters.block_max.toString());
  if (filters.kind !== undefined) params.set("kind", filters.kind.toString());
  if (filters.text) params.set("text", filters.text);
  if (filters.from_date) params.set("from_date", filters.from_date);
  if (filters.to_date) params.set("to_date", filters.to_date);
  if (filters.min_size !== undefined) params.set("min_size", filters.min_size.toString());
  if (filters.max_size !== undefined) params.set("max_size", filters.max_size.toString());
  if (filters.min_replies !== undefined) params.set("min_replies", filters.min_replies.toString());
  if (filters.sort) params.set("sort", filters.sort);

  const res = await fetch(`${API_URL}/roots/filter?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch filtered roots");
  return res.json();
}

export interface PopularThread extends Message {
  total_thread_messages: number;
}

export async function fetchPopularThreads(limit = 5): Promise<PopularThread[]> {
  const res = await fetch(`${API_URL}/popular?per_page=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch popular threads");
  return res.json();
}

export async function fetchMessage(txid: string, vout: number): Promise<Message> {
  const res = await fetch(`${API_URL}/messages/${txid}/${vout}`);
  if (!res.ok) throw new Error("Failed to fetch message");
  return res.json();
}

export async function fetchThread(txid: string, vout: number): Promise<Thread> {
  const res = await fetch(`${API_URL}/threads/${txid}/${vout}`);
  if (!res.ok) throw new Error("Failed to fetch thread");
  return res.json();
}

export async function fetchReplies(txid: string, vout: number): Promise<Message[]> {
  const res = await fetch(`${API_URL}/replies/${txid}/${vout}`);
  if (!res.ok) throw new Error("Failed to fetch replies");
  return res.json();
}

// Wallet API
export async function fetchWalletBalance(): Promise<WalletBalance> {
  const res = await fetch(`${WALLET_URL}/wallet/balance`);
  if (!res.ok) throw new Error("Failed to fetch balance");
  return res.json();
}

export async function fetchNewAddress(): Promise<{ address: string }> {
  const res = await fetch(`${WALLET_URL}/wallet/address`);
  if (!res.ok) throw new Error("Failed to get address");
  return res.json();
}

export async function createMessage(
  req: CreateMessageRequest
): Promise<CreateMessageResponse> {
  const res = await fetch(`${WALLET_URL}/wallet/create-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to create message");
  }
  return res.json();
}

export async function mineBlocks(count = 1): Promise<{ blocks: string[] }> {
  const res = await fetch(`${WALLET_URL}/wallet/mine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count }),
  });
  if (!res.ok) throw new Error("Failed to mine blocks");
  return res.json();
}

// Utilities
export function truncateTxid(txid: string, chars = 8): string {
  if (txid.length <= chars * 2) return txid;
  return `${txid.slice(0, chars)}...${txid.slice(-chars)}`;
}

export function formatBlockHeight(height: number | null): string {
  if (height === null) return "Unconfirmed";
  return `Block #${height.toLocaleString()}`;
}

// Image detection constants (kind 4 = Image)
export const MESSAGE_KIND_IMAGE = 4;

// Known image magic bytes (hex prefixes)
const IMAGE_MAGIC_BYTES: Record<string, string> = {
  "89504e47": "image/png",      // PNG
  "ffd8ff": "image/jpeg",        // JPEG
  "47494638": "image/gif",       // GIF
  "52494646": "image/webp",      // WebP (RIFF header)
};

/**
 * Detect image MIME type from hex-encoded body
 */
export function detectImageMimeType(hexBody: string): string | null {
  const lowerHex = hexBody.toLowerCase();
  for (const [magic, mime] of Object.entries(IMAGE_MAGIC_BYTES)) {
    if (lowerHex.startsWith(magic)) {
      return mime;
    }
  }
  return null;
}

/**
 * Check if a message is an image (by kind or by content)
 */
export function isImageMessage(message: Message): boolean {
  // Check kind first
  if (message.kind === MESSAGE_KIND_IMAGE) {
    return true;
  }
  // Also check magic bytes as fallback
  return detectImageMimeType(message.body_hex) !== null;
}

/**
 * Convert hex-encoded image data to a data URL for display
 */
export function hexToImageDataUrl(hexBody: string): string | null {
  const mimeType = detectImageMimeType(hexBody);
  if (!mimeType) return null;

  // Convert hex to base64
  try {
    const bytes = new Uint8Array(
      hexBody.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );
    const base64 = btoa(String.fromCharCode(...bytes));
    return `data:${mimeType};base64,${base64}`;
  } catch {
    return null;
  }
}

