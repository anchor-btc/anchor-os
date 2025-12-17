"use client";

import { WalletWidget } from "@/components/wallet-widget";
import { NodeStats } from "@/components/node-stats";
import { RecentTransactions } from "@/components/recent-transactions";
import { ResourceCharts } from "@/components/resource-charts";
import { QuickLaunch } from "@/components/quick-launch";
import { IndexerStatsWidget } from "@/components/indexer-stats";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your Anchor Bitcoin stack
        </p>
      </div>

      {/* Quick Launch - iPhone style icons */}
      <QuickLaunch />

      {/* Resource Monitor */}
      <ResourceCharts />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <WalletWidget />
          <RecentTransactions />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <NodeStats />
          <IndexerStatsWidget />
        </div>
      </div>
    </div>
  );
}
