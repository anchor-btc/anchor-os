"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchStats } from "@/lib/api";
import {
  Loader2,
  BarChart3,
  MessageSquare,
  Anchor,
  Link2,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Box,
} from "lucide-react";

export default function StatsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Failed to load statistics</p>
      </div>
    );
  }

  const resolvedPercent = stats.total_anchors > 0
    ? ((stats.resolved_anchors / stats.total_anchors) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Protocol Statistics</h1>
      </div>

      {/* Message Stats */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-muted-foreground">
          Messages
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={<MessageSquare className="h-6 w-6" />}
            label="Total Messages"
            value={stats.total_messages}
            color="primary"
          />
          <StatCard
            icon={<Anchor className="h-6 w-6" />}
            label="Thread Roots"
            value={stats.total_roots}
            color="primary"
          />
          <StatCard
            icon={<MessageSquare className="h-6 w-6" />}
            label="Replies"
            value={stats.total_replies}
            color="primary"
          />
        </div>
      </section>

      {/* Anchor Stats */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-muted-foreground">
          Anchors
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Link2 className="h-6 w-6" />}
            label="Total Anchors"
            value={stats.total_anchors}
            color="primary"
          />
          <StatCard
            icon={<CheckCircle className="h-6 w-6" />}
            label="Resolved"
            value={stats.resolved_anchors}
            sublabel={`${resolvedPercent}%`}
            color="green"
          />
          <StatCard
            icon={<HelpCircle className="h-6 w-6" />}
            label="Orphan"
            value={stats.orphan_anchors}
            sublabel="Parent not found"
            color="yellow"
          />
          <StatCard
            icon={<AlertTriangle className="h-6 w-6" />}
            label="Ambiguous"
            value={stats.ambiguous_anchors}
            sublabel="Multiple matches"
            color="yellow"
          />
        </div>
      </section>

      {/* Indexer Stats */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-muted-foreground">
          Indexer
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            icon={<Box className="h-6 w-6" />}
            label="Last Indexed Block"
            value={stats.last_block_height}
            color="primary"
          />
        </div>
      </section>

      {/* Protocol Info */}
      <section className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">About ANCHOR Protocol</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground mb-2">Message Format</h3>
            <ul className="space-y-1">
              <li>• Magic bytes: 0xA11C0001</li>
              <li>• Kind: 1 byte (0=generic, 1=text, etc.)</li>
              <li>• Anchor count: 1 byte (0-255)</li>
              <li>• Each anchor: 9 bytes (8 prefix + 1 vout)</li>
              <li>• Body: Variable length</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-2">
              Anchor Resolution
            </h3>
            <ul className="space-y-1">
              <li>• Uses 64-bit txid prefix for compact references</li>
              <li>• Collision probability: ~1 in 37M at 1M messages</li>
              <li>• Orphan: Parent transaction not found</li>
              <li>• Ambiguous: Multiple txids match prefix</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  sublabel?: string;
  color: "primary" | "green" | "yellow";
}

function StatCard({ icon, label, value, sublabel, color }: StatCardProps) {
  const colorClasses = {
    primary: "text-primary",
    green: "text-green-500",
    yellow: "text-yellow-500",
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className={`${colorClasses[color]} mb-3`}>{icon}</div>
      <p className="text-3xl font-bold text-foreground mb-1">
        {value.toLocaleString()}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {sublabel && (
        <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
      )}
    </div>
  );
}

