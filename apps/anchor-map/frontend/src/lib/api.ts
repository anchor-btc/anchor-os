/**
 * AnchorMap API Client
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3004";
const WALLET_URL = process.env.NEXT_PUBLIC_WALLET_URL || "http://localhost:3001";

// Types
export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
}

export interface Marker {
  id: number;
  txid: string;
  vout: number;
  category: Category;
  latitude: number;
  longitude: number;
  message: string;
  block_height: number | null;
  reply_count: number;
  created_at: string;
}

export interface MarkerReply {
  id: number;
  txid: string;
  vout: number;
  message: string;
  block_height: number | null;
  created_at: string;
}

export interface MarkerDetail {
  marker: Marker;
  replies: MarkerReply[];
}

export interface MapStats {
  total_markers: number;
  total_transactions: number;
  total_replies: number;
  last_block_height: number | null;
  last_update: string | null;
}

export interface BoundsParams {
  lat_min: number;
  lat_max: number;
  lng_min: number;
  lng_max: number;
  category?: number;
  limit?: number;
}

export interface CreateMarkerRequest {
  category: number;
  latitude: number;
  longitude: number;
  message: string;
  carrier?: number;
}

export interface CreateMarkerResponse {
  txid: string;
  vout: number;
  hex: string;
  carrier: number;
  carrier_name: string;
}

// Carrier types
export interface CarrierType {
  id: number;
  name: string;
  description: string;
  icon: string;
  maxSize: number;
}

export const CARRIERS: CarrierType[] = [
  { id: 0, name: "OP_RETURN", description: "Standard, low cost", icon: "zap", maxSize: 80 },
  { id: 1, name: "Inscription", description: "Ordinal inscription", icon: "gem", maxSize: 400000 },
  { id: 2, name: "Stamps", description: "Bitcoin Stamps", icon: "stamp", maxSize: 10000 },
];

export interface WalletBalance {
  confirmed: number;
  unconfirmed: number;
  total: number;
}

// Category definitions (matching backend)
export const CATEGORIES: Category[] = [
  { id: 0, name: "General", icon: "map-pin", color: "#FF6B35" },
  { id: 1, name: "Tourism", icon: "camera", color: "#3B82F6" },
  { id: 2, name: "Commerce", icon: "shopping-bag", color: "#10B981" },
  { id: 3, name: "Event", icon: "calendar", color: "#8B5CF6" },
  { id: 4, name: "Warning", icon: "alert-triangle", color: "#EF4444" },
  { id: 5, name: "Historic", icon: "landmark", color: "#F59E0B" },
];

// API Functions
export async function fetchStats(): Promise<MapStats> {
  const res = await fetch(`${API_URL}/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/categories`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export async function fetchMarkers(limit = 100): Promise<Marker[]> {
  const res = await fetch(`${API_URL}/markers?per_page=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch markers");
  return res.json();
}

export async function fetchMarkersInBounds(params: BoundsParams): Promise<Marker[]> {
  const query = new URLSearchParams({
    lat_min: params.lat_min.toString(),
    lat_max: params.lat_max.toString(),
    lng_min: params.lng_min.toString(),
    lng_max: params.lng_max.toString(),
  });
  
  if (params.category !== undefined) {
    query.set("category", params.category.toString());
  }
  if (params.limit !== undefined) {
    query.set("limit", params.limit.toString());
  }

  const res = await fetch(`${API_URL}/markers/bounds?${query}`);
  if (!res.ok) throw new Error("Failed to fetch markers in bounds");
  return res.json();
}

export async function searchMarkers(
  q: string,
  category?: number,
  limit = 100
): Promise<Marker[]> {
  const query = new URLSearchParams({ q });
  if (category !== undefined) {
    query.set("category", category.toString());
  }
  query.set("limit", limit.toString());

  const res = await fetch(`${API_URL}/markers/search?${query}`);
  if (!res.ok) throw new Error("Failed to search markers");
  return res.json();
}

export async function fetchMarkerDetail(
  txid: string,
  vout: number
): Promise<MarkerDetail> {
  const res = await fetch(`${API_URL}/markers/${txid}/${vout}`);
  if (!res.ok) throw new Error("Failed to fetch marker detail");
  return res.json();
}

export async function createMarker(
  request: CreateMarkerRequest
): Promise<CreateMarkerResponse> {
  const res = await fetch(`${API_URL}/markers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to create marker");
  }

  return res.json();
}

export async function createReply(
  parentTxid: string,
  parentVout: number,
  message: string
): Promise<CreateMarkerResponse> {
  const res = await fetch(`${API_URL}/markers/${parentTxid}/${parentVout}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to create reply");
  }

  return res.json();
}

// Wallet API
export async function fetchWalletBalance(): Promise<WalletBalance> {
  const res = await fetch(`${WALLET_URL}/wallet/balance`);
  if (!res.ok) throw new Error("Failed to fetch balance");
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

export function getCategoryById(id: number): Category {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return n.toString();
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

