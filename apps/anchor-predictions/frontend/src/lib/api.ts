const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3801';

// ==================== Types ====================

export interface Market {
  id: number;
  market_id: string;
  question: string;
  description: string | null;
  resolution_block: number;
  oracle_pubkey: string;
  creator_pubkey: string;
  status: string;
  resolution: number | null;
  resolution_name: string;
  yes_pool: number;
  no_pool: number;
  yes_price: number;
  no_price: number;
  total_volume_sats: number;
  total_yes_sats: number;
  total_no_sats: number;
  position_count: number;
  created_at: string;
}

export interface Position {
  id: number;
  market_id: string;
  txid: string;
  vout: number;
  block_height: number | null;
  user_pubkey: string;
  outcome: number;
  outcome_name: string;
  amount_sats: number;
  shares: number;
  avg_price: number;
  is_winner: boolean;
  payout_sats: number;
  claimed: boolean;
  created_at: string;
}

export interface Winner {
  position_id: number;
  user_pubkey: string;
  outcome: number;
  outcome_name: string;
  amount_sats: number;
  shares: number;
  payout_sats: number;
  claimed: boolean;
}

export interface MarketStats {
  total_markets: number;
  active_markets: number;
  resolved_markets: number;
  total_positions: number;
  total_volume_sats: number;
  total_payouts_sats: number;
  largest_market_sats: number;
}

export interface BetQuote {
  outcome: number;
  outcome_name: string;
  amount_sats: number;
  shares_out: number;
  avg_price: number;
  price_impact: number;
  new_yes_price: number;
  new_no_price: number;
}

// ==================== API Functions ====================

async function fetchApi<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

async function postApi<T>(endpoint: string, data: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `API error: ${res.status}`);
  }
  return res.json();
}

// Stats
export async function fetchStats(): Promise<MarketStats> {
  return fetchApi('/api/stats');
}

// Markets
export async function fetchMarkets(status?: string, limit = 50): Promise<Market[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status) params.set('status', status);
  return fetchApi(`/api/markets?${params}`);
}

export async function fetchMarket(id: string): Promise<Market> {
  return fetchApi(`/api/markets/${id}`);
}

export async function fetchMarketPositions(id: string, limit = 100): Promise<Position[]> {
  return fetchApi(`/api/markets/${id}/positions?limit=${limit}`);
}

export async function fetchMarketWinners(id: string): Promise<Winner[]> {
  return fetchApi(`/api/markets/${id}/winners`);
}

// User
export async function fetchMyPositions(pubkey: string, limit = 50): Promise<Position[]> {
  return fetchApi(`/api/my/positions?pubkey=${pubkey}&limit=${limit}`);
}

// All positions (for demo - shows all bets from all users)
export async function fetchAllPositions(limit = 50): Promise<Position[]> {
  return fetchApi(`/api/positions?limit=${limit}`);
}

// History
export async function fetchHistory(limit = 20): Promise<Market[]> {
  return fetchApi(`/api/history?limit=${limit}`);
}

// ==================== POST APIs ====================

export interface CreateMarketRequest {
  question: string;
  description?: string;
  resolution_block: number;
  oracle_pubkey: string;
  initial_liquidity_sats?: number;
}

export interface CreateMarketResponse {
  status: string;
  message: string;
  question: string;
  description?: string;
  resolution_block: number;
  oracle_pubkey: string;
  initial_liquidity_sats: number;
}

export interface PlaceBetRequest {
  outcome: number; // 0=NO, 1=YES
  amount_sats: number;
  user_pubkey: string;
  bet_address?: string; // Bitcoin address for the bet transaction output
  min_shares?: number;
}

export interface PlaceBetResponse {
  status: string;
  message: string;
  market_id: string;
  outcome: string;
  amount_sats: number;
  expected_shares: number;
  shares?: number;
  avg_price: number;
  price_impact: number;
  txid?: string;
  is_real_tx?: boolean;
}

export interface ClaimWinningsRequest {
  position_id: number;
  payout_address: string;
}

export interface ClaimWinningsResponse {
  status: string;
  message: string;
  market_id: string;
  position_id: number;
  payout_sats?: number;
  payout_address?: string;
  claim_txid?: string;
}

export async function createMarket(data: CreateMarketRequest): Promise<CreateMarketResponse> {
  return postApi('/api/markets/create', data);
}

export async function getBetQuote(marketId: string, data: PlaceBetRequest): Promise<BetQuote> {
  return postApi(`/api/markets/${marketId}/quote`, data);
}

export async function placeBet(marketId: string, data: PlaceBetRequest): Promise<PlaceBetResponse> {
  return postApi(`/api/markets/${marketId}/bet`, data);
}

export async function claimWinnings(
  marketId: string,
  data: ClaimWinningsRequest
): Promise<ClaimWinningsResponse> {
  return postApi(`/api/markets/${marketId}/claim`, data);
}

// ==================== Oracle API ====================

const ORACLE_API_BASE = process.env.NEXT_PUBLIC_ORACLE_API_URL || 'http://localhost:3701';

export interface Oracle {
  id: number;
  pubkey: string;
  name: string;
  description: string;
  reputation_score: number;
  total_attestations: number;
  status: string;
}

export async function fetchOracles(): Promise<Oracle[]> {
  const res = await fetch(`${ORACLE_API_BASE}/api/oracles?limit=50`);
  if (!res.ok) {
    throw new Error(`Oracle API error: ${res.status}`);
  }
  return res.json();
}

// ==================== Helpers ====================

export function formatOdds(price: number): string {
  return `${(price * 100).toFixed(1)}%`;
}

export function formatImpliedOdds(price: number): string {
  if (price <= 0 || price >= 1) return 'N/A';
  const decimal = 1 / price;
  return decimal.toFixed(2);
}

export function outcomeColor(outcome: number): string {
  return outcome === 1 ? 'text-green-400 bg-green-500/20' : 'text-red-400 bg-red-500/20';
}

export function statusColor(status: string): string {
  switch (status) {
    case 'open':
      return 'bg-green-500/20 text-green-400';
    case 'resolved':
      return 'bg-blue-500/20 text-blue-400';
    case 'cancelled':
      return 'bg-red-500/20 text-red-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}
