const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3011";

// Types
export interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string[];
  created: number;
}

export interface ContainersResponse {
  containers: Container[];
}

export interface BlockchainInfo {
  chain: string;
  blocks: number;
  headers: number;
  bestblockhash: string;
  difficulty: number;
  mediantime: number;
  verificationprogress: number;
  pruned: boolean;
  size_on_disk: number;
}

export interface MempoolInfo {
  loaded: boolean;
  size: number;
  bytes: number;
  usage: number;
  total_fee: number;
  maxmempool: number;
  mempoolminfee: number;
  minrelaytxfee: number;
}

export interface NetworkInfo {
  version: number;
  subversion: string;
  protocolversion: number;
  connections: number;
  connections_in: number;
  connections_out: number;
  networkactive: boolean;
  localaddresses: { address: string; port: number; score: number }[];
}

export interface NodeStatus {
  blockchain: BlockchainInfo;
  mempool: MempoolInfo;
  network: NetworkInfo;
}

export interface WalletBalance {
  confirmed: number;
  unconfirmed: number;
  immature?: number;
  total: number;
}

export interface AddressResponse {
  address: string;
}

export interface Utxo {
  txid: string;
  vout: number;
  address?: string;
  amount: number;
  confirmations: number;
}

export interface Transaction {
  txid: string;
  amount: number;
  confirmations: number;
  blockhash?: string;
  blockheight?: number;
  time: number;
  category: string;
}

// API Functions

export async function fetchContainers(): Promise<ContainersResponse> {
  const res = await fetch(`${API_URL}/docker/containers`);
  if (!res.ok) throw new Error("Failed to fetch containers");
  return res.json();
}

export async function startContainer(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/docker/containers/${id}/start`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to start container");
}

export async function stopContainer(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/docker/containers/${id}/stop`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to stop container");
}

export async function restartContainer(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/docker/containers/${id}/restart`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to restart container");
}

export async function fetchContainerLogs(
  id: string,
  tail: number = 100
): Promise<{ container_id: string; logs: string[] }> {
  const res = await fetch(`${API_URL}/docker/containers/${id}/logs?tail=${tail}`);
  if (!res.ok) throw new Error("Failed to fetch logs");
  return res.json();
}

export async function fetchNodeStatus(): Promise<NodeStatus> {
  const res = await fetch(`${API_URL}/bitcoin/status`);
  if (!res.ok) throw new Error("Failed to fetch node status");
  return res.json();
}

export async function fetchBlockchainInfo(): Promise<BlockchainInfo> {
  const res = await fetch(`${API_URL}/bitcoin/info`);
  if (!res.ok) throw new Error("Failed to fetch blockchain info");
  return res.json();
}

export async function fetchMempoolInfo(): Promise<MempoolInfo> {
  const res = await fetch(`${API_URL}/bitcoin/mempool`);
  if (!res.ok) throw new Error("Failed to fetch mempool info");
  return res.json();
}

export async function fetchNetworkInfo(): Promise<NetworkInfo> {
  const res = await fetch(`${API_URL}/bitcoin/network`);
  if (!res.ok) throw new Error("Failed to fetch network info");
  return res.json();
}

export async function fetchWalletBalance(): Promise<WalletBalance> {
  const res = await fetch(`${API_URL}/wallet/balance`);
  if (!res.ok) throw new Error("Failed to fetch wallet balance");
  return res.json();
}

export async function fetchNewAddress(): Promise<AddressResponse> {
  const res = await fetch(`${API_URL}/wallet/address`);
  if (!res.ok) throw new Error("Failed to fetch new address");
  return res.json();
}

export async function fetchUtxos(): Promise<Utxo[]> {
  const res = await fetch(`${API_URL}/wallet/utxos`);
  if (!res.ok) throw new Error("Failed to fetch UTXOs");
  return res.json();
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const res = await fetch(`${API_URL}/wallet/transactions`);
  if (!res.ok) throw new Error("Failed to fetch transactions");
  return res.json();
}

export async function mineBlocks(count: number = 1): Promise<{ blocks: string[] }> {
  const res = await fetch(`${API_URL}/wallet/mine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count }),
  });
  if (!res.ok) throw new Error("Failed to mine blocks");
  return res.json();
}

// Utility functions
export function formatSats(sats: number): string {
  return (sats / 100_000_000).toFixed(8);
}

export function formatBtc(btc: number): string {
  return btc.toFixed(8);
}

export function shortenHash(hash: string, chars: number = 8): string {
  if (hash.length <= chars * 2) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

