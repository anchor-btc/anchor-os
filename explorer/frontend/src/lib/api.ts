const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
const WALLET_URL = process.env.NEXT_PUBLIC_WALLET_URL || "http://localhost:3001";
export const BTC_EXPLORER_URL = process.env.NEXT_PUBLIC_BTC_EXPLORER_URL || "http://localhost:3003";

// Carrier types enum
export enum CarrierType {
  OpReturn = 0,
  Inscription = 1,
  Stamps = 2,
  TaprootAnnex = 3,
  WitnessData = 4,
}

// Carrier name lookup
export const CARRIER_NAMES: Record<number, string> = {
  0: "op_return",
  1: "inscription",
  2: "stamps",
  3: "taproot_annex",
  4: "witness_data",
};

// Carrier display info with detailed descriptions
export const CARRIER_INFO: Record<
  number,
  {
    name: string;
    label: string;
    color: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    icon: string;
    description: string;
    properties: { label: string; value: string }[];
  }
> = {
  0: {
    name: "op_return",
    label: "OP_RETURN",
    color: "bg-blue-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
    icon: "📤",
    description: "Standard Bitcoin data output. Prunable by nodes, low cost, up to 80 bytes (100KB in Bitcoin Core v30+).",
    properties: [
      { label: "Max Size", value: "80 bytes (legacy) / 100KB (v30+)" },
      { label: "Prunable", value: "Yes" },
      { label: "UTXO Impact", value: "None (unspendable)" },
      { label: "Fee Discount", value: "No" },
    ],
  },
  1: {
    name: "inscription",
    label: "Inscription",
    color: "bg-orange-500",
    bgColor: "bg-orange-50",
    textColor: "text-orange-700",
    borderColor: "border-orange-200",
    icon: "🖼️",
    description: "Ordinals-style inscription using Taproot witness data with OP_FALSE OP_IF envelope.",
    properties: [
      { label: "Max Size", value: "~4MB (witness limit)" },
      { label: "Prunable", value: "Yes (witness data)" },
      { label: "UTXO Impact", value: "Minimal" },
      { label: "Fee Discount", value: "Yes (75% witness discount)" },
    ],
  },
  2: {
    name: "stamps",
    label: "Stamps",
    color: "bg-green-500",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-200",
    icon: "📍",
    description: "Permanent storage using bare multisig outputs. Data is embedded in public keys and cannot be pruned.",
    properties: [
      { label: "Max Size", value: "~520 bytes per output" },
      { label: "Prunable", value: "No (permanent)" },
      { label: "UTXO Impact", value: "High (creates UTXOs)" },
      { label: "Fee Discount", value: "No" },
    ],
  },
  3: {
    name: "taproot_annex",
    label: "Taproot Annex",
    color: "bg-purple-500",
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
    borderColor: "border-purple-200",
    icon: "🔗",
    description: "Reserved field in Taproot witness stack. Currently not relayed by most nodes.",
    properties: [
      { label: "Max Size", value: "~4MB (witness limit)" },
      { label: "Prunable", value: "Yes (witness data)" },
      { label: "UTXO Impact", value: "None" },
      { label: "Fee Discount", value: "Yes (75% witness discount)" },
    ],
  },
  4: {
    name: "witness_data",
    label: "Witness Data",
    color: "bg-cyan-500",
    bgColor: "bg-cyan-50",
    textColor: "text-cyan-700",
    borderColor: "border-cyan-200",
    icon: "👁️",
    description: "Raw witness data in SegWit transactions. Benefits from witness discount.",
    properties: [
      { label: "Max Size", value: "~4MB (witness limit)" },
      { label: "Prunable", value: "Yes (witness data)" },
      { label: "UTXO Impact", value: "None" },
      { label: "Fee Discount", value: "Yes (75% witness discount)" },
    ],
  },
};

// Types
export interface Message {
  id: number;
  txid: string;
  vout: number;
  block_height: number | null;
  kind: number;
  kind_name: string;
  carrier: number;
  carrier_name: string;
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

export interface CarrierStats {
  op_return: number;
  inscription: number;
  stamps: number;
  taproot_annex: number;
  witness_data: number;
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
  carriers: CarrierStats;
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
  carrier?: number;
}

// Carrier options for compose form
export const CARRIER_OPTIONS = [
  { value: 0, label: "OP_RETURN", icon: "📤", description: "Standard, prunable, 80 bytes" },
  { value: 1, label: "Inscription", icon: "🖼️", description: "Ordinals-style, ~4MB, witness discount" },
  { value: 2, label: "Stamps", icon: "📍", description: "Permanent, unprunable, ~520 bytes" },
  { value: 3, label: "Taproot Annex", icon: "🔗", description: "Witness annex, needs libre relay" },
  { value: 4, label: "Witness Data", icon: "📦", description: "Tapscript witness, ~4MB, prunable" },
] as const;

export interface CreateMessageResponse {
  txid: string;
  vout: number;
  hex: string;
  carrier: number;
  carrier_name: string;
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
  carrier?: number;
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
  if (filters.carrier !== undefined) params.set("carrier", filters.carrier.toString());
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

