"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Play,
  Pause,
  Activity,
  Zap,
  Box,
  RefreshCw,
  Check,
  X,
  MessageSquare,
  Image,
  Map,
  Globe,
  Shield,
  Coins,
  Eye,
  Sparkles,
  Palette,
  Timer,
  Layers,
  Terminal,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchTestnetConfig,
  updateTestnetConfig,
  fetchTestnetStats,
  pauseTestnet,
  resumeTestnet,
  TestnetConfig,
} from "@/lib/api";

// Import DS components
import {
  PageHeader,
  Section,
  SectionHeader,
  Grid,
  StatCard,
  ActionButton,
} from "@/components/ds";

export default function TestnetPage() {
  const queryClient = useQueryClient();
  const [localConfig, setLocalConfig] = useState<TestnetConfig | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  const {
    data: config,
    isLoading: configLoading,
    error: configError,
  } = useQuery({
    queryKey: ["testnet-config"],
    queryFn: fetchTestnetConfig,
    refetchInterval: 5000,
  });

  const { data: stats } = useQuery({
    queryKey: ["testnet-stats"],
    queryFn: fetchTestnetStats,
    refetchInterval: 2000,
  });

  const updateMutation = useMutation({
    mutationFn: updateTestnetConfig,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["testnet-config"] });
      setLocalConfig(data);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    },
    onError: () => {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    },
  });

  const pauseMutation = useMutation({
    mutationFn: pauseTestnet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testnet-config"] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: resumeTestnet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testnet-config"] });
    },
  });

  useEffect(() => {
    if (config && !localConfig) {
      setLocalConfig(config);
    }
  }, [config, localConfig]);

  const handleConfigChange = (key: keyof TestnetConfig, value: number | boolean) => {
    if (!localConfig) return;
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
  };

  const handleApplyConfig = () => {
    if (localConfig) {
      updateMutation.mutate(localConfig);
    }
  };

  const handleTogglePause = () => {
    if (config?.paused) {
      resumeMutation.mutate();
    } else {
      pauseMutation.mutate();
    }
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (configError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-error">Failed to connect to testnet service</p>
        <p className="text-sm text-muted-foreground">
          Ensure the testnet service is running
        </p>
      </div>
    );
  }

  const isRunning = !config?.paused;

  // Calculate total carrier weight for percentages
  const totalCarrierWeight =
    (localConfig?.weight_op_return || 0) +
    (localConfig?.weight_stamps || 0) +
    (localConfig?.weight_inscription || 0) +
    (localConfig?.weight_taproot_annex || 0) +
    (localConfig?.weight_witness_data || 0);

  const getCarrierPercentage = (weight: number) => {
    if (totalCarrierWeight === 0) return 0;
    return Math.round((weight / totalCarrierWeight) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Zap}
        iconColor="yellow"
        title="Testnet Generator"
        subtitle="Generate ANCHOR transactions on regtest for testing"
        actions={
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                isRunning
                  ? "bg-success/10 text-success"
                  : "bg-warning/10 text-warning"
              )}
            >
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  isRunning ? "bg-success animate-pulse" : "bg-warning"
                )}
              />
              {isRunning ? "Running" : "Paused"}
            </div>
            <ActionButton
              variant={isRunning ? "stop" : "start"}
              loading={pauseMutation.isPending || resumeMutation.isPending}
              onClick={handleTogglePause}
              label={isRunning ? "Pause" : "Resume"}
              icon={isRunning ? Pause : Play}
            />
          </div>
        }
      />

      {/* Stats Overview */}
      <Grid cols={{ default: 2, md: 4 }} gap="md">
        <StatCard
          icon={Activity}
          label="Total Messages"
          value={stats?.total_messages?.toLocaleString() || "0"}
          color="blue"
        />
        <StatCard
          icon={Box}
          label="Total Blocks"
          value={stats?.total_blocks?.toLocaleString() || "0"}
          color="orange"
        />
        <StatCard
          icon={Check}
          label="Successful"
          value={stats?.success_count?.toLocaleString() || "0"}
          color="emerald"
        />
        <StatCard
          icon={X}
          label="Errors"
          value={stats?.errors_count?.toLocaleString() || "0"}
          color="red"
        />
      </Grid>

      {/* Message Type Stats */}
      <Section>
        <SectionHeader
          icon={Layers}
          iconColor="primary"
          title="Message Statistics"
        />
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
          <MessageStat icon={MessageSquare} label="Text" value={stats?.text_count || 0} color="blue" />
          <MessageStat icon={Palette} label="Pixel" value={stats?.pixel_count || 0} color="purple" />
          <MessageStat icon={Image} label="Image" value={stats?.image_count || 0} color="pink" />
          <MessageStat icon={Map} label="Map" value={stats?.map_count || 0} color="green" />
          <MessageStat icon={Globe} label="DNS" value={stats?.dns_count || 0} color="cyan" />
          <MessageStat icon={Shield} label="Proof" value={stats?.proof_count || 0} color="yellow" />
          <MessageStat icon={Coins} label="Deploy" value={stats?.token_count || 0} color="orange" />
          <MessageStat icon={Coins} label="Mint" value={stats?.token_mint_count || 0} color="orange" />
          <MessageStat icon={Coins} label="Transfer" value={stats?.token_transfer_count || 0} color="orange" />
          <MessageStat icon={Coins} label="Burn" value={stats?.token_burn_count || 0} color="red" />
          <MessageStat icon={Eye} label="Oracle" value={stats?.oracle_count || 0} color="violet" />
          <MessageStat icon={Check} label="Attestation" value={stats?.oracle_attestation_count || 0} color="emerald" />
          <MessageStat icon={Zap} label="Dispute" value={stats?.oracle_dispute_count || 0} color="amber" />
          <MessageStat icon={Sparkles} label="Prediction" value={stats?.prediction_count || 0} color="rose" />
        </div>
      </Section>

      {/* Main Controls Grid */}
      <Grid cols={{ default: 1, lg: 3 }} gap="lg">
        {/* Timing Controls */}
        <Section>
          <SectionHeader
            icon={Timer}
            iconColor="primary"
            title="Timing"
          />

          <div className="space-y-6 mt-4">
            <SliderControl
              label="Min Interval"
              value={localConfig?.min_interval_secs || 3}
              min={1}
              max={60}
              unit="s"
              onChange={(v) => handleConfigChange("min_interval_secs", v)}
            />
            <SliderControl
              label="Max Interval"
              value={localConfig?.max_interval_secs || 10}
              min={1}
              max={120}
              unit="s"
              onChange={(v) => handleConfigChange("max_interval_secs", v)}
            />
            <SliderControl
              label="Blocks/Cycle"
              value={localConfig?.blocks_per_cycle || 1}
              min={1}
              max={10}
              unit=""
              onChange={(v) => handleConfigChange("blocks_per_cycle", v)}
            />
          </div>
        </Section>

        {/* Message Types */}
        <Section>
          <SectionHeader
            icon={Zap}
            iconColor="primary"
            title="Message Types"
          />

          <div className="grid grid-cols-3 gap-2 mt-4">
            <TypeToggle
              icon={MessageSquare}
              label="Text"
              checked={localConfig?.enable_text || false}
              onChange={(v) => handleConfigChange("enable_text", v)}
              color="blue"
            />
            <TypeToggle
              icon={Palette}
              label="Pixel"
              checked={localConfig?.enable_pixel || false}
              onChange={(v) => handleConfigChange("enable_pixel", v)}
              color="purple"
            />
            <TypeToggle
              icon={Image}
              label="Image"
              checked={localConfig?.enable_image || false}
              onChange={(v) => handleConfigChange("enable_image", v)}
              color="pink"
            />
            <TypeToggle
              icon={Map}
              label="Map"
              checked={localConfig?.enable_map || false}
              onChange={(v) => handleConfigChange("enable_map", v)}
              color="green"
            />
            <TypeToggle
              icon={Globe}
              label="DNS"
              checked={localConfig?.enable_dns || false}
              onChange={(v) => handleConfigChange("enable_dns", v)}
              color="cyan"
            />
            <TypeToggle
              icon={Shield}
              label="Proof"
              checked={localConfig?.enable_proof || false}
              onChange={(v) => handleConfigChange("enable_proof", v)}
              color="yellow"
            />
            <TypeToggle
              icon={Coins}
              label="Deploy"
              checked={localConfig?.enable_token || false}
              onChange={(v) => handleConfigChange("enable_token", v)}
              color="orange"
            />
            <TypeToggle
              icon={Coins}
              label="Mint"
              checked={localConfig?.enable_token_mint || false}
              onChange={(v) => handleConfigChange("enable_token_mint", v)}
              color="orange"
            />
            <TypeToggle
              icon={Coins}
              label="Transfer"
              checked={localConfig?.enable_token_transfer || false}
              onChange={(v) => handleConfigChange("enable_token_transfer", v)}
              color="orange"
            />
            <TypeToggle
              icon={Coins}
              label="Burn"
              checked={localConfig?.enable_token_burn || false}
              onChange={(v) => handleConfigChange("enable_token_burn", v)}
              color="red"
            />
            <TypeToggle
              icon={Eye}
              label="Oracle"
              checked={localConfig?.enable_oracle || false}
              onChange={(v) => handleConfigChange("enable_oracle", v)}
              color="violet"
            />
            <TypeToggle
              icon={Check}
              label="Attest"
              checked={localConfig?.enable_oracle_attestation || false}
              onChange={(v) => handleConfigChange("enable_oracle_attestation", v)}
              color="emerald"
            />
            <TypeToggle
              icon={Zap}
              label="Dispute"
              checked={localConfig?.enable_oracle_dispute || false}
              onChange={(v) => handleConfigChange("enable_oracle_dispute", v)}
              color="amber"
            />
            <TypeToggle
              icon={Sparkles}
              label="Predict"
              checked={localConfig?.enable_prediction || false}
              onChange={(v) => handleConfigChange("enable_prediction", v)}
              color="rose"
            />
          </div>
        </Section>

        {/* Carrier Distribution */}
        <Section>
          <div className="flex items-center justify-between">
            <SectionHeader
              icon={Box}
              iconColor="primary"
              title="Carriers"
            />
            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
              weights normalized
            </span>
          </div>

          <div className="space-y-4 mt-4">
            <CarrierBar
              label="OP_RETURN"
              emoji="📦"
              value={localConfig?.weight_op_return || 0}
              percentage={getCarrierPercentage(localConfig?.weight_op_return || 0)}
              onChange={(v) => handleConfigChange("weight_op_return", v)}
              color="orange"
            />
            <CarrierBar
              label="Stamps"
              emoji="📮"
              value={localConfig?.weight_stamps || 0}
              percentage={getCarrierPercentage(localConfig?.weight_stamps || 0)}
              onChange={(v) => handleConfigChange("weight_stamps", v)}
              color="green"
            />
            <CarrierBar
              label="Inscription"
              emoji="✍️"
              value={localConfig?.weight_inscription || 0}
              percentage={getCarrierPercentage(localConfig?.weight_inscription || 0)}
              onChange={(v) => handleConfigChange("weight_inscription", v)}
              color="purple"
            />
            <CarrierBar
              label="Taproot Annex"
              emoji="🌿"
              value={localConfig?.weight_taproot_annex || 0}
              percentage={getCarrierPercentage(localConfig?.weight_taproot_annex || 0)}
              onChange={(v) => handleConfigChange("weight_taproot_annex", v)}
              color="cyan"
            />
            <CarrierBar
              label="Witness Data"
              emoji="👁️"
              value={localConfig?.weight_witness_data || 0}
              percentage={getCarrierPercentage(localConfig?.weight_witness_data || 0)}
              onChange={(v) => handleConfigChange("weight_witness_data", v)}
              color="pink"
            />
          </div>
        </Section>
      </Grid>

      {/* Apply Button */}
      <div className="flex items-center justify-end gap-4">
        {saveStatus === "success" && (
          <div className="flex items-center gap-2 text-success animate-in fade-in">
            <Check className="w-5 h-5" />
            <span className="text-sm font-medium">Configuration saved!</span>
          </div>
        )}
        {saveStatus === "error" && (
          <div className="flex items-center gap-2 text-error animate-in fade-in">
            <X className="w-5 h-5" />
            <span className="text-sm font-medium">Failed to save</span>
          </div>
        )}
        <ActionButton
          variant="primary"
          loading={updateMutation.isPending}
          onClick={handleApplyConfig}
          icon={saveStatus === "success" ? Check : saveStatus === "error" ? X : RefreshCw}
          label={updateMutation.isPending ? "Saving..." : saveStatus === "success" ? "Saved!" : saveStatus === "error" ? "Try Again" : "Apply Configuration"}
        />
      </div>

      {/* Live Logs Section */}
      <LiveLogs />
    </div>
  );
}

// Compact Message Stat
function MessageStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "text-blue-400 bg-blue-500/10",
    purple: "text-purple-400 bg-purple-500/10",
    pink: "text-pink-400 bg-pink-500/10",
    green: "text-green-400 bg-green-500/10",
    cyan: "text-cyan-400 bg-cyan-500/10",
    yellow: "text-yellow-400 bg-yellow-500/10",
    orange: "text-orange-400 bg-orange-500/10",
    red: "text-red-400 bg-red-500/10",
    violet: "text-violet-400 bg-violet-500/10",
    rose: "text-rose-400 bg-rose-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
    amber: "text-amber-400 bg-amber-500/10",
  };

  return (
    <div className="text-center p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2", colors[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

// Slider Control
function SliderControl({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm font-bold text-primary tabular-nums">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

// Type Toggle Button
function TypeToggle({
  icon: Icon,
  label,
  checked,
  onChange,
  color,
}: {
  icon: React.ElementType;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  color: string;
}) {
  const colors: Record<string, { active: string; inactive: string }> = {
    blue: { active: "bg-blue-500/20 border-blue-500/50 text-blue-400", inactive: "bg-muted/50 border-border text-muted-foreground" },
    purple: { active: "bg-purple-500/20 border-purple-500/50 text-purple-400", inactive: "bg-muted/50 border-border text-muted-foreground" },
    pink: { active: "bg-pink-500/20 border-pink-500/50 text-pink-400", inactive: "bg-muted/50 border-border text-muted-foreground" },
    green: { active: "bg-green-500/20 border-green-500/50 text-green-400", inactive: "bg-muted/50 border-border text-muted-foreground" },
    cyan: { active: "bg-cyan-500/20 border-cyan-500/50 text-cyan-400", inactive: "bg-muted/50 border-border text-muted-foreground" },
    yellow: { active: "bg-yellow-500/20 border-yellow-500/50 text-yellow-400", inactive: "bg-muted/50 border-border text-muted-foreground" },
    orange: { active: "bg-orange-500/20 border-orange-500/50 text-orange-400", inactive: "bg-muted/50 border-border text-muted-foreground" },
    red: { active: "bg-red-500/20 border-red-500/50 text-red-400", inactive: "bg-muted/50 border-border text-muted-foreground" },
    violet: { active: "bg-violet-500/20 border-violet-500/50 text-violet-400", inactive: "bg-muted/50 border-border text-muted-foreground" },
    rose: { active: "bg-rose-500/20 border-rose-500/50 text-rose-400", inactive: "bg-muted/50 border-border text-muted-foreground" },
    emerald: { active: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400", inactive: "bg-muted/50 border-border text-muted-foreground" },
    amber: { active: "bg-amber-500/20 border-amber-500/50 text-amber-400", inactive: "bg-muted/50 border-border text-muted-foreground" },
  };

  const cfg = colors[color] || colors.blue;

  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "flex flex-col items-center justify-center p-3 rounded-xl border transition-all",
        checked ? cfg.active : cfg.inactive
      )}
    >
      <Icon className="w-5 h-5 mb-1" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

// Carrier Distribution Slider
function CarrierBar({
  label,
  emoji,
  value,
  percentage,
  onChange,
  color,
}: {
  label: string;
  emoji: string;
  value: number;
  percentage: number;
  onChange: (v: number) => void;
  color: string;
}) {
  const colorConfig: Record<string, { track: string; thumb: string; accent: string }> = {
    orange: { track: "bg-orange-500", thumb: "accent-orange-500", accent: "text-orange-400" },
    green: { track: "bg-green-500", thumb: "accent-green-500", accent: "text-green-400" },
    purple: { track: "bg-purple-500", thumb: "accent-purple-500", accent: "text-purple-400" },
    cyan: { track: "bg-cyan-500", thumb: "accent-cyan-500", accent: "text-cyan-400" },
    pink: { track: "bg-pink-500", thumb: "accent-pink-500", accent: "text-pink-400" },
  };

  const cfg = colorConfig[color] || colorConfig.orange;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("text-sm font-bold tabular-nums", cfg.accent)}>
            {percentage}%
          </span>
          <span className="text-xs text-muted-foreground tabular-nums w-6 text-right">
            {value}
          </span>
        </div>
      </div>
      <div className="relative">
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className={cn(
            "w-full h-2 rounded-full appearance-none cursor-pointer",
            "bg-muted",
            cfg.thumb,
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:w-4",
            "[&::-webkit-slider-thumb]:h-4",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:bg-white",
            "[&::-webkit-slider-thumb]:shadow-md",
            "[&::-webkit-slider-thumb]:cursor-grab",
            "[&::-webkit-slider-thumb]:active:cursor-grabbing",
            "[&::-webkit-slider-thumb]:transition-transform",
            "[&::-webkit-slider-thumb]:hover:scale-110",
            "[&::-moz-range-thumb]:w-4",
            "[&::-moz-range-thumb]:h-4",
            "[&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:bg-white",
            "[&::-moz-range-thumb]:border-0",
            "[&::-moz-range-thumb]:shadow-md",
            "[&::-moz-range-thumb]:cursor-grab"
          )}
          style={{
            background: `linear-gradient(to right, var(--${color}-500, ${getColorHex(color)}) ${value}%, var(--muted) ${value}%)`
          }}
        />
      </div>
    </div>
  );
}

// Helper to get color hex values
function getColorHex(color: string): string {
  const colors: Record<string, string> = {
    orange: "#f97316",
    green: "#22c55e",
    purple: "#a855f7",
    cyan: "#06b6d4",
    pink: "#ec4899",
  };
  return colors[color] || "#f97316";
}

// Live Logs Component
interface LogEntry {
  id: number;
  timestamp: number;
  level: string;
  message: string;
  message_type?: string;
  carrier?: string;
  txid?: string;
  cycle?: number;
}

const TESTNET_WS_URL = process.env.NEXT_PUBLIC_TESTNET_WS_URL || "ws://localhost:8002/ws";

function LiveLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;

      try {
        const ws = new WebSocket(TESTNET_WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === "Log") {
              setLogs((prev) => [...prev.slice(-99), data.data]);
            } else if (data.type === "LogBatch") {
              setLogs(data.data?.slice(-100) || []);
            }
          } catch {
            // Ignore parse errors
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setWsConnected(false);
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (isMounted) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (autoScroll && logsContainerRef.current && expanded) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll, expanded]);

  const getTypeEmoji = (type?: string) => {
    const emojis: Record<string, string> = {
      text: "📝",
      pixel: "🎨",
      image: "🖼️",
      map: "📍",
      dns: "🌐",
      proof: "📜",
      token: "🪙",
      tokenmint: "⛏️",
      tokentransfer: "➡️",
      tokenburn: "🔥",
      oracle: "🔮",
      prediction: "🎲",
    };
    return emojis[type?.toLowerCase() || ""] || "📨";
  };

  const getCarrierEmoji = (carrier?: string) => {
    const emojis: Record<string, string> = {
      op_return: "📦",
      stamps: "📮",
      inscription: "✍️",
      taproot_annex: "🌿",
      witness_data: "👁️",
    };
    return emojis[carrier || ""] || "";
  };

  const clearLogs = () => setLogs([]);

  return (
    <Section className="p-0 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b border-border cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Live Logs</h2>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                wsConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500"
              )}
            />
            <span className="text-xs text-muted-foreground">
              {wsConnected ? "Connected" : "Connecting..."}
            </span>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {logs.length} entries
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAutoScroll(!autoScroll);
            }}
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              autoScroll
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            Auto-scroll
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearLogs();
            }}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Logs Container */}
      {expanded && (
        <div
          ref={logsContainerRef}
          className="h-64 overflow-y-auto font-mono text-sm bg-black/30 p-4"
          onScroll={(e) => {
            const target = e.target as HTMLDivElement;
            const isAtBottom =
              target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
            if (!isAtBottom && autoScroll) {
              setAutoScroll(false);
            }
          }}
        >
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <Terminal className="w-8 h-8 opacity-50" />
              <span className="text-sm">Waiting for logs...</span>
              {!wsConnected && (
                <span className="text-xs">Connecting to WebSocket...</span>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, idx) => (
                <div
                  key={log.id || idx}
                  className="flex items-start gap-2 hover:bg-white/5 px-2 py-1 rounded text-xs"
                >
                  <span className="text-muted-foreground shrink-0 w-16 tabular-nums">
                    {new Date(log.timestamp * 1000).toLocaleTimeString()}
                  </span>
                  {log.cycle && (
                    <span className="text-muted-foreground shrink-0 w-8">
                      #{log.cycle}
                    </span>
                  )}
                  {log.message_type && (
                    <span className="shrink-0" title={log.message_type}>
                      {getTypeEmoji(log.message_type)}
                    </span>
                  )}
                  {log.carrier && (
                    <span className="shrink-0" title={log.carrier}>
                      {getCarrierEmoji(log.carrier)}
                    </span>
                  )}
                  <span className="text-foreground break-all flex-1">
                    {log.message}
                  </span>
                  {log.txid && (
                    <span className="text-cyan-400 shrink-0 font-mono">
                      {log.txid.slice(0, 8)}...
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Section>
  );
}
