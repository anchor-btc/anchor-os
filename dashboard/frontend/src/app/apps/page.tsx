"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchContainers } from "@/lib/api";
import { apps } from "@/lib/apps";
import { AppCard } from "@/components/app-card";
import { InfraCard } from "@/components/infra-card";
import { LogsModal } from "@/components/logs-modal";
import { Loader2, Sparkles, Server, Settings } from "lucide-react";
import Link from "next/link";

export default function AppsPage() {
  const [logsContainer, setLogsContainer] = useState<string | null>(null);

  const {
    data: containersData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["containers"],
    queryFn: fetchContainers,
    refetchInterval: 3000,
  });

  const containers = containersData?.containers || [];

  const featuredApps = apps.filter((app) => app.category === "app" && app.featured);
  const otherApps = apps.filter((app) => app.category === "app" && !app.featured);
  const infrastructureApps = apps.filter((app) => app.category === "infrastructure");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Apps</h1>
            <p className="text-muted-foreground mt-1">
              Manage your Bitcoin applications
            </p>
          </div>
          <Link
            href="/services"
            className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            Advanced
          </Link>
        </div>

        {/* Featured Apps */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Featured Apps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                containers={containers}
                onToggle={() => refetch()}
                onShowLogs={(name) => setLogsContainer(name)}
                featured
              />
            ))}
          </div>
        </section>

        {/* Other Apps */}
        {otherApps.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Server className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground">Tools</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherApps.map((app) => (
                <AppCard
                  key={app.id}
                  app={app}
                  containers={containers}
                  onToggle={() => refetch()}
                  onShowLogs={(name) => setLogsContainer(name)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Infrastructure */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Infrastructure</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              Core services
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {infrastructureApps.map((app) => (
              <InfraCard
                key={app.id}
                app={app}
                containers={containers}
                onToggle={() => refetch()}
                onShowLogs={(name) => setLogsContainer(name)}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Logs Modal */}
      <LogsModal
        containerName={logsContainer}
        onClose={() => setLogsContainer(null)}
      />
    </>
  );
}
