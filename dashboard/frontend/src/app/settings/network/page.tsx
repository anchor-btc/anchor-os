"use client";

import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTorStatus,
  fetchContainers,
  startContainer,
  stopContainer,
  fetchElectrumStatus,
  setDefaultElectrumServer,
  ElectrumServer,
  fetchExplorerSettings,
  setDefaultExplorer,
  BlockExplorer,
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
  Zap,
  Layers,
  Star,
  Compass,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function NetworkSettingsPage() {
  const { t } = useTranslation();
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

  const { data: electrumStatus, isLoading: electrumLoading } = useQuery({
    queryKey: ["electrum-status"],
    queryFn: fetchElectrumStatus,
    refetchInterval: 5000,
  });

  const { data: explorerSettings, isLoading: explorerLoading } = useQuery({
    queryKey: ["explorer-settings"],
    queryFn: fetchExplorerSettings,
    refetchInterval: 5000,
  });

  const setDefaultMutation = useMutation({
    mutationFn: (server: ElectrumServer) => setDefaultElectrumServer(server),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["electrum-status"] });
    },
  });

  const setDefaultExplorerMutation = useMutation({
    mutationFn: (explorer: BlockExplorer) => setDefaultExplorer(explorer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["explorer-settings"] });
    },
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

  const electrsInfo = electrumStatus?.electrs;
  const fulcrumInfo = electrumStatus?.fulcrum;
  const defaultElectrum = electrumStatus?.default_server || "electrs";

  const defaultExplorer = explorerSettings?.default_explorer || "mempool";

  // No global loading - each section handles its own loading state

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">{t("networkPage.title", "Network Settings")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("networkPage.description", "Configure network privacy and connectivity options for your Anchor stack.")}
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
              <h3 className="text-lg font-semibold text-foreground">{t("networkPage.tor.title", "Tor Network")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("networkPage.tor.description", "Route Bitcoin traffic through the Tor network for enhanced privacy.")}
              </p>
            </div>
          </div>
          {torLoading ? (
            <div className="w-11 h-6 bg-muted rounded-full animate-pulse" />
          ) : (
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
          )}
        </div>

        {/* Tor Status */}
        {torLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">{t("networkPage.tor.loading", "Checking Tor status...")}</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Server className="w-4 h-4" />
                  {t("networkPage.tor.containerStatus", "Container Status")}
                </div>
                <div className={cn(
                  "font-medium flex items-center gap-2",
                  isTorRunning ? "text-success" : "text-muted-foreground"
                )}>
                  {isTorRunning ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      {t("networkPage.tor.running", "Running")}
                    </>
                  ) : (
                    t("networkPage.tor.stopped", "Stopped")
                  )}
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Wifi className="w-4 h-4" />
                  {t("networkPage.tor.circuitStatus", "Circuit Status")}
                </div>
                <div className={cn(
                  "font-medium flex items-center gap-2",
                  isTorConnected ? "text-success" : "text-muted-foreground"
                )}>
                  {isTorConnected ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      {t("networkPage.tor.connected", "Connected")}
                    </>
                  ) : isTorRunning ? (
                    t("networkPage.tor.establishing", "Establishing...")
                  ) : (
                    t("networkPage.tor.disabled", "Disabled")
                  )}
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Globe className="w-4 h-4" />
                  {t("networkPage.tor.exitIp", "Exit IP")}
                </div>
                <div className="font-medium font-mono text-foreground">
                  {torStatus?.external_ip || "-"}
                </div>
              </div>
            </div>

            {/* Tor Features */}
            {isTorRunning && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground">{t("networkPage.tor.enabledFeatures", "Enabled Features")}</h4>
                
                <div className="space-y-3">
                  {/* Bitcoin Proxy */}
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Bitcoin className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-sm font-medium text-foreground">{t("networkPage.tor.bitcoinProxy", "Bitcoin Core Proxy")}</div>
                        <div className="text-xs text-muted-foreground">{t("networkPage.tor.bitcoinProxyDesc", "Route outgoing connections through Tor")}</div>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">
                      {t("networkPage.tor.available", "Available")}
                    </span>
                  </div>

                  {/* Hidden Services */}
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Eye className="w-5 h-5 text-purple-500" />
                      <div>
                        <div className="text-sm font-medium text-foreground">{t("networkPage.tor.hiddenServices", "Hidden Services")}</div>
                        <div className="text-xs text-muted-foreground">{t("networkPage.tor.hiddenServicesDesc", "Accept connections via .onion addresses")}</div>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">
                      {torStatus?.onion_addresses?.bitcoin ? t("networkPage.tor.active", "Active") : t("networkPage.tor.initializing", "Initializing")}
                    </span>
                  </div>

                  {/* Electrs */}
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-blue-500" />
                      <div>
                        <div className="text-sm font-medium text-foreground">{t("networkPage.tor.electrsHidden", "Electrs Hidden Service")}</div>
                        <div className="text-xs text-muted-foreground">{t("networkPage.tor.electrsHiddenDesc", "Allow wallet connections via Tor")}</div>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">
                      {torStatus?.onion_addresses?.electrs ? t("networkPage.tor.active", "Active") : t("networkPage.tor.initializing", "Initializing")}
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
                    <p className="text-sm font-medium text-warning">{t("networkPage.tor.privacyNotice", "Privacy Notice")}</p>
                    <p className="text-sm text-warning/80 mt-1">
                      {t("networkPage.tor.privacyNoticeDesc", "Using Tor provides enhanced privacy but may slow down initial blockchain sync. For fastest sync, disable Tor temporarily during initial setup.")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Link to full Tor page */}
        <div className="mt-6 pt-6 border-t border-border">
          <Link
            href="/tor"
            className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            <Link2 className="w-4 h-4" />
            {t("networkPage.tor.viewFullConfig", "View full Tor configuration and hidden services")}
          </Link>
        </div>
      </div>

      {/* Electrum Server Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-xl bg-yellow-500/10">
            <Zap className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{t("networkPage.electrum.title", "Electrum Server")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("networkPage.electrum.description", "Choose which Electrum server dependent services should use.")}
            </p>
          </div>
        </div>

        {electrumLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-lg border-2 border-border bg-muted/20 animate-pulse h-24" />
            <div className="p-4 rounded-lg border-2 border-border bg-muted/20 animate-pulse h-24" />
          </div>
        ) : (
          <>
            {/* Server Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Electrs Option */}
              <button
                onClick={() => setDefaultMutation.mutate("electrs")}
                disabled={setDefaultMutation.isPending || electrsInfo?.status !== "running"}
                className={cn(
                  "relative p-4 rounded-lg border-2 text-left transition-all",
                  defaultElectrum === "electrs"
                    ? "bg-yellow-500/10 border-yellow-500"
                    : electrsInfo?.status === "running"
                      ? "bg-muted/30 border-border hover:border-muted-foreground"
                      : "bg-muted/20 border-border opacity-60 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-3">
                  <Zap className={cn(
                    "w-5 h-5",
                    defaultElectrum === "electrs" ? "text-yellow-500" : "text-muted-foreground"
                  )} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">Electrs</span>
                      {defaultElectrum === "electrs" && (
                        <Star className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    <span className={cn(
                      "text-xs",
                      electrsInfo?.status === "running" ? "text-success" : "text-muted-foreground"
                    )}>
                      {electrsInfo?.status || "stopped"} • Port 50001
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("networkPage.electrum.electrsDesc", "Lightweight, fast sync")}
                </p>
              </button>

              {/* Fulcrum Option */}
              <button
                onClick={() => setDefaultMutation.mutate("fulcrum")}
                disabled={setDefaultMutation.isPending || fulcrumInfo?.status !== "running"}
                className={cn(
                  "relative p-4 rounded-lg border-2 text-left transition-all",
                  defaultElectrum === "fulcrum"
                    ? "bg-emerald-500/10 border-emerald-500"
                    : fulcrumInfo?.status === "running"
                      ? "bg-muted/30 border-border hover:border-muted-foreground"
                      : "bg-muted/20 border-border opacity-60 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-3">
                  <Layers className={cn(
                    "w-5 h-5",
                    defaultElectrum === "fulcrum" ? "text-emerald-500" : "text-muted-foreground"
                  )} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">Fulcrum</span>
                      {defaultElectrum === "fulcrum" && (
                        <Star className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                    <span className={cn(
                      "text-xs",
                      fulcrumInfo?.status === "running" ? "text-success" : "text-muted-foreground"
                    )}>
                      {fulcrumInfo?.status || "stopped"} • Port 50002
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("networkPage.electrum.fulcrumDesc", "High-performance, more features")}
                </p>
              </button>
            </div>

            {setDefaultMutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("networkPage.electrum.switching", "Restarting dependent services...")}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-2">
              {t("networkPage.electrum.note", "Changing the default server will restart Mempool and BTC RPC Explorer.")}
            </p>
          </>
        )}

        {/* Link to full Electrum page */}
        <div className="mt-4 pt-4 border-t border-border">
          <Link
            href="/electrum"
            className="flex items-center gap-2 text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            <Link2 className="w-4 h-4" />
            {t("networkPage.electrum.viewFull", "Manage both servers and view logs")}
          </Link>
        </div>
      </div>

      {/* Block Explorer Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-xl bg-blue-500/10">
            <Compass className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{t("networkPage.explorer.title", "Block Explorer")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("networkPage.explorer.description", "Choose the default block explorer for viewing transactions.")}
            </p>
          </div>
        </div>

        {explorerLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-lg border-2 border-border bg-muted/20 animate-pulse h-20" />
            <div className="p-4 rounded-lg border-2 border-border bg-muted/20 animate-pulse h-20" />
          </div>
        ) : (
          <>
            {/* Explorer Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {explorerSettings?.explorers.map((explorer) => (
                <button
                  key={explorer.explorer}
                  onClick={() => setDefaultExplorerMutation.mutate(explorer.explorer)}
                  disabled={setDefaultExplorerMutation.isPending}
                  className={cn(
                    "relative p-4 rounded-lg border-2 text-left transition-all",
                    explorer.is_default
                      ? "bg-blue-500/10 border-blue-500"
                      : explorer.status === "running"
                        ? "bg-muted/30 border-border hover:border-muted-foreground"
                        : "bg-muted/20 border-border opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <ExternalLink className={cn(
                      "w-5 h-5",
                      explorer.is_default ? "text-blue-500" : "text-muted-foreground"
                    )} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{explorer.name}</span>
                        {explorer.is_default && (
                          <Star className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <span className={cn(
                        "text-xs",
                        explorer.status === "running" ? "text-success" : "text-muted-foreground"
                      )}>
                        {explorer.status || "stopped"} • Port {explorer.port}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {setDefaultExplorerMutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("networkPage.explorer.saving", "Saving preference...")}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-2">
              {t("networkPage.explorer.note", "Apps will use this explorer for transaction and address links.")}
            </p>
          </>
        )}
      </div>

      {/* Bitcoin Network Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-xl bg-primary/10">
            <Bitcoin className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{t("networkPage.bitcoin.title", "Bitcoin Network")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("networkPage.bitcoin.description", "Current network configuration for Bitcoin Core.")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">{t("networkPage.bitcoin.networkMode", "Network Mode")}</div>
            <div className="font-medium text-foreground">Regtest</div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">{t("networkPage.bitcoin.rpcPort", "RPC Port")}</div>
            <div className="font-medium font-mono text-foreground">18443</div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">{t("networkPage.bitcoin.p2pPort", "P2P Port")}</div>
            <div className="font-medium font-mono text-foreground">18444</div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">{t("networkPage.bitcoin.torProxy", "Tor Proxy")}</div>
            <div className="font-medium text-foreground">
              {isTorRunning ? "networking-tor:9050" : t("networkPage.tor.disabled", "Disabled")}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          {t("networkPage.bitcoin.configNote", "Network configuration is set in docker-compose.yml. Changing networks requires rebuilding containers.")}
        </p>
      </div>

      {/* Other Networking Options */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">{t("networkPage.other.title", "Other Networking Options")}</h3>
        
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
                <div className="font-medium text-foreground">{t("networkPage.other.tailscale", "Tailscale VPN")}</div>
                <div className="text-sm text-muted-foreground">{t("networkPage.other.tailscaleDesc", "Private network access via Tailscale")}</div>
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
                <div className="font-medium text-foreground">{t("networkPage.other.cloudflare", "Cloudflare Tunnel")}</div>
                <div className="text-sm text-muted-foreground">{t("networkPage.other.cloudflareDesc", "Expose services via Cloudflare")}</div>
              </div>
            </div>
            <Link2 className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}
