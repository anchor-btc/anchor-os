"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Play,
  Pause,
  Settings,
  Activity,
  Zap,
  Box,
  Clock,
  BarChart3,
  RefreshCw,
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

export default function TestnetPage() {
  const queryClient = useQueryClient();
  const [localConfig, setLocalConfig] = useState<TestnetConfig | null>(null);

  const {
    data: config,
    isLoading: configLoading,
    error: configError,
  } = useQuery({
    queryKey: ["testnet-config"],
    queryFn: fetchTestnetConfig,
    refetchInterval: 5000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["testnet-stats"],
    queryFn: fetchTestnetStats,
    refetchInterval: 2000,
  });

  const updateMutation = useMutation({
    mutationFn: updateTestnetConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testnet-config"] });
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
        <p className="text-error">Failed to connect to Testnet service</p>
        <p className="text-sm text-muted-foreground">
          Make sure the testnet service is running on port 3014
        </p>
      </div>
    );
  }

  const isRunning = !config?.paused;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Testnet Control</h1>
          <p className="text-muted-foreground mt-1">
            Configure the ANCHOR testnet generator
          </p>
        </div>
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
          <button
            onClick={handleTogglePause}
            disabled={pauseMutation.isPending || resumeMutation.isPending}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              isRunning
                ? "bg-warning/10 text-warning hover:bg-warning/20"
                : "bg-success/10 text-success hover:bg-success/20"
            )}
          >
            {pauseMutation.isPending || resumeMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRunning ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isRunning ? "Pause" : "Resume"}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          label="Total Messages"
          value={stats?.total_messages || 0}
          icon={Activity}
          color="primary"
        />
        <StatCard
          label="Total Blocks"
          value={stats?.total_blocks || 0}
          icon={Box}
          color="orange"
        />
        <StatCard label="Text" value={stats?.text_count || 0} icon={Zap} color="blue" />
        <StatCard
          label="Pixel"
          value={stats?.pixel_count || 0}
          icon={Zap}
          color="purple"
        />
        <StatCard label="Image" value={stats?.image_count || 0} icon={Zap} color="pink" />
        <StatCard label="Map" value={stats?.map_count || 0} icon={Zap} color="green" />
        <StatCard label="DNS" value={stats?.dns_count || 0} icon={Zap} color="cyan" />
        <StatCard
          label="Proof"
          value={stats?.proof_count || 0}
          icon={Zap}
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timing Controls */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Timing</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Min Interval: {localConfig?.min_interval_secs || 0}s
              </label>
              <input
                type="range"
                min="1"
                max="60"
                value={localConfig?.min_interval_secs || 3}
                onChange={(e) =>
                  handleConfigChange("min_interval_secs", parseInt(e.target.value))
                }
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1s</span>
                <span>60s</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Max Interval: {localConfig?.max_interval_secs || 0}s
              </label>
              <input
                type="range"
                min="1"
                max="120"
                value={localConfig?.max_interval_secs || 10}
                onChange={(e) =>
                  handleConfigChange("max_interval_secs", parseInt(e.target.value))
                }
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1s</span>
                <span>120s</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Blocks per Cycle: {localConfig?.blocks_per_cycle || 0}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={localConfig?.blocks_per_cycle || 1}
                onChange={(e) =>
                  handleConfigChange("blocks_per_cycle", parseInt(e.target.value))
                }
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1</span>
                <span>10</span>
              </div>
            </div>
          </div>
        </div>

        {/* Message Types */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Message Types</h2>
          </div>

          <div className="space-y-4">
            <ToggleSwitch
              label="Text Messages"
              description="Basic text messages (Kind 1)"
              checked={localConfig?.enable_text || false}
              onChange={(v) => handleConfigChange("enable_text", v)}
            />
            <ToggleSwitch
              label="Pixel"
              description="Canvas pixels for Anchor Pixel (Kind 2)"
              checked={localConfig?.enable_pixel || false}
              onChange={(v) => handleConfigChange("enable_pixel", v)}
            />
            <ToggleSwitch
              label="Images"
              description="PNG image messages (Kind 4)"
              checked={localConfig?.enable_image || false}
              onChange={(v) => handleConfigChange("enable_image", v)}
            />
            <ToggleSwitch
              label="Map Markers"
              description="Geo markers for Anchor Map (Kind 5)"
              checked={localConfig?.enable_map || false}
              onChange={(v) => handleConfigChange("enable_map", v)}
            />
            <ToggleSwitch
              label="DNS Records"
              description="Domain records for Anchor DNS (Kind 10)"
              checked={localConfig?.enable_dns || false}
              onChange={(v) => handleConfigChange("enable_dns", v)}
            />
            <ToggleSwitch
              label="Proofs"
              description="Proof of existence for Anchor Proof (Kind 11)"
              checked={localConfig?.enable_proof || false}
              onChange={(v) => handleConfigChange("enable_proof", v)}
            />
          </div>
        </div>
      </div>

      {/* Carrier Weights */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Carrier Distribution</h2>
          <span className="text-xs text-muted-foreground">
            (weights are normalized automatically)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <CarrierSlider
            label="OP_RETURN"
            icon="📦"
            value={localConfig?.weight_op_return || 0}
            onChange={(v) => handleConfigChange("weight_op_return", v)}
          />
          <CarrierSlider
            label="Stamps"
            icon="📮"
            value={localConfig?.weight_stamps || 0}
            onChange={(v) => handleConfigChange("weight_stamps", v)}
          />
          <CarrierSlider
            label="Inscription"
            icon="✍️"
            value={localConfig?.weight_inscription || 0}
            onChange={(v) => handleConfigChange("weight_inscription", v)}
          />
          <CarrierSlider
            label="Taproot Annex"
            icon="🌿"
            value={localConfig?.weight_taproot_annex || 0}
            onChange={(v) => handleConfigChange("weight_taproot_annex", v)}
          />
          <CarrierSlider
            label="Witness Data"
            icon="👁️"
            value={localConfig?.weight_witness_data || 0}
            onChange={(v) => handleConfigChange("weight_witness_data", v)}
          />
        </div>
      </div>

      {/* Apply Button */}
      <div className="flex justify-end">
        <button
          onClick={handleApplyConfig}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Apply Configuration
        </button>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    orange: "bg-orange-500/10 text-orange-500",
    blue: "bg-blue-500/10 text-blue-500",
    purple: "bg-purple-500/10 text-purple-500",
    pink: "bg-pink-500/10 text-pink-500",
    green: "bg-green-500/10 text-green-500",
    cyan: "bg-cyan-500/10 text-cyan-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", colorClasses[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// Toggle Switch Component
function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
            checked && "translate-x-5"
          )}
        />
      </button>
    </div>
  );
}

// Carrier Slider Component
function CarrierSlider({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span>{icon}</span>
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="ml-auto text-sm text-muted-foreground">{value}</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
      />
    </div>
  );
}
