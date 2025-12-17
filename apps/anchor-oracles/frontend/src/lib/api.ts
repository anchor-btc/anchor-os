const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3020";

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

export async function fetchDisputes(status?: string, limit = 50): Promise<Dispute[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status) params.set("status", status);
  return fetchApi(`/api/disputes?${params}`);
}

export async function fetchCategories(): Promise<CategoryInfo[]> {
  return fetchApi("/api/categories");
}

