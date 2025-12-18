"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Network, AlertTriangle, Loader2, Check } from "lucide-react";

const DASHBOARD_BACKEND_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_BACKEND_URL || "http://localhost:8010";

type BitcoinNetwork = "mainnet" | "testnet" | "signet" | "regtest";

interface NetworkInfo {
  network: BitcoinNetwork;
  chain: string;
  blocks: number;
  connections: number;
}

export default function NetworkPage() {
  const { t } = useTranslation();

  const NETWORKS: { id: BitcoinNetwork; nameKey: string; descKey: string }[] = [
    {
      id: "mainnet",
      nameKey: "networkSettings.networks.mainnet",
      descKey: "networkSettings.networks.mainnetDesc",
    },
    {
      id: "testnet",
      nameKey: "networkSettings.networks.testnet",
      descKey: "networkSettings.networks.testnetDesc",
    },
    {
      id: "signet",
      nameKey: "networkSettings.networks.signet",
      descKey: "networkSettings.networks.signetDesc",
    },
    {
      id: "regtest",
      nameKey: "networkSettings.networks.regtest",
      descKey: "networkSettings.networks.regtestDesc",
    },
  ];

  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNetwork, setSelectedNetwork] =
    useState<BitcoinNetwork>("regtest");

  useEffect(() => {
    fetchNetworkInfo();
  }, []);

  const fetchNetworkInfo = async () => {
    try {
      const res = await fetch(`${DASHBOARD_BACKEND_URL}/bitcoin/info`);
      if (res.ok) {
        const data = await res.json();
        setNetworkInfo({
          network: data.chain as BitcoinNetwork,
          chain: data.chain,
          blocks: data.blocks,
          connections: data.connections || 0,
        });
        setSelectedNetwork(data.chain as BitcoinNetwork);
      }
    } catch {
      // Ignore errors
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Network Status */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Network className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {t("networkSettings.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("networkSettings.description")}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : networkInfo ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-secondary/50 rounded-lg">
              <div className="text-sm text-muted-foreground">
                {t("node.chain")}
              </div>
              <div className="text-lg font-semibold text-foreground capitalize">
                {networkInfo.chain}
              </div>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg">
              <div className="text-sm text-muted-foreground">
                {t("networkSettings.blocks")}
              </div>
              <div className="text-lg font-semibold text-foreground">
                {networkInfo.blocks.toLocaleString()}
              </div>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg">
              <div className="text-sm text-muted-foreground">
                {t("networkSettings.connections")}
              </div>
              <div className="text-lg font-semibold text-foreground">
                {networkInfo.connections}
              </div>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg">
              <div className="text-sm text-muted-foreground">
                {t("networkSettings.status")}
              </div>
              <div className="text-lg font-semibold text-success flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-success" />
                {t("networkSettings.connected")}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
            {t("networkSettings.disconnected")}
          </div>
        )}
      </div>

      {/* Network Selection */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-foreground mb-4">
          {t("networkSettings.selectNetwork")}
        </h3>

        <div className="space-y-3">
          {NETWORKS.map((network) => (
            <button
              key={network.id}
              onClick={() => setSelectedNetwork(network.id)}
              className={`
                w-full flex items-center justify-between p-4 rounded-lg border transition-colors text-left
                ${
                  selectedNetwork === network.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-secondary/50"
                }
              `}
            >
              <div>
                <div className="font-medium text-foreground">
                  {t(network.nameKey)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t(network.descKey)}
                </div>
              </div>
              {selectedNetwork === network.id && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Warning */}
        <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg flex gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-foreground">
              {t("networkSettings.changeWarning")}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t("networkSettings.changeWarningDesc")}
            </p>
          </div>
        </div>
      </div>

      {/* Node Configuration */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-foreground mb-4">
          {t("networkSettings.nodeConfig")}
        </h3>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            <span className="font-medium text-foreground">RPC Host:</span>{" "}
            core-bitcoin:18443
          </p>
          <p>
            <span className="font-medium text-foreground">RPC User:</span> anchor
          </p>
          <p>
            <span className="font-medium text-foreground">Data Directory:</span>{" "}
            /data/bitcoin
          </p>
        </div>
      </div>
    </div>
  );
}
