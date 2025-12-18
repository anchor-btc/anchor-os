"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCloudflareStatus,
  connectCloudflare,
  disconnectCloudflare,
  fetchExposableServices,
} from "@/lib/api";
import {
  Loader2,
  Cloud,
  CloudOff,
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
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function CloudflarePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["cloudflare-status"],
    queryFn: fetchCloudflareStatus,
    refetchInterval: 5000,
  });

  const { data: servicesData } = useQuery({
    queryKey: ["cloudflare-services"],
    queryFn: fetchExposableServices,
  });

  const connectMutation = useMutation({
    mutationFn: connectCloudflare,
    onSuccess: (data) => {
      if (data.success) {
        setToken("");
      }
      queryClient.invalidateQueries({ queryKey: ["cloudflare-status"] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectCloudflare,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloudflare-status"] });
    },
  });

  const handleConnect = () => {
    if (!token.trim()) return;
    connectMutation.mutate({ token });
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isConnected = status?.running && status?.connected;
  const isRunning = status?.running;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Cloud className="w-8 h-8 text-orange-500" />
            {t("cloudflare.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("cloudflare.subtitle")}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          title={t("common.refresh")}
        >
          <RefreshCw className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Status Card */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">{t("cloudflare.connectionStatus")}</h2>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <span className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="w-4 h-4" />
                {t("cloudflare.connected")}
              </span>
            ) : isRunning ? (
              <span className="flex items-center gap-2 text-sm text-warning">
                <AlertCircle className="w-4 h-4" />
                {t("cloudflare.connecting")}
              </span>
            ) : (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="w-4 h-4" />
                {t("cloudflare.notRunning")}
              </span>
            )}
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Server className="w-4 h-4" />
              {t("cloudflare.container")}
            </div>
            <div className={cn(
              "font-medium",
              isRunning ? "text-success" : "text-muted-foreground"
            )}>
              {isRunning ? t("cloudflare.running") : t("cloudflare.stopped")}
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Cloud className="w-4 h-4" />
              {t("cloudflare.tunnel")}
            </div>
            <div className={cn(
              "font-medium",
              isConnected ? "text-success" : "text-muted-foreground"
            )}>
              {isConnected ? t("cloudflare.connected") : isRunning ? t("cloudflare.connecting") : t("cloudflare.disconnected")}
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Globe className="w-4 h-4" />
              {t("cloudflare.status")}
            </div>
            <div className="font-medium text-foreground text-sm">
              {status?.container_status || "-"}
            </div>
          </div>
        </div>

        {/* Info when connected */}
        {isConnected && (
          <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
              <div>
                <p className="text-sm font-medium text-success">{t("cloudflare.tunnelConnected")}</p>
                <p className="text-sm text-success/80 mt-1">
                  {status?.tunnel_info || t("cloudflare.tunnelInfo")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Container Controls */}
        <div className="flex items-center gap-3">
          {isRunning ? (
            <button
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-error/10 hover:bg-error/20 text-error rounded-xl transition-colors disabled:opacity-50"
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {t("cloudflare.stopTunnel")}
            </button>
          ) : null}
        </div>
      </div>

      {/* Connect Form */}
      {!isRunning && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-orange-500" />
            {t("cloudflare.connectToCloudflare")}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("cloudflare.tunnelToken")}
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="eyJhIjoiNz..."
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {t("cloudflare.getToken")}{" "}
                <a
                  href="https://one.dash.cloudflare.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:underline inline-flex items-center gap-1"
                >
                  {t("cloudflare.zeroTrustDashboard")}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>

            {connectMutation.isError && (
              <div className="bg-error/10 border border-error/20 text-error text-sm p-3 rounded-xl">
                {t("cloudflare.connectError")}
              </div>
            )}

            {connectMutation.data && !connectMutation.data.success && (
              <div className="bg-error/10 border border-error/20 text-error text-sm p-3 rounded-xl">
                {connectMutation.data.message}
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={!token.trim() || connectMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("cloudflare.connecting")}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  {t("cloudflare.startTunnel")}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Available Services */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-muted-foreground" />
          {t("cloudflare.availableServices")}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t("cloudflare.configureHostnames")}{" "}
          <a
            href="https://one.dash.cloudflare.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-500 hover:underline"
          >
            {t("cloudflare.cloudflareDashboard")}
          </a>
          . {t("cloudflare.useInternalUrls")}
        </p>

        <div className="space-y-3">
          {servicesData?.services.map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
            >
              <div>
                <div className="font-medium text-foreground">{service.name}</div>
                <div className="text-xs text-muted-foreground">{service.description}</div>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                  {service.local_url}
                </code>
                <button
                  onClick={() => copyToClipboard(service.local_url, service.name)}
                  className="p-1.5 hover:bg-muted rounded transition-colors"
                  title={t("cloudflare.copyUrl")}
                >
                  {copied === service.name ? (
                    <Check className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-muted/30 border border-border rounded-2xl p-6">
        <h3 className="font-semibold text-foreground mb-3">{t("cloudflare.howToUse")}</h3>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>{t("cloudflare.step1")} <a href="https://one.dash.cloudflare.com/" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">{t("cloudflare.zeroTrustDashboard")}</a></li>
          <li>{t("cloudflare.step2")}</li>
          <li>{t("cloudflare.step3")}</li>
          <li>{t("cloudflare.step4")}</li>
          <li>{t("cloudflare.step5")}</li>
          <li>{t("cloudflare.step6")}</li>
        </ol>
      </div>
    </div>
  );
}
