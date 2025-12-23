"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  NodeConfig,
  NodeSettings,
  fetchNodeSettings,
  updateNodeSettings,
  resetNodeSettings,
  restartContainer,
} from "@/lib/api";
import {
  Settings,
  Network,
  Database,
  Shield,
  Server,
  Wifi,
  HardDrive,
  Loader2,
  Save,
  RotateCw,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Section,
  SectionHeader,
  Grid,
  ActionButton,
  InfoBox,
} from "@/components/ds";

interface NodeSettingsTabProps {
  nodeConfig: NodeConfig | undefined;
}

// Default node settings
const DEFAULT_SETTINGS: NodeSettings = {
  // Network
  network: "regtest",
  listen: true,
  maxconnections: 125,
  bantime: 86400,
  // Mempool
  maxmempool: 300,
  mempoolexpiry: 336,
  minrelaytxfee: 0.00001,
  datacarriersize: 100000,
  // RPC
  rpcuser: "anchor",
  rpcpassword: "anchor",
  rpcport: 18443,
  rpcthreads: 4,
  // Tor
  proxy: "",
  listenonion: false,
  onlynet: "",
  // Performance
  dbcache: 450,
  prune: 0,
  blockfilterindex: false,
  coinstatsindex: false,
  txindex: true,
  logtimestamps: true,
};

export function NodeSettingsTab({ nodeConfig }: NodeSettingsTabProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<NodeSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedSettings, setSavedSettings] = useState<NodeSettings>(DEFAULT_SETTINGS);

  // Fetch settings from backend
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["node-settings"],
    queryFn: fetchNodeSettings,
  });

  // Update local state when data loads
  useEffect(() => {
    if (settingsData?.settings) {
      setSettings(settingsData.settings);
      setSavedSettings(settingsData.settings);
    }
  }, [settingsData]);

  // Track changes
  useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(savedSettings));
  }, [settings, savedSettings]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => updateNodeSettings(settings),
    onSuccess: () => {
      setSavedSettings(settings);
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["node-settings"] });
    },
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: resetNodeSettings,
    onSuccess: (data) => {
      setSettings(data.settings);
      setSavedSettings(data.settings);
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["node-settings"] });
    },
  });

  // Restart node mutation
  const restartMutation = useMutation({
    mutationFn: () => restartContainer("anchor-core-bitcoin"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["node-status"] });
      queryClient.invalidateQueries({ queryKey: ["node-config"] });
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleReset = () => {
    setSettings(savedSettings);
  };

  const handleResetToDefaults = () => {
    resetMutation.mutate();
  };

  const updateSetting = <K extends keyof NodeSettings>(key: K, value: NodeSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Box with Restart Button */}
      <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-warning/10 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {t("node.settingsWarning", "Note")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("node.settingsRequireRestart", "Most settings require a node restart to take effect.")}
            </p>
          </div>
        </div>
        <ActionButton
          variant="restart"
          onClick={() => restartMutation.mutate()}
          loading={restartMutation.isPending}
          icon={RotateCw}
          label={t("node.restartNode", "Restart Node")}
        />
      </div>

      {/* Action Bar */}
      {hasChanges && (
        <div className="flex items-center justify-between p-4 bg-warning/10 border border-warning/20 rounded-xl">
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">{t("node.unsavedChanges", "You have unsaved changes")}</span>
          </div>
          <div className="flex items-center gap-2">
            <ActionButton
              variant="secondary"
              onClick={handleReset}
              icon={RotateCw}
              label={t("common.reset", "Reset")}
              disabled={saveMutation.isPending}
            />
            <ActionButton
              variant="primary"
              onClick={handleSave}
              icon={Save}
              label={t("common.save", "Save")}
              loading={saveMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {saveMutation.isSuccess && (
        <div className="flex items-center justify-between p-4 bg-success/10 border border-success/20 rounded-xl">
          <p className="text-sm text-success">
            {t("node.settingsSaved", "Settings saved successfully. Restart the node to apply changes.")}
          </p>
          <ActionButton
            variant="restart"
            onClick={() => restartMutation.mutate()}
            loading={restartMutation.isPending}
            icon={RotateCw}
            label={t("node.restartNode", "Restart Node")}
          />
        </div>
      )}

      {restartMutation.isSuccess && (
        <div className="p-4 bg-success/10 border border-success/20 rounded-xl">
          <p className="text-sm text-success">
            {t("node.restartSuccess", "Node restarted successfully")}
          </p>
        </div>
      )}

      {restartMutation.isError && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
          <p className="text-sm text-destructive">
            {t("node.restartError", "Failed to restart node")}
          </p>
        </div>
      )}

      {saveMutation.isError && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
          <p className="text-sm text-destructive">
            {t("node.settingsError", "Failed to save settings. Please try again.")}
          </p>
        </div>
      )}

      <Grid cols={{ default: 1, lg: 2 }} gap="lg">
        {/* Network Settings */}
        <Section>
          <SectionHeader
            icon={Network}
            iconColor="blue"
            title={t("node.networkSettings", "Network")}
            subtitle={t("node.networkSettingsDesc", "Connection and peer settings")}
          />
          <div className="space-y-4">
            <SettingSelect
              label={t("node.network", "Network")}
              value={settings.network}
              options={[
                { value: "regtest", label: "Regtest" },
                { value: "testnet", label: "Testnet" },
                { value: "signet", label: "Signet" },
                { value: "mainnet", label: "Mainnet" },
              ]}
              onChange={(v) => updateSetting("network", v)}
              restart
            />
            <SettingToggle
              label={t("node.listen", "Accept Connections")}
              description={t("node.listenDesc", "Accept incoming peer connections")}
              checked={settings.listen}
              onChange={(v) => updateSetting("listen", v)}
              restart
            />
            <SettingNumber
              label={t("node.maxConnections", "Max Connections")}
              value={settings.maxconnections}
              onChange={(v) => updateSetting("maxconnections", v)}
              min={0}
              max={1000}
              restart
            />
            <SettingNumber
              label={t("node.banTime", "Ban Time (seconds)")}
              value={settings.bantime}
              onChange={(v) => updateSetting("bantime", v)}
              min={0}
              restart
            />
          </div>
        </Section>

        {/* Mempool Settings */}
        <Section>
          <SectionHeader
            icon={Database}
            iconColor="purple"
            title={t("node.mempoolSettings", "Mempool")}
            subtitle={t("node.mempoolSettingsDesc", "Transaction pool configuration")}
          />
          <div className="space-y-4">
            <SettingNumber
              label={t("node.maxMempool", "Max Mempool (MB)")}
              value={settings.maxmempool}
              onChange={(v) => updateSetting("maxmempool", v)}
              min={5}
              max={10000}
              restart
            />
            <SettingNumber
              label={t("node.mempoolExpiry", "Mempool Expiry (hours)")}
              value={settings.mempoolexpiry}
              onChange={(v) => updateSetting("mempoolexpiry", v)}
              min={1}
              restart
            />
            <SettingNumber
              label={t("node.minRelayFee", "Min Relay Fee (BTC/kB)")}
              value={settings.minrelaytxfee}
              onChange={(v) => updateSetting("minrelaytxfee", v)}
              min={0}
              step={0.00001}
              restart
            />
            <SettingNumber
              label={t("node.datacarrierSize", "Datacarrier Size (bytes)")}
              value={settings.datacarriersize}
              onChange={(v) => updateSetting("datacarriersize", v)}
              min={0}
              max={100000}
              restart
            />
          </div>
        </Section>

        {/* RPC Settings */}
        <Section>
          <SectionHeader
            icon={Server}
            iconColor="green"
            title={t("node.rpcSettings", "RPC")}
            subtitle={t("node.rpcSettingsDesc", "Remote procedure call configuration")}
          />
          <div className="space-y-4">
            <SettingText
              label={t("node.rpcUser", "RPC User")}
              value={settings.rpcuser}
              onChange={(v) => updateSetting("rpcuser", v)}
              restart
            />
            <SettingText
              label={t("node.rpcPassword", "RPC Password")}
              value={settings.rpcpassword}
              onChange={(v) => updateSetting("rpcpassword", v)}
              type="password"
              restart
            />
            <SettingNumber
              label={t("node.rpcPort", "RPC Port")}
              value={settings.rpcport}
              onChange={(v) => updateSetting("rpcport", v)}
              min={1}
              max={65535}
              restart
            />
            <SettingNumber
              label={t("node.rpcThreads", "RPC Threads")}
              value={settings.rpcthreads}
              onChange={(v) => updateSetting("rpcthreads", v)}
              min={1}
              max={64}
              restart
            />
          </div>
        </Section>

        {/* Tor Settings */}
        <Section>
          <SectionHeader
            icon={Shield}
            iconColor="purple"
            title={t("node.torSettings", "Tor")}
            subtitle={t("node.torSettingsDesc", "Privacy and anonymity settings")}
          />
          <div className="space-y-4">
            <SettingText
              label={t("node.proxy", "SOCKS5 Proxy")}
              value={settings.proxy}
              onChange={(v) => updateSetting("proxy", v)}
              placeholder="networking-tor:9050"
              restart
            />
            <SettingToggle
              label={t("node.listenOnion", "Listen on Onion")}
              description={t("node.listenOnionDesc", "Accept connections via Tor hidden service")}
              checked={settings.listenonion}
              onChange={(v) => updateSetting("listenonion", v)}
              restart
            />
            <SettingSelect
              label={t("node.onlyNet", "Only Network")}
              value={settings.onlynet}
              options={[
                { value: "", label: t("node.allNetworks", "All Networks") },
                { value: "onion", label: "Tor Only" },
                { value: "ipv4", label: "IPv4 Only" },
                { value: "ipv6", label: "IPv6 Only" },
              ]}
              onChange={(v) => updateSetting("onlynet", v)}
              restart
            />
          </div>
        </Section>

        {/* Performance Settings */}
        <Section className="lg:col-span-2">
          <SectionHeader
            icon={HardDrive}
            iconColor="orange"
            title={t("node.performanceSettings", "Performance")}
            subtitle={t("node.performanceSettingsDesc", "Database and indexing options")}
          />
          <Grid cols={{ default: 1, md: 2 }} gap="md">
            <SettingNumber
              label={t("node.dbCache", "DB Cache (MB)")}
              value={settings.dbcache}
              onChange={(v) => updateSetting("dbcache", v)}
              min={4}
              max={16384}
              restart
            />
            <SettingNumber
              label={t("node.prune", "Prune (MB, 0=disabled)")}
              value={settings.prune}
              onChange={(v) => updateSetting("prune", v)}
              min={0}
              restart
            />
            <SettingToggle
              label={t("node.txIndex", "Transaction Index")}
              description={t("node.txIndexDesc", "Maintain a full transaction index")}
              checked={settings.txindex}
              onChange={(v) => updateSetting("txindex", v)}
              restart
            />
            <SettingToggle
              label={t("node.blockFilterIndex", "Block Filter Index")}
              description={t("node.blockFilterIndexDesc", "Maintain compact block filter index")}
              checked={settings.blockfilterindex}
              onChange={(v) => updateSetting("blockfilterindex", v)}
              restart
            />
            <SettingToggle
              label={t("node.coinstatsIndex", "Coinstats Index")}
              description={t("node.coinstatsIndexDesc", "Maintain UTXO set statistics index")}
              checked={settings.coinstatsindex}
              onChange={(v) => updateSetting("coinstatsindex", v)}
              restart
            />
            <SettingToggle
              label={t("node.logTimestamps", "Log Timestamps")}
              description={t("node.logTimestampsDesc", "Prepend timestamps to debug output")}
              checked={settings.logtimestamps}
              onChange={(v) => updateSetting("logtimestamps", v)}
              restart
            />
          </Grid>
        </Section>
      </Grid>
    </div>
  );
}

// Setting Components

function SettingToggle({
  label,
  description,
  checked,
  onChange,
  restart = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  restart?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {restart && <RestartBadge />}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors shrink-0",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow-sm",
            checked && "translate-x-5"
          )}
        />
      </button>
    </div>
  );
}

function SettingNumber({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  restart = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  restart?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {restart && <RestartBadge />}
      </div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
    </div>
  );
}

function SettingText({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  restart = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password";
  restart?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {restart && <RestartBadge />}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
    </div>
  );
}

function SettingSelect({
  label,
  value,
  options,
  onChange,
  restart = false,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  restart?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {restart && <RestartBadge />}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function RestartBadge() {
  const { t } = useTranslation();
  return (
    <span className="text-[10px] bg-warning/10 text-warning px-1.5 py-0.5 rounded flex items-center gap-1">
      <RotateCw className="w-2.5 h-2.5" />
      {t("node.restart", "Restart")}
    </span>
  );
}

