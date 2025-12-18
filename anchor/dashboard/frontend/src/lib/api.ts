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

// Tor Types

export interface OnionAddresses {
  bitcoin?: string;
  electrs?: string;
  dashboard?: string;
}

export interface TorStatus {
  running: boolean;
  connected: boolean;
  container_status: string | null;
  tor_version: string | null;
  circuit_established: boolean;
  external_ip: string | null;
  onion_addresses: OnionAddresses;
}

export interface TorActionResponse {
  success: boolean;
  message: string;
}

// Tor API Functions

export async function fetchTorStatus(): Promise<TorStatus> {
  const res = await fetch(`${API_URL}/tor/status`);
  if (!res.ok) throw new Error("Failed to fetch Tor status");
  return res.json();
}

export async function fetchOnionAddresses(): Promise<OnionAddresses> {
  const res = await fetch(`${API_URL}/tor/onion-addresses`);
  if (!res.ok) throw new Error("Failed to fetch onion addresses");
  return res.json();
}

export async function enableTor(): Promise<TorActionResponse> {
  const res = await fetch(`${API_URL}/tor/enable`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to enable Tor");
  return res.json();
}

export async function disableTor(): Promise<TorActionResponse> {
  const res = await fetch(`${API_URL}/tor/disable`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to disable Tor");
  return res.json();
}

export async function newTorCircuit(): Promise<TorActionResponse> {
  const res = await fetch(`${API_URL}/tor/new-circuit`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to create new Tor circuit");
  return res.json();
}

// Electrum Types (Electrs/Fulcrum switching)

export type ElectrumServer = "electrs" | "fulcrum";

export interface ElectrumStatus {
  configured_server: ElectrumServer;
  active_server: ElectrumServer | null;
  electrs_status: string | null;
  fulcrum_status: string | null;
  port_available: boolean;
  sync_status: string | null;
}

export interface ElectrumSwitchRequest {
  server: ElectrumServer;
}

export interface ElectrumActionResponse {
  success: boolean;
  message: string;
  active_server: ElectrumServer | null;
}

// Electrum API Functions

export async function fetchElectrumStatus(): Promise<ElectrumStatus> {
  const res = await fetch(`${API_URL}/electrum/status`);
  if (!res.ok) throw new Error("Failed to fetch Electrum status");
  return res.json();
}

export async function switchElectrumServer(
  server: ElectrumServer
): Promise<ElectrumActionResponse> {
  const res = await fetch(`${API_URL}/electrum/switch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ server }),
  });
  if (!res.ok) throw new Error("Failed to switch Electrum server");
  return res.json();
}

export async function fetchElectrumInfo(): Promise<ElectrumStatus> {
  const res = await fetch(`${API_URL}/electrum/info`);
  if (!res.ok) throw new Error("Failed to fetch Electrum info");
  return res.json();
}

// Installation Types

export type InstallationPreset = "minimum" | "default" | "full" | "custom";

export type ServiceInstallStatus =
  | "not_installed"
  | "installed"
  | "installing"
  | "failed";

export type ServiceCategory =
  | "core"
  | "explorer"
  | "networking"
  | "monitoring"
  | "app"
  | "dashboard";

export interface ServiceDefinition {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  docker_profiles: string[];
  containers: string[];
  install_status: ServiceInstallStatus;
  enabled: boolean;
  required: boolean;
  incompatible_with: string[];
  depends_on: string[];
}

export interface PresetInfo {
  id: InstallationPreset;
  name: string;
  description: string;
  services: string[];
  warning: string | null;
}

export interface InstallationStatus {
  setup_completed: boolean;
  preset: InstallationPreset;
  installed_services: string[];
  active_profiles: string[];
}

export interface ServicesListResponse {
  services: ServiceDefinition[];
  presets: PresetInfo[];
}

export interface InstallationActionResponse {
  success: boolean;
  message: string;
  installed_services: string[];
}

// Installation API Functions

export async function fetchInstallationStatus(): Promise<InstallationStatus> {
  const res = await fetch(`${API_URL}/installation/status`);
  if (!res.ok) throw new Error("Failed to fetch installation status");
  return res.json();
}

export async function fetchAvailableServices(): Promise<ServicesListResponse> {
  const res = await fetch(`${API_URL}/installation/services`);
  if (!res.ok) throw new Error("Failed to fetch available services");
  return res.json();
}

export async function applyInstallationPreset(
  preset: InstallationPreset
): Promise<InstallationActionResponse> {
  const res = await fetch(`${API_URL}/installation/preset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preset }),
  });
  if (!res.ok) throw new Error("Failed to apply installation preset");
  return res.json();
}

export async function applyCustomInstallation(
  services: string[]
): Promise<InstallationActionResponse> {
  const res = await fetch(`${API_URL}/installation/custom`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ services }),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to apply custom installation");
  }
  return res.json();
}

export async function completeSetup(): Promise<InstallationActionResponse> {
  const res = await fetch(`${API_URL}/installation/complete`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to complete setup");
  return res.json();
}

export async function installService(
  serviceId: string
): Promise<InstallationActionResponse> {
  const res = await fetch(`${API_URL}/installation/service/install`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ service_id: serviceId }),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to install service");
  }
  return res.json();
}

export async function uninstallService(
  serviceId: string,
  removeContainers: boolean = false
): Promise<InstallationActionResponse> {
  const res = await fetch(`${API_URL}/installation/service/uninstall`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ service_id: serviceId, remove_containers: removeContainers }),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to uninstall service");
  }
  return res.json();
}

export async function fetchActiveProfiles(): Promise<string[]> {
  const res = await fetch(`${API_URL}/installation/profiles`);
  if (!res.ok) throw new Error("Failed to fetch active profiles");
  return res.json();
}

// Reset installation (factory reset)
export interface ResetInstallationRequest {
  confirmation: string;
  reset_auth?: boolean;
  reset_services?: boolean;
}

export async function resetInstallation(
  options: ResetInstallationRequest
): Promise<InstallationActionResponse> {
  const res = await fetch(`${API_URL}/installation/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to reset installation");
  }
  return res.json();
}

// User Profile
export interface UserProfile {
  name: string;
  avatar_url?: string;
}

export interface ProfileResponse {
  success: boolean;
  profile?: UserProfile;
  message?: string;
}

export async function fetchUserProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_URL}/profile`);
  if (!res.ok) throw new Error("Failed to fetch user profile");
  const data: ProfileResponse = await res.json();
  return data.profile || { name: "Bitcoiner" };
}

export async function updateUserProfile(
  name: string,
  avatar_url?: string
): Promise<ProfileResponse> {
  const res = await fetch(`${API_URL}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, avatar_url }),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to update profile");
  }
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

