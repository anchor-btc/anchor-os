"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTorStatus,
  enableTor,
  disableTor,
  newTorCircuit,
  startContainer,
  stopContainer,
  fetchContainers,
} from "@/lib/api";
import {
  Loader2,
  Shield,
  Globe,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Play,
  Square,
  RefreshCw,
  Copy,
  Zap,
  Server,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function TorPage() {
  const queryClient = useQueryClient();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [showAddresses, setShowAddresses] = useState(true);

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["tor-status"],
    queryFn: fetchTorStatus,
    refetchInterval: 5000,
  });

  const { data: containersData } = useQuery({
    queryKey: ["containers"],
    queryFn: fetchContainers,
    refetchInterval: 5000,
  });

  const TOR_CONTAINER = "anchor-networking-tor";

  const torContainer = containersData?.containers?.find(
    (c) => c.name === TOR_CONTAINER
  );
  const isContainerRunning = torContainer?.state === "running";

  const enableMutation = useMutation({
    mutationFn: enableTor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tor-status"] });
      queryClient.invalidateQueries({ queryKey: ["containers"] });
    },
  });

  const disableMutation = useMutation({
    mutationFn: disableTor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tor-status"] });
      queryClient.invalidateQueries({ queryKey: ["containers"] });
    },
  });

  const newCircuitMutation = useMutation({
    mutationFn: newTorCircuit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tor-status"] });
    },
  });

  const startMutation = useMutation({
    mutationFn: () => startContainer(TOR_CONTAINER),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      queryClient.invalidateQueries({ queryKey: ["tor-status"] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => stopContainer(TOR_CONTAINER),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      queryClient.invalidateQueries({ queryKey: ["tor-status"] });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(label);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isConnected = status?.circuit_established;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-500" />
            Tor Network
          </h1>
          <p className="text-muted-foreground mt-1">
            Privacy network for anonymous Bitcoin connections
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
                  Connected to Tor
                </span>
              ) : (
                <span className="flex items-center gap-2 text-sm text-warning">
                  <AlertCircle className="w-4 h-4" />
                  Establishing circuit...
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
              <Shield className="w-4 h-4" />
              Circuit
            </div>
            <div className={cn(
              "font-medium",
              isConnected ? "text-success" : "text-muted-foreground"
            )}>
              {isConnected ? "Established" : "Not ready"}
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Globe className="w-4 h-4" />
              Exit IP
            </div>
            <div className="font-medium font-mono text-foreground text-sm truncate">
              {status?.external_ip || "-"}
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Zap className="w-4 h-4" />
              Version
            </div>
            <div className="font-medium text-foreground truncate">
              {status?.tor_version || "-"}
            </div>
          </div>
        </div>

        {/* Info when connected */}
        {isConnected && (
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-purple-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-purple-400">Connected to Tor Network</p>
                <p className="text-sm text-purple-400/80 mt-1">
                  Your traffic is being routed through the Tor network. Your exit IP is{" "}
                  <code className="bg-purple-500/20 px-1.5 py-0.5 rounded font-mono">
                    {status?.external_ip}
                  </code>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Container Controls */}
        <div className="flex items-center gap-3 flex-wrap">
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
              onClick={() => newCircuitMutation.mutate()}
              disabled={newCircuitMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl transition-colors disabled:opacity-50"
            >
              {newCircuitMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              New Circuit
            </button>
          )}
        </div>

        {newCircuitMutation.isSuccess && (
          <div className="mt-4 bg-success/10 border border-success/20 text-success text-sm p-3 rounded-xl">
            {newCircuitMutation.data?.message}
          </div>
        )}
      </div>

      {/* Hidden Services */}
      {isContainerRunning && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-500" />
              Hidden Services (.onion)
            </h2>
            <button
              onClick={() => setShowAddresses(!showAddresses)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAddresses ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Show
                </>
              )}
            </button>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            These .onion addresses allow others to connect to your services privately through the Tor network.
          </p>

          <div className="space-y-4">
            {/* Bitcoin Node */}
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">Bitcoin Node</div>
                  <div className="text-sm text-muted-foreground">P2P connections (port 8333/18444)</div>
                </div>
                {status?.onion_addresses?.bitcoin ? (
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-foreground bg-muted px-2 py-1 rounded max-w-[200px] truncate">
                      {showAddresses ? status.onion_addresses.bitcoin : "••••••••••••••••.onion"}
                    </code>
                    <button
                      onClick={() => copyToClipboard(status.onion_addresses.bitcoin!, "bitcoin")}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title="Copy address"
                    >
                      {copiedAddress === "bitcoin" ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Not available yet</span>
                )}
              </div>
            </div>

            {/* Electrs */}
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">Electrum Server</div>
                  <div className="text-sm text-muted-foreground">Wallet connections (port 50001)</div>
                </div>
                {status?.onion_addresses?.electrs ? (
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-foreground bg-muted px-2 py-1 rounded max-w-[200px] truncate">
                      {showAddresses ? status.onion_addresses.electrs : "••••••••••••••••.onion"}
                    </code>
                    <button
                      onClick={() => copyToClipboard(status.onion_addresses.electrs!, "electrs")}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title="Copy address"
                    >
                      {copiedAddress === "electrs" ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Not available yet</span>
                )}
              </div>
            </div>

            {/* Dashboard */}
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">Dashboard</div>
                  <div className="text-sm text-muted-foreground">Web interface (port 80)</div>
                </div>
                {status?.onion_addresses?.dashboard ? (
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-foreground bg-muted px-2 py-1 rounded max-w-[200px] truncate">
                      {showAddresses ? status.onion_addresses.dashboard : "••••••••••••••••.onion"}
                    </code>
                    <button
                      onClick={() => copyToClipboard(status.onion_addresses.dashboard!, "dashboard")}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title="Copy address"
                    >
                      {copiedAddress === "dashboard" ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Not available yet</span>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Hidden service addresses are generated automatically and persist across restarts.
          </p>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-muted/30 border border-border rounded-2xl p-6">
        <h3 className="font-semibold text-foreground mb-3">About Tor</h3>
        <div className="text-sm text-muted-foreground space-y-3">
          <p>
            <strong>Tor (The Onion Router)</strong> is a privacy network that routes your traffic through 
            multiple encrypted relays, making it difficult to trace your connections.
          </p>
          <p>
            When enabled, your Bitcoin node can:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Connect to other nodes anonymously via the SOCKS5 proxy</li>
            <li>Accept incoming connections from other Tor users via hidden services</li>
            <li>Hide your real IP address from the Bitcoin network</li>
          </ul>
          <p className="mt-4">
            <strong>Hidden Services</strong> (.onion addresses) allow others to connect to your node 
            without knowing your real IP address.
          </p>
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <a
            href="https://www.torproject.org/about/history/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
          >
            Learn more about Tor
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
