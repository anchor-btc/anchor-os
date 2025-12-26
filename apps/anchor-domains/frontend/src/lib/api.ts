/**
 * Anchor Domains API Client
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006';
const WALLET_URL = process.env.NEXT_PUBLIC_WALLET_URL || 'http://localhost:3001';
const DASHBOARD_API_URL = process.env.NEXT_PUBLIC_DASHBOARD_API_URL || 'http://localhost:8000';
const DEFAULT_BLOCK_EXPLORER_URL =
  process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || 'http://localhost:4000';

// Explorer cache
let cachedExplorerUrl: string | null = null;

// Fetch the default block explorer URL from dashboard settings
async function fetchDefaultExplorerUrl(): Promise<string> {
  try {
    const res = await fetch(`${DASHBOARD_API_URL}/explorer/default`);
    if (res.ok) {
      const data = await res.json();
      cachedExplorerUrl = data.base_url;
      return data.base_url;
    }
  } catch (e) {
    console.warn('Failed to fetch default explorer, using fallback:', e);
  }
  return DEFAULT_BLOCK_EXPLORER_URL;
}

// Initialize explorer URL on module load
if (typeof window !== 'undefined') {
  fetchDefaultExplorerUrl();
}

// Get explorer transaction URL
export function getExplorerTxUrl(txid: string): string {
  const baseUrl = cachedExplorerUrl || DEFAULT_BLOCK_EXPLORER_URL;
  return `${baseUrl}/tx/${txid}`;
}

// Types
export interface DnsRecord {
  id: number;
  record_type: string;
  /** Record name/subdomain prefix (e.g., "user._nostr", "www", null for root "@") */
  name?: string;
  ttl: number;
  value: string;
  priority?: number;
  weight?: number;
  port?: number;
  txid: string;
  block_height?: number;
  created_at: string;
}

export interface Domain {
  id: number;
  name: string;
  txid: string;
  vout: number;
  txid_prefix: string;
  owner_txid: string;
  block_height?: number;
  records: DnsRecord[];
  created_at: string;
  updated_at: string;
}

export interface DomainListItem {
  id: number;
  name: string;
  txid: string;
  txid_prefix: string;
  record_count: number;
  block_height?: number;
  created_at: string;
}

export interface ResolveResponse {
  name: string;
  txid: string;
  vout: number;
  txid_prefix: string;
  records: DnsRecord[];
  created_at?: string;
}

export interface DnsStats {
  total_domains: number;
  total_records: number;
  total_transactions: number;
  last_block_height?: number;
  last_update?: string;
}

export interface HistoryEntry {
  txid: string;
  vout: number;
  operation: string;
  block_height?: number;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface AvailabilityResponse {
  name: string;
  available: boolean;
}

export interface CreateTxResponse {
  txid: string;
  vout: number;
  hex: string;
  carrier: number;
  carrier_name: string;
}

export interface WalletBalance {
  confirmed: number;
  unconfirmed: number;
  total: number;
}

export interface WalletUtxo {
  txid: string;
  vout: number;
  value: number;
  confirmations: number;
}

export interface DnsRecordInput {
  record_type: string;
  name?: string; // Subdomain/prefix (e.g., "user._nostr", "www", "@" or null for root)
  value: string;
  ttl?: number;
  priority?: number;
  weight?: number;
  port?: number;
}

export interface PendingTransaction {
  id: number;
  txid: string;
  domain_name: string;
  operation: string;
  records?: DnsRecordInput[];
  carrier?: number;
  created_at: string;
}

export interface PendingStatusResponse {
  name: string;
  has_pending: boolean;
  pending?: PendingTransaction;
}

// API Functions

export async function getStats(): Promise<DnsStats> {
  const res = await fetch(`${API_URL}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function resolveDomain(name: string): Promise<ResolveResponse> {
  const res = await fetch(`${API_URL}/resolve/${encodeURIComponent(name)}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Domain not found');
    throw new Error('Failed to resolve domain');
  }
  return res.json();
}

export async function resolveByTxid(prefix: string): Promise<ResolveResponse> {
  const res = await fetch(`${API_URL}/resolve/txid/${prefix}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Domain not found');
    throw new Error('Failed to resolve domain');
  }
  return res.json();
}

export async function listDomains(
  page = 1,
  perPage = 50,
  search?: string
): Promise<PaginatedResponse<DomainListItem>> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });
  if (search) params.set('search', search);

  const res = await fetch(`${API_URL}/domains?${params}`);
  if (!res.ok) throw new Error('Failed to fetch domains');
  return res.json();
}

export async function getDomain(name: string): Promise<Domain> {
  const res = await fetch(`${API_URL}/domains/${encodeURIComponent(name)}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Domain not found');
    throw new Error('Failed to fetch domain');
  }
  return res.json();
}

export async function getDomainHistory(name: string): Promise<HistoryEntry[]> {
  const res = await fetch(`${API_URL}/domains/${encodeURIComponent(name)}/history`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Domain not found');
    throw new Error('Failed to fetch history');
  }
  return res.json();
}

export async function checkAvailability(name: string): Promise<AvailabilityResponse> {
  const res = await fetch(`${API_URL}/available/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error('Failed to check availability');
  return res.json();
}

export async function registerDomain(
  name: string,
  records: DnsRecordInput[],
  carrier?: number
): Promise<CreateTxResponse> {
  const res = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, records, carrier }),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || 'Failed to register domain');
  }
  return res.json();
}

export async function updateDomain(
  name: string,
  records: DnsRecordInput[],
  carrier?: number
): Promise<CreateTxResponse> {
  const res = await fetch(`${API_URL}/update/${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records, carrier }),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || 'Failed to update domain');
  }
  return res.json();
}

export async function getDomainsByOwner(txids: string[]): Promise<DomainListItem[]> {
  const res = await fetch(`${API_URL}/domains/by-owner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txids }),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch domains by owner');
  }
  return res.json();
}

// Pending Transaction Functions

export async function getPendingStatus(name: string): Promise<PendingStatusResponse> {
  const res = await fetch(`${API_URL}/pending/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error('Failed to fetch pending status');
  return res.json();
}

export async function listPendingTransactions(): Promise<PendingTransaction[]> {
  const res = await fetch(`${API_URL}/pending`);
  if (!res.ok) throw new Error('Failed to fetch pending transactions');
  return res.json();
}

// Wallet API Functions

export async function getWalletBalance(): Promise<WalletBalance> {
  const res = await fetch(`${WALLET_URL}/wallet/balance`);
  if (!res.ok) throw new Error('Failed to fetch wallet balance');
  return res.json();
}

export async function getWalletUtxos(): Promise<WalletUtxo[]> {
  const res = await fetch(`${WALLET_URL}/wallet/utxos`);
  if (!res.ok) throw new Error('Failed to fetch wallet UTXOs');
  return res.json();
}

export async function getWalletTransactions(): Promise<string[]> {
  // Get all UTXOs and extract unique txids
  const utxos = await getWalletUtxos();
  const txids = [...new Set(utxos.map((utxo) => utxo.txid))];
  return txids;
}

export async function mineBlocks(count = 1): Promise<{ blocks: number }> {
  const res = await fetch(`${WALLET_URL}/wallet/mine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks: count }),
  });
  if (!res.ok) throw new Error('Failed to mine blocks');
  return res.json();
}

// Identity Types
export type IdentityType = 'nostr' | 'pubky';

export interface WalletIdentity {
  id: string;
  identity_type: IdentityType;
  label: string;
  public_key: string;
  formatted_public_key: string;
  is_primary: boolean;
  created_at: string;
}

export interface IdentitiesResponse {
  identities: WalletIdentity[];
  total: number;
}

export async function getWalletIdentities(): Promise<IdentitiesResponse> {
  const res = await fetch(`${WALLET_URL}/wallet/identities`);
  if (!res.ok) throw new Error('Failed to fetch wallet identities');
  return res.json();
}

// Identity record format for Selfie Records
// TXT value is just the formatted public key (npub1xxx... or pk:xxx...)
export function formatIdentityAsTxt(identity: WalletIdentity): string {
  // Use the formatted_public_key from the wallet if available,
  // otherwise build it from the raw public key
  if (identity.formatted_public_key) {
    return identity.formatted_public_key;
  }
  const prefix = identity.identity_type === 'nostr' ? 'npub1' : 'pk:';
  return `${prefix}${identity.public_key}`;
}

// Identity Record Types
export interface IdentityRecord {
  identity_type: IdentityType;
  subdomain?: string;
  public_key: string;
  record_name: string;
  published_at: string;
}

export interface ListIdentitiesResponse {
  domain: string;
  identities: IdentityRecord[];
}

export async function listDomainIdentities(domain: string): Promise<ListIdentitiesResponse> {
  const res = await fetch(`${API_URL}/domains/${encodeURIComponent(domain)}/identities`);
  if (!res.ok) throw new Error('Failed to fetch domain identities');
  return res.json();
}

// Utility Functions

export function formatSats(sats: number): string {
  if (sats >= 100_000_000) {
    return `${(sats / 100_000_000).toFixed(8)} BTC`;
  }
  return `${sats.toLocaleString()} sats`;
}

export function truncateTxid(txid: string, length = 8): string {
  if (txid.length <= length * 2) return txid;
  return `${txid.slice(0, length)}...${txid.slice(-length)}`;
}

export function getRecordTypeColor(type: string): string {
  switch (type.toUpperCase()) {
    case 'A':
      return 'bg-green-100 text-green-800';
    case 'AAAA':
      return 'bg-blue-100 text-blue-800';
    case 'CNAME':
      return 'bg-purple-100 text-purple-800';
    case 'TXT':
      return 'bg-yellow-100 text-yellow-800';
    case 'MX':
      return 'bg-red-100 text-red-800';
    case 'NS':
      return 'bg-indigo-100 text-indigo-800';
    case 'SRV':
      return 'bg-pink-100 text-pink-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
