/**
 * Anchor Tokens API Client
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3016";
const WALLET_URL = process.env.NEXT_PUBLIC_WALLET_URL || "http://localhost:3001";

// ============================================================================
// Types
// ============================================================================

export interface Token {
  id: number;
  ticker: string;
  deployTxid: string;
  deployVout: number;
  decimals: number;
  maxSupply: string;
  mintLimit: string | null;
  mintedSupply: string;
  burnedSupply: string;
  circulatingSupply: string;
  holderCount: number;
  txCount: number;
  flags: number;
  isOpenMint: boolean;
  isBurnable: boolean;
  blockHeight: number | null;
  createdAt: string;
}

export interface TokenUtxo {
  id: number;
  tokenId: number;
  ticker: string;
  txid: string;
  vout: number;
  amount: string;
  decimals: number;
  ownerScript: string | null;
  ownerAddress: string | null;
  blockHeight: number | null;
  createdAt: string;
  isSpent: boolean;
}

export interface TokenBalance {
  tokenId: number;
  ticker: string;
  balance: string;
  decimals: number;
  utxoCount: number;
}

export interface TokenOperation {
  id: number;
  tokenId: number;
  ticker: string;
  operation: string;
  txid: string;
  vout: number;
  amount: string | null;
  fromAddress: string | null;
  toAddress: string | null;
  blockHeight: number | null;
  createdAt: string;
}

export interface TokenHolder {
  address: string;
  balance: string;
  percentage: number;
  utxoCount: number;
  txid?: string;
  vout?: number;
}

export interface TokenStats {
  totalTokens: number;
  totalHolders: number;
  totalOperations: number;
  lastBlockHeight: number | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface CreateTxResponse {
  txid: string;
  vout: number;
  hex: string;
  carrier: number;
  carrierName: string;
}

export interface WalletBalance {
  confirmed: number;
  unconfirmed: number;
  total: number;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `API error: ${res.status}`);
  }

  return res.json();
}

async function fetchWallet<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${WALLET_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `Wallet error: ${res.status}`);
  }

  return res.json();
}

// ============================================================================
// Token API
// ============================================================================

export async function getStats(): Promise<TokenStats> {
  return fetchApi("/stats");
}

export async function getTokens(
  page: number = 1,
  perPage: number = 50,
  search?: string
): Promise<PaginatedResponse<Token>> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });
  if (search) params.set("search", search);
  return fetchApi(`/tokens?${params}`);
}

export async function getToken(ticker: string): Promise<Token> {
  return fetchApi(`/tokens/${ticker}`);
}

export async function getTokenHolders(
  ticker: string,
  page: number = 1,
  perPage: number = 50
): Promise<PaginatedResponse<TokenHolder>> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });
  return fetchApi(`/tokens/${ticker}/holders?${params}`);
}

export async function getTokenHistory(
  ticker: string,
  page: number = 1,
  perPage: number = 50
): Promise<PaginatedResponse<TokenOperation>> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });
  return fetchApi(`/tokens/${ticker}/history?${params}`);
}

// ============================================================================
// Address API
// ============================================================================

export async function getAddressBalances(address: string): Promise<TokenBalance[]> {
  return fetchApi(`/address/${address}/balances`);
}

export async function getAddressUtxos(
  address: string,
  ticker?: string
): Promise<TokenUtxo[]> {
  const params = ticker ? `?ticker=${ticker}` : "";
  return fetchApi(`/address/${address}/utxos${params}`);
}

export async function getAddressHistory(
  address: string,
  page: number = 1,
  perPage: number = 50
): Promise<PaginatedResponse<TokenOperation>> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });
  return fetchApi(`/address/${address}/history?${params}`);
}

// ============================================================================
// Transaction API
// ============================================================================

export interface DeployRequest {
  ticker: string;
  decimals: number;
  maxSupply: string;
  mintLimit?: string;
  openMint?: boolean;
  burnable?: boolean;
  carrier?: number;
  feeRate?: number;
}

export interface MintRequest {
  ticker: string;
  amount: string;
  carrier?: number;
  feeRate?: number;
}

export interface TransferRequest {
  ticker: string;
  allocations: Array<{ address: string; amount: string }>;
  carrier?: number;
  feeRate?: number;
}

export interface BurnRequest {
  ticker: string;
  amount: string;
  carrier?: number;
  feeRate?: number;
}

export async function createDeployTx(request: DeployRequest): Promise<CreateTxResponse> {
  return fetchApi("/tx/deploy", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function createMintTx(request: MintRequest): Promise<CreateTxResponse> {
  return fetchApi("/tx/mint", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function createTransferTx(request: TransferRequest): Promise<CreateTxResponse> {
  return fetchApi("/tx/transfer", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function createBurnTx(request: BurnRequest): Promise<CreateTxResponse> {
  return fetchApi("/tx/burn", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

// ============================================================================
// Wallet API
// ============================================================================

export async function getWalletBalance(): Promise<WalletBalance> {
  return fetchWallet("/wallet/balance");
}

export async function getWalletAddress(): Promise<{ address: string }> {
  return fetchWallet("/wallet/address");
}

export async function broadcastTx(hex: string): Promise<{ txid: string }> {
  return fetchWallet("/wallet/broadcast", {
    method: "POST",
    body: JSON.stringify({ hex }),
  });
}

export async function mineBlocks(count: number = 1): Promise<{ blocks: number }> {
  return fetchWallet("/wallet/mine", {
    method: "POST",
    body: JSON.stringify({ blocks: count }),
  });
}

// ============================================================================
// Wallet Tokens API (from tokens backend)
// ============================================================================

export interface WalletTokensResponse {
  balances: TokenBalance[];
  utxos: TokenUtxo[];
  totalUtxos: number;
}

export async function getWalletTokens(): Promise<WalletTokensResponse> {
  return fetchApi("/wallet/tokens");
}
