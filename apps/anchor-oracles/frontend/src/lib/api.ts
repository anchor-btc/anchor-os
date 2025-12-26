const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3701";
const DASHBOARD_API = process.env.NEXT_PUBLIC_DASHBOARD_API_URL || "http://localhost:3100";

export interface Oracle {
  id: number;
  pubkey: string;
  name: string;
  description: string | null;
  categories: number;
  category_names: string[];
  stake_sats: number;
  status: string;
  registered_at: number | null;
  total_attestations: number;
  successful_attestations: number;
  disputed_attestations: number;
  reputation_score: number;
  created_at: string;
}

export interface Attestation {
  id: number;
  oracle_id: number;
  oracle_pubkey: string | null;
  oracle_name: string | null;
  txid: string;
  vout: number;
  block_height: number | null;
  category: number;
  category_name: string;
  event_id: string;
  event_description: string | null;
  outcome_data: string;
  schnorr_signature: string;
  status: string;
  created_at: string;
}

export interface Dispute {
  id: number;
  attestation_id: number;
  disputer_pubkey: string;
  txid: string;
  vout: number;
  block_height: number | null;
  reason: number;
  reason_name: string;
  stake_sats: number;
  status: string;
  resolution: string | null;
  created_at: string;
}

export interface EventRequest {
  id: number;
  event_id: string;
  category: number;
  category_name: string;
  description: string;
  resolution_block: number | null;
  bounty_sats: number;
  status: string;
  fulfilled_by: number | null;
  created_at: string;
}

export interface OracleStats {
  total_oracles: number;
  active_oracles: number;
  total_staked: number;
  avg_reputation: number;
  total_attestations: number;
  pending_events: number;
  active_disputes: number;
}

export interface CategoryInfo {
  id: number;
  name: string;
  description: string;
  oracle_count: number;
  attestation_count: number;
}

async function fetchApi<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export async function fetchStats(): Promise<OracleStats> {
  return fetchApi("/api/stats");
}

export async function fetchOracles(limit = 50, offset = 0): Promise<Oracle[]> {
  return fetchApi(`/api/oracles?limit=${limit}&offset=${offset}`);
}

export async function fetchOracle(pubkey: string): Promise<Oracle> {
  return fetchApi(`/api/oracles/${pubkey}`);
}

export async function fetchOracleAttestations(pubkey: string, limit = 50): Promise<Attestation[]> {
  return fetchApi(`/api/oracles/${pubkey}/attestations?limit=${limit}`);
}

export async function fetchAttestations(limit = 50, offset = 0): Promise<Attestation[]> {
  return fetchApi(`/api/attestations?limit=${limit}&offset=${offset}`);
}

export async function fetchEvents(status?: string, limit = 50): Promise<EventRequest[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status) params.set("status", status);
  return fetchApi(`/api/events?${params}`);
}

export async function fetchEvent(id: number): Promise<EventRequest> {
  return fetchApi(`/api/events/${id}`);
}

export async function fetchEventAttestations(id: number): Promise<Attestation[]> {
  return fetchApi(`/api/events/${id}/attestations`);
}

export async function fetchDisputes(status?: string, limit = 50): Promise<Dispute[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status) params.set("status", status);
  return fetchApi(`/api/disputes?${params}`);
}

export async function fetchCategories(): Promise<CategoryInfo[]> {
  return fetchApi("/api/categories");
}

export async function fetchOraclesByAddresses(addresses: string[]): Promise<Oracle[]> {
  if (addresses.length === 0) return [];
  
  // Use POST to avoid URL length limits with many addresses
  const res = await fetch(`${API_BASE}/api/oracles/by-addresses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addresses }),
  });
  
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

// Explorer types and functions
export interface ExplorerInfo {
  explorer: string;
  name: string;
  status: string | null;
  port: number;
  is_default: boolean;
  base_url: string;
  tx_url_template: string;
  address_url_template: string;
}

export async function fetchDefaultExplorer(): Promise<ExplorerInfo> {
  const res = await fetch(`${DASHBOARD_API}/explorer/default`);
  if (!res.ok) {
    // Fallback to mempool if dashboard is unavailable
    return {
      explorer: "mempool",
      name: "Mempool",
      status: null,
      port: 4000,
      is_default: true,
      base_url: "http://localhost:4000",
      tx_url_template: "/tx/{txid}",
      address_url_template: "/address/{address}",
    };
  }
  return res.json();
}

export function buildExplorerTxUrl(explorer: ExplorerInfo, txid: string): string {
  return explorer.base_url + explorer.tx_url_template.replace("{txid}", txid);
}

export function buildExplorerAddressUrl(explorer: ExplorerInfo, address: string): string {
  return explorer.base_url + explorer.address_url_template.replace("{address}", address);
}

