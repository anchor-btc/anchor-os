"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchContainers } from "@/lib/api";
import { apps, getAppStatus } from "@/lib/apps";
import { WalletWidget } from "@/components/wallet-widget";
import { NodeStats } from "@/components/node-stats";
import { RecentTransactions } from "@/components/recent-transactions";
import { Loader2, Server, CheckCircle2, XCircle, AppWindow, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const {
    data: containersData,
    isLoading,
  } = useQuery({
    queryKey: ["containers"],
    queryFn: fetchContainers,
    refetchInterval: 5000,
  });

  const containers = containersData?.containers || [];
  const runningCount = containers.filter((c) => c.state === "running").length;
  const stoppedCount = containers.filter((c) => c.state !== "running").length;

  // Get app statuses
  const featuredApps = apps.filter((app) => app.category === "app" && app.featured);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your Anchor Bitcoin stack
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Server className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold font-tabular text-foreground">
                {containers.length}
              </p>
              <p className="text-sm text-muted-foreground">Total Services</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold font-tabular text-success">
                {runningCount}
              </p>
              <p className="text-sm text-muted-foreground">Running</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-error" />
            </div>
            <div>
              <p className="text-2xl font-bold font-tabular text-error">
                {stoppedCount}
              </p>
              <p className="text-sm text-muted-foreground">Stopped</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <WalletWidget />
          <NodeStats />
          <RecentTransactions />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Apps Quick View */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AppWindow className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Apps</h2>
              </div>
              <Link
                href="/apps"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Manage all
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {featuredApps.map((app) => {
                  const status = getAppStatus(
                    app.containers,
                    containers.map((c) => ({ name: c.name, state: c.state }))
                  );
                  const isRunning = status === "running";

                  return (
                    <div
                      key={app.id}
                      className={cn(
                        "flex items-center justify-between p-4 bg-card border rounded-xl transition-colors",
                        isRunning ? "border-success/30" : "border-border"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-3 h-3 rounded-full",
                            isRunning ? "bg-success" : "bg-muted-foreground/30"
                          )}
                        />
                        <div>
                          <p className="font-medium text-foreground">{app.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {isRunning ? `Port ${app.port}` : "Stopped"}
                          </p>
                        </div>
                      </div>
                      {app.url && isRunning && (
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

