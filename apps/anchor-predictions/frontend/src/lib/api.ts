const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3022";

export interface Lottery {
  id: number;
  lottery_id: string;
  lottery_type: number;
  lottery_type_name: string;
  number_count: number;
  number_max: number;
  draw_block: number;
  ticket_price_sats: number;
  token_type: number;
  token_type_name: string;
  oracle_pubkey: string;
  creator_pubkey: string;
  status: string;
  total_pool_sats: number;
  ticket_count: number;
  winning_numbers: number[] | null;
  created_at: string;
}

export interface Ticket {
  id: number;
  lottery_id: string;
  txid: string;
  vout: number;
  block_height: number | null;
  buyer_pubkey: string;
  numbers: number[];
  amount_sats: number;
  matching_numbers: number;
  is_winner: boolean;
  prize_tier: number;
  prize_sats: number;
  claimed: boolean;
  created_at: string;
}

export interface Winner {
  ticket_id: number;
  buyer_pubkey: string;
  numbers: number[];
  matching_numbers: number;
  prize_tier: number;
  prize_sats: number;
  claimed: boolean;
}

export interface LotteryStats {
  total_lotteries: number;
  completed_lotteries: number;
  total_tickets_sold: number;
  total_volume_sats: number;
  total_payouts_sats: number;
  biggest_jackpot_sats: number;
  active_lotteries: number;
}

export interface PrizeTier {
  tier: number;
  matches_required: number;
  payout_percentage: number;
  description: string;
}

async function fetchApi<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export async function fetchStats(): Promise<LotteryStats> {
  return fetchApi("/api/stats");
}

export async function fetchLotteries(status?: string, limit = 50): Promise<Lottery[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status) params.set("status", status);
  return fetchApi(`/api/lotteries?${params}`);
}

export async function fetchLottery(id: string): Promise<Lottery> {
  return fetchApi(`/api/lotteries/${id}`);
}

export async function fetchLotteryTickets(id: string, limit = 100): Promise<Ticket[]> {
  return fetchApi(`/api/lotteries/${id}/tickets?limit=${limit}`);
}

export async function fetchLotteryWinners(id: string): Promise<Winner[]> {
  return fetchApi(`/api/lotteries/${id}/winners`);
}

export async function fetchMyTickets(pubkey: string, limit = 50): Promise<Ticket[]> {
  return fetchApi(`/api/my/tickets?pubkey=${pubkey}&limit=${limit}`);
}

export async function fetchPrizeTiers(lotteryType: number): Promise<PrizeTier[]> {
  return fetchApi(`/api/prize-tiers/${lotteryType}`);
}

export async function fetchHistory(limit = 20): Promise<Lottery[]> {
  return fetchApi(`/api/history?limit=${limit}`);
}

