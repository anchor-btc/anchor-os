const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3011";
const TESTNET_URL = process.env.NEXT_PUBLIC_TESTNET_URL || "http://localhost:3014";

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

export interface ExecResponse {
  container_id: string;
  output: string;
  exit_code: number | null;
}

export async function execContainer(
  id: string,
  command: string
): Promise<ExecResponse> {
  const res = await fetch(`${API_URL}/docker/containers/${id}/exec`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command }),
  });
  if (!res.ok) throw new Error("Failed to execute command");
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

// Node Management Types

export interface VersionInfo {
  version: string;
  is_default: boolean;
  release_date: string;
  features: string[];
}

export interface NodeConfig {
  current_version: string | null;
  current_network: string;
  is_running: boolean;
  available_versions: VersionInfo[];
}

export interface SwitchVersionResponse {
  success: boolean;
  message: string;
  version: string;
  network: string;
  requires_rebuild: boolean;
}

// Node Management API Functions

export async function fetchNodeConfig(): Promise<NodeConfig> {
  const res = await fetch(`${API_URL}/node/config`);
  if (!res.ok) throw new Error("Failed to fetch node config");
  return res.json();
}

export async function switchNodeVersion(version: string, network: string): Promise<SwitchVersionResponse> {
  const res = await fetch(`${API_URL}/node/switch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version, network }),
  });
  if (!res.ok) throw new Error("Failed to switch node version");
  return res.json();
}

export async function fetchNodeVersions(): Promise<VersionInfo[]> {
  const res = await fetch(`${API_URL}/node/versions`);
  if (!res.ok) throw new Error("Failed to fetch node versions");
  return res.json();
}

// Testnet Types

export interface TestnetConfig {
  min_interval_secs: number;
  max_interval_secs: number;
  blocks_per_cycle: number;
  enable_text: boolean;
  enable_pixel: boolean;
  enable_image: boolean;
  enable_map: boolean;
  enable_dns: boolean;
  enable_proof: boolean;
  weight_op_return: number;
  weight_stamps: number;
  weight_inscription: number;
  weight_taproot_annex: number;
  weight_witness_data: number;
  paused: boolean;
}

export interface TestnetStats {
  total_messages: number;
  total_blocks: number;
  text_count: number;
  pixel_count: number;
  image_count: number;
  map_count: number;
  dns_count: number;
  proof_count: number;
  carrier_op_return: number;
  carrier_stamps: number;
  carrier_inscription: number;
  carrier_taproot_annex: number;
  carrier_witness_data: number;
}

// Testnet API Functions

export async function fetchTestnetConfig(): Promise<TestnetConfig> {
  const res = await fetch(`${TESTNET_URL}/config`);
  if (!res.ok) throw new Error("Failed to fetch testnet config");
  return res.json();
}

export async function updateTestnetConfig(config: Partial<TestnetConfig>): Promise<TestnetConfig> {
  const res = await fetch(`${TESTNET_URL}/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error("Failed to update testnet config");
  return res.json();
}

export async function fetchTestnetStats(): Promise<TestnetStats> {
  const res = await fetch(`${TESTNET_URL}/stats`);
  if (!res.ok) throw new Error("Failed to fetch testnet stats");
  return res.json();
}

export async function pauseTestnet(): Promise<{ paused: boolean }> {
  const res = await fetch(`${TESTNET_URL}/pause`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to pause testnet");
  return res.json();
}

export async function resumeTestnet(): Promise<{ paused: boolean }> {
  const res = await fetch(`${TESTNET_URL}/resume`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to resume testnet");
  return res.json();
}

// Tailscale Types

export interface TailscaleStatus {
  running: boolean;
  logged_in: boolean;
  hostname: string | null;
  ip_address: string | null;
  tailnet: string | null;
  version: string | null;
  backend_state: string | null;
}

export interface TailscaleAuthRequest {
  auth_key: string;
  hostname?: string;
  advertise_routes?: string;
}

export interface TailscaleActionResponse {
  success: boolean;
  message: string;
}

// Tailscale API Functions

export async function fetchTailscaleStatus(): Promise<TailscaleStatus> {
  const res = await fetch(`${API_URL}/tailscale/status`);
  if (!res.ok) throw new Error("Failed to fetch Tailscale status");
  return res.json();
}

export async function connectTailscale(req: TailscaleAuthRequest): Promise<TailscaleActionResponse> {
  const res = await fetch(`${API_URL}/tailscale/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error("Failed to connect to Tailscale");
  return res.json();
}

export async function disconnectTailscale(): Promise<TailscaleActionResponse> {
  const res = await fetch(`${API_URL}/tailscale/disconnect`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to disconnect from Tailscale");
  return res.json();
}

// Cloudflare Types

export interface CloudflareStatus {
  running: boolean;
  connected: boolean;
  container_status: string | null;
  tunnel_info: string | null;
}

export interface CloudflareConnectRequest {
  token: string;
}

export interface CloudflareActionResponse {
  success: boolean;
  message: string;
}

export interface ExposableService {
  name: string;
  description: string;
  local_url: string;
  port: number;
}

export interface ExposableServicesResponse {
  services: ExposableService[];
}

// Cloudflare API Functions

export async function fetchCloudflareStatus(): Promise<CloudflareStatus> {
  const res = await fetch(`${API_URL}/cloudflare/status`);
  if (!res.ok) throw new Error("Failed to fetch Cloudflare status");
  return res.json();
}

export async function connectCloudflare(req: CloudflareConnectRequest): Promise<CloudflareActionResponse> {
  const res = await fetch(`${API_URL}/cloudflare/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error("Failed to connect to Cloudflare");
  return res.json();
}

export async function disconnectCloudflare(): Promise<CloudflareActionResponse> {
  const res = await fetch(`${API_URL}/cloudflare/disconnect`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to disconnect from Cloudflare");
  return res.json();
}

export async function fetchExposableServices(): Promise<ExposableServicesResponse> {
  const res = await fetch(`${API_URL}/cloudflare/services`);
  if (!res.ok) throw new Error("Failed to fetch services");
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

