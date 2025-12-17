"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTailscaleStatus,
  connectTailscale,
  disconnectTailscale,
  startContainer,
  stopContainer,
  fetchContainers,
} from "@/lib/api";
import {
  Loader2,
  Network,
  Wifi,
  WifiOff,
  Key,
  Server,
  Globe,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Play,
  Square,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function TailscalePage() {
  const queryClient = useQueryClient();
  const [authKey, setAuthKey] = useState("");
  const [hostname, setHostname] = useState("anchor-stack");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advertiseRoutes, setAdvertiseRoutes] = useState("");

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["tailscale-status"],
    queryFn: fetchTailscaleStatus,
    refetchInterval: 5000,
  });

  const { data: containersData } = useQuery({
    queryKey: ["containers"],
    queryFn: fetchContainers,
    refetchInterval: 5000,
  });

  const TAILSCALE_CONTAINER = "anchor-networking-tailscale";
  
  const tailscaleContainer = containersData?.containers?.find(
    (c) => c.name === TAILSCALE_CONTAINER
  );
  const isContainerRunning = tailscaleContainer?.state === "running";

  const connectMutation = useMutation({
    mutationFn: connectTailscale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tailscale-status"] });
      setAuthKey("");
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectTailscale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tailscale-status"] });
    },
  });

  const startMutation = useMutation({
    mutationFn: () => startContainer(TAILSCALE_CONTAINER),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      queryClient.invalidateQueries({ queryKey: ["tailscale-status"] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => stopContainer(TAILSCALE_CONTAINER),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      queryClient.invalidateQueries({ queryKey: ["tailscale-status"] });
    },
  });

  const handleConnect = () => {
    if (!authKey.trim()) return;
    connectMutation.mutate({
      auth_key: authKey,
      hostname: hostname || undefined,
      advertise_routes: advertiseRoutes || undefined,
    });
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isConnected = status?.logged_in && status?.backend_state === "Running";

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Network className="w-8 h-8 text-blue-500" />
            Tailscale VPN
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect your Anchor stack to your Tailscale network
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          title="Refresh status"
        >
          <RefreshCw className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Status Card */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Connection Status</h2>
          <div className="flex items-center gap-2">
            {isContainerRunning ? (
              isConnected ? (
                <span className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-2 text-sm text-warning">
                  <AlertCircle className="w-4 h-4" />
                  Not logged in
                </span>
              )
            ) : (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="w-4 h-4" />
                Container stopped
              </span>
            )}
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Server className="w-4 h-4" />
              Container
            </div>
            <div className={cn(
              "font-medium",
              isContainerRunning ? "text-success" : "text-muted-foreground"
            )}>
              {isContainerRunning ? "Running" : "Stopped"}
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Wifi className="w-4 h-4" />
              Status
            </div>
            <div className={cn(
              "font-medium",
              isConnected ? "text-success" : "text-muted-foreground"
            )}>
              {status?.backend_state || "Unknown"}
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Globe className="w-4 h-4" />
              IP Address
            </div>
            <div className="font-medium font-mono text-foreground">
              {status?.ip_address || "-"}
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Network className="w-4 h-4" />
              Tailnet
            </div>
            <div className="font-medium text-foreground truncate">
              {status?.tailnet || "-"}
            </div>
          </div>
        </div>

        {/* Info when connected */}
        {isConnected && status?.hostname && (
          <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
              <div>
                <p className="text-sm font-medium text-success">Connected to Tailscale</p>
                <p className="text-sm text-success/80 mt-1">
                  Your Anchor stack is accessible at{" "}
                  <code className="bg-success/20 px-1.5 py-0.5 rounded font-mono">
                    {status.hostname}.{status.tailnet}
                  </code>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Container Controls */}
        <div className="flex items-center gap-3">
          {isContainerRunning ? (
            <button
              onClick={() => stopMutation.mutate()}
              disabled={stopMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-error/10 hover:bg-error/20 text-error rounded-xl transition-colors disabled:opacity-50"
            >
              {stopMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              Stop Container
            </button>
          ) : (
            <button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-success/10 hover:bg-success/20 text-success rounded-xl transition-colors disabled:opacity-50"
            >
              {startMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Start Container
            </button>
          )}

          {isConnected && (
            <button
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-xl transition-colors disabled:opacity-50"
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Connect Form */}
      {isContainerRunning && !isConnected && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-500" />
            Connect to Tailscale
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Auth Key
              </label>
              <input
                type="password"
                value={authKey}
                onChange={(e) => setAuthKey(e.target.value)}
                placeholder="tskey-auth-..."
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Generate an auth key at{" "}
                <a
                  href="https://login.tailscale.com/admin/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline inline-flex items-center gap-1"
                >
                  Tailscale Admin Console
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Hostname
              </label>
              <input
                type="text"
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                placeholder="anchor-stack"
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                The hostname for this machine on your tailnet
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAdvanced ? "Hide" : "Show"} advanced options
            </button>

            {showAdvanced && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Advertise Routes (optional)
                </label>
                <input
                  type="text"
                  value={advertiseRoutes}
                  onChange={(e) => setAdvertiseRoutes(e.target.value)}
                  placeholder="192.168.1.0/24,10.0.0.0/8"
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Comma-separated list of routes to advertise to your tailnet
                </p>
              </div>
            )}

            {connectMutation.isError && (
              <div className="bg-error/10 border border-error/20 text-error text-sm p-3 rounded-xl">
                Failed to connect. Please check your auth key and try again.
              </div>
            )}

            {connectMutation.data && !connectMutation.data.success && (
              <div className="bg-error/10 border border-error/20 text-error text-sm p-3 rounded-xl">
                {connectMutation.data.message}
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={!authKey.trim() || connectMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4" />
                  Connect to Tailscale
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-muted/30 border border-border rounded-2xl p-6">
        <h3 className="font-semibold text-foreground mb-3">How to use Tailscale</h3>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Create a Tailscale account at <a href="https://tailscale.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">tailscale.com</a></li>
          <li>Go to the <a href="https://login.tailscale.com/admin/settings/keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Admin Console</a> and generate an auth key</li>
          <li>For persistent connections, create a reusable auth key</li>
          <li>Paste the auth key above and click Connect</li>
          <li>Your Anchor stack will be accessible from any device on your tailnet</li>
        </ol>
      </div>
    </div>
  );
}

