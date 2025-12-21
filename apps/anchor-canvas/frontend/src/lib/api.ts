/**
 * AnchorCanvas API Client
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3003";
const WALLET_URL = process.env.NEXT_PUBLIC_WALLET_URL || "http://localhost:3001";

// Canvas dimensions
export const CANVAS_WIDTH = 4580;
export const CANVAS_HEIGHT = 4580;

// Types
export interface Pixel {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
}

export interface PixelState {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  last_txid: string;
  last_vout: number;
  last_block_height: number | null;
  updated_at: string;
}

export interface PixelHistoryEntry {
  r: number;
  g: number;
  b: number;
  txid: string;
  vout: number;
  block_height: number | null;
  created_at: string;
}

export interface PixelInfo {
  x: number;
  y: number;
  current: PixelState | null;
  history: PixelHistoryEntry[];
}

export interface CanvasStats {
  total_pixels_painted: number;
  total_transactions: number;
  last_block_height: number | null;
  last_update: string | null;
  canvas_width: number;
  canvas_height: number;
  total_pixels: number;
}

export interface RecentPixel {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  txid: string;
  block_height: number | null;
  updated_at: string;
}

export interface UserPixel {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  txid: string;
  vout: number;
  block_height: number | null;
  created_at: string;
}

export interface MyPixelsResponse {
  pixels: UserPixel[];
  total_pixels: number;
  unique_transactions: number;
}

export interface MyPixelsByAddressResponse {
  pixels: UserPixel[];
  total_pixels: number;
  unique_transactions: number;
  unique_positions: number;
  page: number;
  per_page: number;
}

export interface WalletAddressResponse {
  address: string;
}

export interface WalletAddressesResponse {
  addresses: string[];
}

export interface WalletUtxo {
  txid: string;
  vout: number;
  amount: number;
  confirmations: number;
}

export interface WalletBalance {
  confirmed: number;
  unconfirmed: number;
  total: number;
}

export interface CreatePixelRequest {
  pixels: Array<{ x: number; y: number; r: number; g: number; b: number }>;
}

export interface CreatePixelResponse {
  txid: string;
  vout: number;
  hex: string;
  carrier: number;
  carrier_name: string;
}

// Carrier types
export type CarrierType = "op_return" | "witness_data" | "inscription";

export const CARRIER_INFO: Record<CarrierType, { 
  id: number; 
  name: string; 
  maxBytes: number; 
  description: string;
  feeMultiplier: number;
}> = {
  op_return: {
    id: 0,
    name: "OP_RETURN",
    maxBytes: 100000, // Bitcoin Core v30+ supports 100KB
    description: "Standard, ~14K pixels max",
    feeMultiplier: 1,
  },
  witness_data: {
    id: 4,
    name: "Witness Data",
    maxBytes: 520000, // ~520KB practical limit
    description: "Large capacity, 75% fee discount",
    feeMultiplier: 0.25,
  },
  inscription: {
    id: 1,
    name: "Inscription",
    maxBytes: 3900000, // ~3.9MB (almost full block with witness discount)
    description: "Ordinals-style, ~557K pixels max",
    feeMultiplier: 0.25,
  },
};

// API Functions
export async function fetchStats(): Promise<CanvasStats> {
  const res = await fetch(`${API_URL}/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function fetchPixelInfo(x: number, y: number): Promise<PixelInfo> {
  const res = await fetch(`${API_URL}/pixel/${x}/${y}`);
  if (!res.ok) throw new Error("Failed to fetch pixel info");
  return res.json();
}

export async function fetchRecentPixels(limit = 100): Promise<RecentPixel[]> {
  const res = await fetch(`${API_URL}/recent?per_page=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch recent pixels");
  return res.json();
}

export async function fetchCanvasPreview(): Promise<string> {
  return `${API_URL}/canvas/preview`;
}

export async function fetchTileUrl(z: number, x: number, y: number): Promise<string> {
  return `${API_URL}/canvas/tile/${z}/${x}/${y}`;
}

export async function fetchRegionUrl(
  x: number,
  y: number,
  w: number,
  h: number
): Promise<string> {
  return `${API_URL}/canvas/region?x=${x}&y=${y}&w=${w}&h=${h}`;
}

/**
 * Fetch canvas binary data
 * Format: [width: u32][height: u32][pixels: (x: u16, y: u16, r: u8, g: u8, b: u8)...]
 */
export async function fetchCanvasData(): Promise<Map<string, Pixel>> {
  const res = await fetch(`${API_URL}/canvas`);
  if (!res.ok) throw new Error("Failed to fetch canvas data");

  const buffer = await res.arrayBuffer();
  const view = new DataView(buffer);
  const pixels = new Map<string, Pixel>();

  // Skip width and height (8 bytes)
  let offset = 8;

  while (offset + 7 <= buffer.byteLength) {
    const x = view.getUint16(offset, false);
    const y = view.getUint16(offset + 2, false);
    const r = view.getUint8(offset + 4);
    const g = view.getUint8(offset + 5);
    const b = view.getUint8(offset + 6);

    pixels.set(`${x},${y}`, { x, y, r, g, b });
    offset += 7;
  }

  return pixels;
}

// Wallet API
export async function fetchWalletBalance(): Promise<WalletBalance> {
  const res = await fetch(`${WALLET_URL}/wallet/balance`);
  if (!res.ok) throw new Error("Failed to fetch balance");
  return res.json();
}

/**
 * Calculate payload size in bytes for given pixels
 */
export function calculatePayloadSize(pixelCount: number): number {
  return 4 + pixelCount * 7; // 4 bytes header + 7 bytes per pixel
}

/**
 * Get recommended carrier based on payload size
 * Bitcoin Core v30+ supports 100KB OP_RETURN
 */
export function getRecommendedCarrier(pixelCount: number): CarrierType {
  const payloadSize = calculatePayloadSize(pixelCount);
  // With 100KB OP_RETURN limit, can fit ~14K pixels
  if (payloadSize <= 99000) return "op_return";
  return "inscription"; // Default to inscription for larger payloads
}

/**
 * Check if carrier can handle the payload
 */
export function canCarrierHandle(carrier: CarrierType, pixelCount: number): boolean {
  const payloadSize = calculatePayloadSize(pixelCount);
  return payloadSize <= CARRIER_INFO[carrier].maxBytes;
}

/**
 * Estimate transaction size in vbytes
 */
export function estimateTxSize(pixelCount: number, carrier: CarrierType): number {
  const payloadSize = calculatePayloadSize(pixelCount);
  const baseSize = 150; // Base tx overhead
  
  switch (carrier) {
    case "op_return":
      return baseSize + payloadSize + 10; // OP_RETURN overhead
    case "witness_data":
      return baseSize + Math.ceil(payloadSize * 0.25) + 50; // Witness discount
    case "inscription":
      return baseSize + Math.ceil(payloadSize * 0.25) + 100; // Inscription overhead
    default:
      return baseSize + payloadSize;
  }
}

export async function createPixelTransaction(
  pixels: Pixel[],
  carrierType?: CarrierType,
  feeRate: number = 1 // Default 1 sat/vbyte
): Promise<CreatePixelResponse> {
  const encodedBody = encodePixelsToHex(pixels);
  const payloadSize = encodedBody.length / 2;
  
  // Auto-select carrier if not specified
  const selectedCarrier = carrierType || getRecommendedCarrier(pixels.length);
  const carrierId = CARRIER_INFO[selectedCarrier].id;
  
  // Validate payload size for OP_RETURN (Bitcoin Core v30+ supports 100KB)
  if (selectedCarrier === "op_return" && payloadSize > 99900) {
    throw new Error(`Payload too large for OP_RETURN (${payloadSize} bytes). Use Witness Data or Inscription.`);
  }
  
  const res = await fetch(`${WALLET_URL}/wallet/create-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: 2, // State type for pixels
      body: encodedBody,
      body_is_hex: true,
      carrier: carrierId,
      fee_rate: feeRate, // Pass fee rate to wallet
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to create pixel transaction");
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

/**
 * Encode pixels to hex string for Anchor payload
 * Format: [num_pixels: u32][pixels...]
 * Each pixel: [x: u16][y: u16][r: u8][g: u8][b: u8]
 */
function encodePixelsToHex(pixels: Pixel[]): string {
  const buffer = new ArrayBuffer(4 + pixels.length * 7);
  const view = new DataView(buffer);

  // Number of pixels (big-endian u32)
  view.setUint32(0, pixels.length, false);

  // Encode each pixel
  let offset = 4;
  for (const pixel of pixels) {
    view.setUint16(offset, pixel.x, false);
    view.setUint16(offset + 2, pixel.y, false);
    view.setUint8(offset + 4, pixel.r);
    view.setUint8(offset + 5, pixel.g);
    view.setUint8(offset + 6, pixel.b);
    offset += 7;
  }

  // Convert to hex
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Utilities
export function truncateTxid(txid: string, chars = 8): string {
  if (txid.length <= chars * 2) return txid;
  return `${txid.slice(0, chars)}...${txid.slice(-chars)}`;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
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

// My Pixels API

/**
 * Fetch a new wallet address (generates a new one)
 */
export async function fetchWalletAddress(): Promise<string> {
  const res = await fetch(`${WALLET_URL}/wallet/address`);
  if (!res.ok) throw new Error("Failed to fetch wallet address");
  const data: WalletAddressResponse = await res.json();
  return data.address;
}

/**
 * Fetch all wallet addresses (from UTXOs)
 */
export async function fetchWalletAddresses(): Promise<string[]> {
  const res = await fetch(`${WALLET_URL}/wallet/addresses`);
  if (!res.ok) throw new Error("Failed to fetch wallet addresses");
  const data: WalletAddressesResponse = await res.json();
  return data.addresses;
}

/**
 * Fetch pixels painted by the connected wallet (server-side address lookup)
 * Note: Returns most recent pixels first, limited to per_page
 */
export async function fetchMyPixels(perPage: number = 1000): Promise<MyPixelsByAddressResponse> {
  const res = await fetch(`${API_URL}/pixels/my?per_page=${perPage}`);
  if (!res.ok) throw new Error("Failed to fetch my pixels");
  return res.json();
}

/**
 * Fetch wallet UTXOs (to get txids for my pixels)
 */
export async function fetchWalletUtxos(): Promise<WalletUtxo[]> {
  const res = await fetch(`${WALLET_URL}/wallet/utxos`);
  if (!res.ok) throw new Error("Failed to fetch wallet UTXOs");
  return res.json();
}

/**
 * Fetch pixels painted by a specific address
 */
export async function fetchPixelsByAddress(
  address: string, 
  page = 0, 
  perPage = 100
): Promise<MyPixelsByAddressResponse> {
  const params = new URLSearchParams({
    address,
    page: page.toString(),
    per_page: perPage.toString(),
  });
  
  const res = await fetch(`${API_URL}/pixels/by-address?${params}`);
  if (!res.ok) throw new Error("Failed to fetch pixels by address");
  return res.json();
}

/**
 * Fetch pixels painted by specific transaction IDs
 */
export async function fetchPixelsByTxids(txids: string[]): Promise<MyPixelsResponse> {
  if (txids.length === 0) {
    return { pixels: [], total_pixels: 0, unique_transactions: 0 };
  }
  
  const res = await fetch(`${API_URL}/pixels/by-txids`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txids }),
  });
  
  if (!res.ok) throw new Error("Failed to fetch pixels by txids");
  return res.json();
}

