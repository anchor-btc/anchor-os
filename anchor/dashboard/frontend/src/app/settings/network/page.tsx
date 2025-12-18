"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTorStatus,
  enableTor,
  disableTor,
  fetchContainers,
  startContainer,
  stopContainer,
} from "@/lib/api";
import {
  Loader2,
  Shield,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Server,
  Wifi,
  Bitcoin,
  Database,
  Eye,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function NetworkSettingsPage() {
  const queryClient = useQueryClient();

  const { data: torStatus, isLoading: torLoading } = useQuery({
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
  const isTorRunning = torContainer?.state === "running";
  const isTorConnected = torStatus?.circuit_established;

  const startTorMutation = useMutation({
    mutationFn: () => startContainer(TOR_CONTAINER),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      queryClient.invalidateQueries({ queryKey: ["tor-status"] });
    },
  });

  const stopTorMutation = useMutation({
    mutationFn: () => stopContainer(TOR_CONTAINER),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      queryClient.invalidateQueries({ queryKey: ["tor-status"] });
    },
  });

  const handleTorToggle = () => {
    if (isTorRunning) {
      stopTorMutation.mutate();
    } else {
      startTorMutation.mutate();
    }
  };

  if (torLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">Network Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure network privacy and connectivity options for your Anchor stack.
        </p>
      </div>

      {/* Tor Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10">
              <Shield className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Tor Network</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Route Bitcoin traffic through the Tor network for enhanced privacy.
              </p>
            </div>
          </div>
          <button
            onClick={handleTorToggle}
            disabled={startTorMutation.isPending || stopTorMutation.isPending}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              isTorRunning ? "bg-purple-500" : "bg-muted",
              (startTorMutation.isPending || stopTorMutation.isPending) && "opacity-50"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                isTorRunning ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>

        {/* Tor Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Server className="w-4 h-4" />
              Container Status
            </div>
            <div className={cn(
              "font-medium flex items-center gap-2",
              isTorRunning ? "text-success" : "text-muted-foreground"
            )}>
              {isTorRunning ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Running
                </>
              ) : (
                "Stopped"
              )}
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Wifi className="w-4 h-4" />
              Circuit Status
            </div>
            <div className={cn(
              "font-medium flex items-center gap-2",
              isTorConnected ? "text-success" : "text-muted-foreground"
            )}>
              {isTorConnected ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Connected
                </>
              ) : isTorRunning ? (
                "Establishing..."
              ) : (
                "Disabled"
              )}
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Globe className="w-4 h-4" />
              Exit IP
            </div>
            <div className="font-medium font-mono text-foreground">
              {torStatus?.external_ip || "-"}
            </div>
          </div>
        </div>

        {/* Tor Features */}
        {isTorRunning && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Enabled Features</h4>
            
            <div className="space-y-3">
              {/* Bitcoin Proxy */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Bitcoin className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium text-foreground">Bitcoin Core Proxy</div>
                    <div className="text-xs text-muted-foreground">Route outgoing connections through Tor</div>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">
                  Available
                </span>
              </div>

              {/* Hidden Services */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-purple-500" />
                  <div>
                    <div className="text-sm font-medium text-foreground">Hidden Services</div>
                    <div className="text-xs text-muted-foreground">Accept connections via .onion addresses</div>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">
                  {torStatus?.onion_addresses?.bitcoin ? "Active" : "Initializing"}
                </span>
              </div>

              {/* Electrs */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="text-sm font-medium text-foreground">Electrs Hidden Service</div>
                    <div className="text-xs text-muted-foreground">Allow wallet connections via Tor</div>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">
                  {torStatus?.onion_addresses?.electrs ? "Active" : "Initializing"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Warning for Tor Only mode */}
        {isTorRunning && (
          <div className="mt-6 bg-warning/10 border border-warning/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning">Privacy Notice</p>
                <p className="text-sm text-warning/80 mt-1">
                  Using Tor provides enhanced privacy but may slow down initial blockchain sync. 
                  For fastest sync, disable Tor temporarily during initial setup.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Link to full Tor page */}
        <div className="mt-6 pt-6 border-t border-border">
          <Link
            href="/tor"
            className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            <Link2 className="w-4 h-4" />
            View full Tor configuration and hidden services
          </Link>
        </div>
      </div>

      {/* Bitcoin Network Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-xl bg-primary/10">
            <Bitcoin className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Bitcoin Network</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Current network configuration for Bitcoin Core.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Network Mode</div>
            <div className="font-medium text-foreground">Regtest</div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">RPC Port</div>
            <div className="font-medium font-mono text-foreground">18443</div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">P2P Port</div>
            <div className="font-medium font-mono text-foreground">18444</div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Tor Proxy</div>
            <div className="font-medium text-foreground">
              {isTorRunning ? "networking-tor:9050" : "Disabled"}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Network configuration is set in docker-compose.yml. Changing networks requires rebuilding containers.
        </p>
      </div>

      {/* Other Networking Options */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Other Networking Options</h3>
        
        <div className="space-y-3">
          <Link
            href="/tailscale"
            className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Wifi className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="font-medium text-foreground">Tailscale VPN</div>
                <div className="text-sm text-muted-foreground">Private network access via Tailscale</div>
              </div>
            </div>
            <Link2 className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>

          <Link
            href="/cloudflare"
            className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Globe className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <div className="font-medium text-foreground">Cloudflare Tunnel</div>
                <div className="text-sm text-muted-foreground">Expose services via Cloudflare</div>
              </div>
            </div>
            <Link2 className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}
