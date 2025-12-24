const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010";
const TESTNET_URL = process.env.NEXT_PUBLIC_TESTNET_URL || "http://localhost:8002";

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

export interface BulkActionResponse {
  success: boolean;
  message: string;
  affected_containers: string[];
  failed_containers: string[];
}

export async function shutdownAll(): Promise<BulkActionResponse> {
  const res = await fetch(`${API_URL}/docker/shutdown`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to shutdown");
  return res.json();
}

export async function restartAll(): Promise<BulkActionResponse> {
  const res = await fetch(`${API_URL}/docker/restart-all`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to restart all");
  return res.json();
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

export interface RebuildContainerResponse {
  success: boolean;
  message: string;
  service: string;
  output: string;
}

export async function rebuildContainer(
  service: string,
  buildArgs: Record<string, string> = {}
): Promise<RebuildContainerResponse> {
  const res = await fetch(`${API_URL}/docker/rebuild`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ service, build_args: buildArgs }),
  });
  if (!res.ok) throw new Error("Failed to rebuild container");
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

// Node Settings Types

export interface NodeSettings {
  network: string;
  listen: boolean;
  maxconnections: number;
  bantime: number;
  maxmempool: number;
  mempoolexpiry: number;
  minrelaytxfee: number;
  datacarriersize: number;
  rpcuser: string;
  rpcpassword: string;
  rpcport: number;
  rpcthreads: number;
  proxy: string;
  listenonion: boolean;
  onlynet: string;
  dbcache: number;
  prune: number;
  txindex: boolean;
  blockfilterindex: boolean;
  coinstatsindex: boolean;
  logtimestamps: boolean;
}

export interface NodeSettingsResponse {
  settings: NodeSettings;
  config_path: string;
}

export interface UpdateNodeSettingsResponse {
  success: boolean;
  message: string;
  requires_restart: boolean;
}

// Node Settings API Functions

export async function fetchNodeSettings(): Promise<NodeSettingsResponse> {
  const res = await fetch(`${API_URL}/node/settings`);
  if (!res.ok) throw new Error("Failed to fetch node settings");
  return res.json();
}

export async function updateNodeSettings(settings: NodeSettings): Promise<UpdateNodeSettingsResponse> {
  const res = await fetch(`${API_URL}/node/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings }),
  });
  if (!res.ok) throw new Error("Failed to update node settings");
  return res.json();
}

export async function resetNodeSettings(): Promise<NodeSettingsResponse> {
  const res = await fetch(`${API_URL}/node/settings/reset`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to reset node settings");
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
  enable_token: boolean;
  enable_token_mint: boolean;
  enable_token_transfer: boolean;
  enable_token_burn: boolean;
  enable_oracle: boolean;
  enable_prediction: boolean;
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
  token_count: number;
  token_mint_count: number;
  token_transfer_count: number;
  token_burn_count: number;
  oracle_count: number;
  prediction_count: number;
  carrier_op_return: number;
  carrier_stamps: number;
  carrier_inscription: number;
  carrier_taproot_annex: number;
  carrier_witness_data: number;
  errors_count: number;
  success_count: number;
}

// Testnet Scenario Types

export interface ScenarioStep {
  order: number;
  message_type: string;
  carrier: string;
  count: number;
  delay_secs: number;
  blocks_to_mine: number;
  description?: string;
}

export interface ExpectedOutcome {
  min_messages?: number;
  min_blocks?: number;
  message_counts: Record<string, number>;
  max_errors: number;
}

export interface Scenario {
  id: number;
  name: string;
  description?: string;
  steps: ScenarioStep[];
  expected_outcome: ExpectedOutcome;
  is_builtin: boolean;
  created_at?: number;
  updated_at?: number;
}

export interface StepResult {
  step_order: number;
  messages_created: number;
  blocks_mined: number;
  errors: number;
  error_messages: string[];
  duration_ms: number;
}

export interface ScenarioRun {
  run_id: number;
  scenario_id: number;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  step_results: StepResult[];
  total_messages: number;
  total_blocks: number;
  total_errors: number;
  outcomes_met: boolean;
  outcome_failure_reason?: string;
  started_at: number;
  ended_at?: number;
  duration_ms?: number;
}

export interface StatsHistoryEntry {
  timestamp: number;
  total_messages: number;
  total_blocks: number;
  messages_per_minute: number;
  blocks_per_minute: number;
  text_count: number;
  pixel_count: number;
  image_count: number;
  map_count: number;
  dns_count: number;
  proof_count: number;
  token_count: number;
  oracle_count: number;
  prediction_count: number;
  carrier_op_return: number;
  carrier_stamps: number;
  carrier_inscription: number;
  carrier_taproot_annex: number;
  carrier_witness_data: number;
}

export interface TestnetLogEntry {
  id: number;
  timestamp: number;
  level: string;
  message: string;
  message_type?: string;
  carrier?: string;
  txid?: string;
  cycle?: number;
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

// Testnet Scenario API Functions

export async function fetchScenarios(): Promise<{ success: boolean; scenarios: Scenario[] }> {
  const res = await fetch(`${TESTNET_URL}/scenarios`);
  if (!res.ok) throw new Error("Failed to fetch scenarios");
  return res.json();
}

export async function fetchScenario(id: number): Promise<{ success: boolean; scenario: Scenario }> {
  const res = await fetch(`${TESTNET_URL}/scenarios/${id}`);
  if (!res.ok) throw new Error("Failed to fetch scenario");
  return res.json();
}

export async function createScenario(scenario: Omit<Scenario, "id" | "is_builtin" | "created_at" | "updated_at">): Promise<{ success: boolean; id: number }> {
  const res = await fetch(`${TESTNET_URL}/scenarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scenario),
  });
  if (!res.ok) throw new Error("Failed to create scenario");
  return res.json();
}

export async function updateScenario(id: number, updates: Partial<Scenario>): Promise<{ success: boolean }> {
  const res = await fetch(`${TESTNET_URL}/scenarios/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update scenario");
  return res.json();
}

export async function deleteScenario(id: number): Promise<{ success: boolean }> {
  const res = await fetch(`${TESTNET_URL}/scenarios/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete scenario");
  return res.json();
}

export async function runScenario(id: number): Promise<{ success: boolean; run_id: number }> {
  const res = await fetch(`${TESTNET_URL}/scenarios/${id}/run`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to run scenario");
  return res.json();
}

export async function fetchScenarioRuns(): Promise<{ success: boolean; runs: ScenarioRun[] }> {
  const res = await fetch(`${TESTNET_URL}/runs`);
  if (!res.ok) throw new Error("Failed to fetch runs");
  return res.json();
}

export async function fetchStatsHistory(minutes: number = 60): Promise<{ success: boolean; history: StatsHistoryEntry[] }> {
  const res = await fetch(`${TESTNET_URL}/stats/history?minutes=${minutes}`);
  if (!res.ok) throw new Error("Failed to fetch stats history");
  return res.json();
}

export async function fetchTestnetLogs(limit: number = 100, level?: string): Promise<{ success: boolean; logs: TestnetLogEntry[] }> {
  let url = `${TESTNET_URL}/logs?limit=${limit}`;
  if (level) url += `&level=${level}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch logs");
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

// Electrum Types (Electrs/Fulcrum dual-server management)

export type ElectrumServer = "electrs" | "fulcrum";
export type ServerAction = "start" | "stop";

export interface ServerInfo {
  server: ElectrumServer;
  status: string | null;
  is_default: boolean;
  host: string;
  port: number;
}

export interface ElectrumStatus {
  default_server: ElectrumServer;
  electrs: ServerInfo;
  fulcrum: ServerInfo;
}

export interface ElectrumActionResponse {
  success: boolean;
  message: string;
}

// Electrum API Functions

export async function fetchElectrumStatus(): Promise<ElectrumStatus> {
  const res = await fetch(`${API_URL}/electrum/status`);
  if (!res.ok) throw new Error("Failed to fetch Electrum status");
  return res.json();
}

export async function setDefaultElectrumServer(
  server: ElectrumServer
): Promise<ElectrumActionResponse> {
  const res = await fetch(`${API_URL}/electrum/set-default`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ server }),
  });
  if (!res.ok) throw new Error("Failed to set default Electrum server");
  return res.json();
}

export async function electrumServerAction(
  server: ElectrumServer,
  action: ServerAction
): Promise<ElectrumActionResponse> {
  const res = await fetch(`${API_URL}/electrum/server-action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ server, action }),
  });
  if (!res.ok) throw new Error(`Failed to ${action} ${server}`);
  return res.json();
}

// Legacy function - redirects to setDefaultElectrumServer
export async function switchElectrumServer(
  server: ElectrumServer
): Promise<ElectrumActionResponse> {
  return setDefaultElectrumServer(server);
}

export async function fetchElectrumInfo(): Promise<ElectrumStatus> {
  const res = await fetch(`${API_URL}/electrum/info`);
  if (!res.ok) throw new Error("Failed to fetch Electrum info");
  return res.json();
}

// Block Explorer Types

export type BlockExplorer = "mempool" | "btc-rpc-explorer" | "bitfeed";

export interface ExplorerInfo {
  explorer: BlockExplorer;
  name: string;
  status: string | null;
  port: number;
  is_default: boolean;
  base_url: string;
  tx_url_template: string;
  address_url_template: string;
}

export interface ExplorerSettings {
  default_explorer: BlockExplorer;
  explorers: ExplorerInfo[];
}

export interface ExplorerActionResponse {
  success: boolean;
  message: string;
}

// Block Explorer API Functions

export async function fetchExplorerSettings(): Promise<ExplorerSettings> {
  const res = await fetch(`${API_URL}/explorer/settings`);
  if (!res.ok) throw new Error("Failed to fetch explorer settings");
  return res.json();
}

export async function fetchDefaultExplorer(): Promise<ExplorerInfo> {
  const res = await fetch(`${API_URL}/explorer/default`);
  if (!res.ok) throw new Error("Failed to fetch default explorer");
  return res.json();
}

export async function setDefaultExplorer(
  explorer: BlockExplorer
): Promise<ExplorerActionResponse> {
  const res = await fetch(`${API_URL}/explorer/set-default`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ explorer }),
  });
  if (!res.ok) throw new Error("Failed to set default explorer");
  return res.json();
}

// Helper functions for building explorer URLs
export function getExplorerTxUrl(baseUrl: string, txid: string): string {
  return `${baseUrl}/tx/${txid}`;
}

export function getExplorerAddressUrl(baseUrl: string, address: string): string {
  return `${baseUrl}/address/${address}`;
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

// Notifications
export interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message?: string;
  severity: "info" | "success" | "warning" | "error";
  read: boolean;
  created_at: string;
}

export interface NotificationsListResponse {
  notifications: Notification[];
  total: number;
}

export interface UnreadCountResponse {
  count: number;
}

export interface NotificationActionResponse {
  success: boolean;
  message: string;
}

export async function fetchNotifications(): Promise<NotificationsListResponse> {
  const res = await fetch(`${API_URL}/notifications`);
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
}

export async function fetchUnreadCount(): Promise<UnreadCountResponse> {
  const res = await fetch(`${API_URL}/notifications/unread-count`);
  if (!res.ok) throw new Error("Failed to fetch unread count");
  return res.json();
}

export async function markNotificationAsRead(id: number): Promise<NotificationActionResponse> {
  const res = await fetch(`${API_URL}/notifications/${id}/read`, {
    method: "PUT",
  });
  if (!res.ok) throw new Error("Failed to mark notification as read");
  return res.json();
}

export async function markAllNotificationsAsRead(): Promise<NotificationActionResponse> {
  const res = await fetch(`${API_URL}/notifications/read-all`, {
    method: "PUT",
  });
  if (!res.ok) throw new Error("Failed to mark all notifications as read");
  return res.json();
}

export async function deleteNotification(id: number): Promise<NotificationActionResponse> {
  const res = await fetch(`${API_URL}/notifications/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete notification");
  return res.json();
}

export async function clearReadNotifications(): Promise<NotificationActionResponse> {
  const res = await fetch(`${API_URL}/notifications/clear-read`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to clear read notifications");
  return res.json();
}

// ============================================================================
// Wallet Lock and Asset Management
// ============================================================================

export interface LockedUtxo {
  txid: string;
  vout: number;
  reason: string;
  asset_type?: string;
  asset_id?: string;
  locked_at: string;
}

export interface LockResponse {
  success: boolean;
  message: string;
  affected_count: number;
}

export interface LockSettings {
  auto_lock_enabled: boolean;
  total_locked: number;
  last_sync?: string;
}

export interface SyncLocksResponse {
  success: boolean;
  domains_found: number;
  tokens_found: number;
  new_locks_added: number;
  stale_locks_removed: number;
}

export interface DomainAsset {
  name: string;
  txid: string;
  record_count: number;
  block_height?: number;
  created_at?: string;
  is_locked: boolean;
}

export interface TokenAsset {
  ticker: string;
  balance: string;
  decimals: number;
  utxo_count: number;
  is_locked: boolean;
}

export interface AssetsOverview {
  domains: DomainAsset[];
  tokens: TokenAsset[];
  total_domains: number;
  total_token_types: number;
}

export async function fetchLockedUtxos(): Promise<LockedUtxo[]> {
  const res = await fetch(`${API_URL}/wallet/utxos/locked`);
  if (!res.ok) throw new Error("Failed to fetch locked UTXOs");
  return res.json();
}

export async function fetchUnlockedUtxos(): Promise<Utxo[]> {
  const res = await fetch(`${API_URL}/wallet/utxos/unlocked`);
  if (!res.ok) throw new Error("Failed to fetch unlocked UTXOs");
  return res.json();
}

export async function lockUtxos(utxos: { txid: string; vout: number }[]): Promise<LockResponse> {
  const res = await fetch(`${API_URL}/wallet/utxos/lock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ utxos }),
  });
  if (!res.ok) throw new Error("Failed to lock UTXOs");
  return res.json();
}

export async function unlockUtxos(utxos: { txid: string; vout: number }[]): Promise<LockResponse> {
  const res = await fetch(`${API_URL}/wallet/utxos/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ utxos }),
  });
  if (!res.ok) throw new Error("Failed to unlock UTXOs");
  return res.json();
}

export async function syncLocks(): Promise<SyncLocksResponse> {
  const res = await fetch(`${API_URL}/wallet/utxos/sync-locks`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to sync locks");
  return res.json();
}

// Unified Locked Assets Types
export interface CategorySummary {
  count: number;
  total_sats: number;
}

export interface LockedAssetsSummary {
  domains: CategorySummary;
  tokens: CategorySummary;
  manual: CategorySummary;
  total: CategorySummary;
}

export interface LockedAssetItem {
  txid: string;
  vout: number;
  amount_sats: number;
  lock_type: string;
  asset_name: string | null;
  locked_at: string;
}

export interface LockedAssetsOverview {
  summary: LockedAssetsSummary;
  items: LockedAssetItem[];
}

export async function fetchLockedAssets(filter?: string): Promise<LockedAssetsOverview> {
  const url = filter && filter !== "all"
    ? `${API_URL}/wallet/locked-assets?filter=${filter}`
    : `${API_URL}/wallet/locked-assets`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch locked assets");
  return res.json();
}

export async function fetchLockSettings(): Promise<LockSettings> {
  const res = await fetch(`${API_URL}/wallet/locks/settings`);
  if (!res.ok) throw new Error("Failed to fetch lock settings");
  return res.json();
}

export async function setAutoLock(enabled: boolean): Promise<LockResponse> {
  const res = await fetch(`${API_URL}/wallet/locks/auto-lock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error("Failed to set auto-lock");
  return res.json();
}

export async function fetchAssets(): Promise<AssetsOverview> {
  const res = await fetch(`${API_URL}/wallet/assets`);
  if (!res.ok) throw new Error("Failed to fetch assets");
  return res.json();
}

export async function fetchAssetsDomains(): Promise<DomainAsset[]> {
  const res = await fetch(`${API_URL}/wallet/assets/domains`);
  if (!res.ok) throw new Error("Failed to fetch domain assets");
  return res.json();
}

export async function fetchAssetsTokens(): Promise<TokenAsset[]> {
  const res = await fetch(`${API_URL}/wallet/assets/tokens`);
  if (!res.ok) throw new Error("Failed to fetch token assets");
  return res.json();
}

// ============================================================================
// Wallet Backup Types & API Functions
// ============================================================================

export interface MnemonicResponse {
  available: boolean;
  words: string[] | null;
  word_count: number | null;
  warning: string;
}

export interface WalletInfoResponse {
  fingerprint: string;
  network: string;
  external_descriptor: string;
  internal_descriptor: string;
  derivation_path: string;
  address_type: string;
  has_mnemonic: boolean;
  addresses_used: number;
  bdk_enabled: boolean;
}

export interface DescriptorsResponse {
  external: string;
  internal: string;
  has_checksum: boolean;
}

export interface VerifyMnemonicResponse {
  valid: boolean;
  matches_wallet: boolean;
  error: string | null;
}

export interface LockedUtxoBackup {
  txid: string;
  vout: number;
  reason: string;
  asset_type: string | null;
  asset_id: string | null;
}

export interface EncryptedBackup {
  version: number;
  created_at: string;
  network: string;
  encrypted_mnemonic: string;
  salt: string;
  nonce: string;
  external_descriptor: string;
  internal_descriptor: string;
  locked_utxos: LockedUtxoBackup[];
  checksum: string;
}

export interface ExportBackupResponse {
  success: boolean;
  backup: EncryptedBackup | null;
  error: string | null;
}

export interface VerifyBackupResponse {
  valid: boolean;
  checksum_valid: boolean;
  network: string;
  locked_utxos_count: number;
  error: string | null;
}

export async function fetchMnemonic(): Promise<MnemonicResponse> {
  const res = await fetch(`${API_URL}/wallet/backup/mnemonic`);
  if (!res.ok) throw new Error("Failed to fetch mnemonic");
  return res.json();
}

export async function fetchWalletInfo(): Promise<WalletInfoResponse> {
  const res = await fetch(`${API_URL}/wallet/backup/info`);
  if (!res.ok) throw new Error("Failed to fetch wallet info");
  return res.json();
}

export async function fetchDescriptors(): Promise<DescriptorsResponse> {
  const res = await fetch(`${API_URL}/wallet/backup/descriptors`);
  if (!res.ok) throw new Error("Failed to fetch descriptors");
  return res.json();
}

export async function verifyMnemonic(words: string[]): Promise<VerifyMnemonicResponse> {
  const res = await fetch(`${API_URL}/wallet/backup/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ words }),
  });
  if (!res.ok) throw new Error("Failed to verify mnemonic");
  return res.json();
}

export async function syncBdkWallet(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/wallet/backup/sync`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to sync BDK wallet");
  return res.json();
}

export async function exportBackup(password: string): Promise<ExportBackupResponse> {
  const res = await fetch(`${API_URL}/wallet/backup/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error("Failed to export backup");
  return res.json();
}

export async function verifyBackup(
  backup: EncryptedBackup,
  password: string
): Promise<VerifyBackupResponse> {
  const res = await fetch(`${API_URL}/wallet/backup/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ backup, password }),
  });
  if (!res.ok) throw new Error("Failed to verify backup");
  return res.json();
}

// ============================================================================
// Indexer Explorer Types & API Functions
// ============================================================================

export interface MessageQuery {
  kind?: number;
  carrier?: number;
  block?: number;
  block_from?: number;
  block_to?: number;
  search?: string;
  limit?: number;
  offset?: number;
  order?: "asc" | "desc";
}

export interface MessageListItem {
  id: number;
  txid: string;
  vout: number;
  block_height: number | null;
  kind: number;
  kind_name: string;
  carrier: number;
  carrier_name: string;
  body_preview: string;
  body_size: number;
  anchor_count: number;
  created_at: string;
}

export interface PaginatedMessages {
  messages: MessageListItem[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface AnchorInfo {
  anchor_index: number;
  txid_prefix: string;
  vout: number;
  resolved_txid: string | null;
  resolved_message_id: number | null;
  is_ambiguous: boolean;
  is_orphan: boolean;
}

export interface MessageDetail {
  id: number;
  txid: string;
  vout: number;
  block_height: number | null;
  block_hash: string | null;
  kind: number;
  kind_name: string;
  carrier: number;
  carrier_name: string;
  body_hex: string;
  body_text: string | null;
  body_size: number;
  anchors: AnchorInfo[];
  replies_count: number;
  created_at: string;
}

export async function fetchIndexerMessages(query: MessageQuery = {}): Promise<PaginatedMessages> {
  const params = new URLSearchParams();
  if (query.kind !== undefined) params.set("kind", String(query.kind));
  if (query.carrier !== undefined) params.set("carrier", String(query.carrier));
  if (query.block !== undefined) params.set("block", String(query.block));
  if (query.block_from !== undefined) params.set("block_from", String(query.block_from));
  if (query.block_to !== undefined) params.set("block_to", String(query.block_to));
  if (query.search) params.set("search", query.search);
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset !== undefined) params.set("offset", String(query.offset));
  if (query.order) params.set("order", query.order);

  const res = await fetch(`${API_URL}/indexer/messages?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

export async function fetchMessageDetail(txid: string, vout: number): Promise<MessageDetail> {
  const res = await fetch(`${API_URL}/indexer/messages/${txid}/${vout}`);
  if (!res.ok) throw new Error("Failed to fetch message detail");
  return res.json();
}

// ============================================================================
// Indexer Time-Series Types & API Functions
// ============================================================================

export interface KindDataPoint {
  kind: number;
  kind_name: string;
  count: number;
}

export interface CarrierDataPoint {
  carrier: number;
  carrier_name: string;
  count: number;
}

export interface TimeseriesPoint {
  timestamp: string;
  total: number;
  by_kind: KindDataPoint[];
  by_carrier: CarrierDataPoint[];
}

export interface TimeseriesData {
  period: string;
  points: TimeseriesPoint[];
}

export async function fetchIndexerTimeseries(period: "hour" | "day" | "week" = "day", count: number = 30): Promise<TimeseriesData> {
  const res = await fetch(`${API_URL}/indexer/stats/timeseries?period=${period}&count=${count}`);
  if (!res.ok) throw new Error("Failed to fetch timeseries data");
  return res.json();
}

// ============================================================================
// Indexer Anchor Stats Types & API Functions
// ============================================================================

export interface IndexerAnchorStats {
  total: number;
  resolved: number;
  orphaned: number;
  ambiguous: number;
  pending: number;
  resolution_rate: number;
}

export interface OrphanAnchor {
  id: number;
  message_id: number;
  message_txid: string;
  anchor_index: number;
  txid_prefix: string;
  vout: number;
}

export async function fetchAnchorStats(): Promise<IndexerAnchorStats> {
  const res = await fetch(`${API_URL}/indexer/anchors/stats`);
  if (!res.ok) throw new Error("Failed to fetch anchor stats");
  return res.json();
}

export async function fetchOrphanAnchors(limit: number = 20): Promise<OrphanAnchor[]> {
  const res = await fetch(`${API_URL}/indexer/anchors/orphans?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch orphan anchors");
  return res.json();
}

// ============================================================================
// Indexer Performance Types & API Functions
// ============================================================================

export interface PerformanceStats {
  is_synced: boolean;
  last_indexed_block: number;
  current_chain_height: number | null;
  blocks_behind: number;
  messages_per_block: number;
  total_messages: number;
  indexer_status: string;
  last_update: string;
}

export async function fetchPerformanceStats(): Promise<PerformanceStats> {
  const res = await fetch(`${API_URL}/indexer/stats/performance`);
  if (!res.ok) throw new Error("Failed to fetch performance stats");
  return res.json();
}

// ============================================================================
// Indexer WebSocket Live Feed Types
// ============================================================================

export interface LiveMessage {
  id: number;
  txid: string;
  vout: number;
  block_height: number | null;
  kind: number;
  kind_name: string;
  carrier: number;
  carrier_name: string;
  body_preview: string;
}

export interface LiveStats {
  total_messages: number;
  last_indexed_block: number;
}

export interface LiveMessageEvent {
  event_type: "new_message" | "stats" | "error";
  message: LiveMessage | null;
  stats: LiveStats | null;
  timestamp: string;
}

export function getIndexerWebSocketUrl(): string {
  const wsProtocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
  const apiHost = API_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `${wsProtocol}//${apiHost}/indexer/ws/live`;
}

