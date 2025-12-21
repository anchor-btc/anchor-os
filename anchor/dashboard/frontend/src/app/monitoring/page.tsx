"use client";

import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Activity, Loader2 } from "lucide-react";
import { fetchContainers } from "@/lib/api";
import { IframeView } from "@/components/iframe-view";

export default function MonitoringPage() {
  const { t } = useTranslation();

  const { data: containersData, isLoading } = useQuery({
    queryKey: ["containers"],
    queryFn: fetchContainers,
    refetchInterval: 10000,
  });

  const containers = containersData?.containers || [];
  const netdataContainer = containers.find(
    (c) => c.name === "anchor-monitoring-netdata"
  );
  const isRunning = netdataContainer?.state === "running";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isRunning) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Activity className="w-7 h-7 text-green-500" />
            {t("monitoring.title")}
          </h1>
          <p className="text-muted-foreground">{t("monitoring.notRunning")}</p>
        </div>

        {/* Not running message */}
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {t("monitoring.notRunningMsg")}
          </h2>
          <p className="text-muted-foreground mb-4">
            {t("monitoring.startWith")}:{" "}
            <code className="bg-muted px-2 py-1 rounded">
              docker compose up -d monitoring-netdata
            </code>
          </p>
        </div>
      </div>
    );
  }

  // Use the IframeView component with browser-like layout
  return <IframeView appId="monitoring-netdata" />;
}





