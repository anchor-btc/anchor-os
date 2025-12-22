"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  MapPin,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Map,
  Filter,
  MessageCircle,
} from "lucide-react";
import { Header } from "@/components";
import {
  fetchMyMarkersForAddresses,
  fetchWalletAddresses,
  formatDate,
  getExplorerTxUrl,
  CATEGORIES,
  type Marker,
} from "@/lib/api";

const CATEGORY_COLORS: Record<number, string> = {
  0: "#FF6B35",
  1: "#3B82F6",
  2: "#10B981",
  3: "#8B5CF6",
  4: "#EF4444",
  5: "#F59E0B",
};

export default function MyPlacesPage() {
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);

  // Fetch all wallet addresses
  const { data: walletAddresses, isLoading: isLoadingAddresses } = useQuery({
    queryKey: ["wallet-addresses"],
    queryFn: fetchWalletAddresses,
  });

  // Fetch my markers for all addresses
  const { data: markers, isLoading: isLoadingMarkers } = useQuery({
    queryKey: ["my-markers", walletAddresses, categoryFilter],
    queryFn: () =>
      walletAddresses && walletAddresses.length > 0
        ? fetchMyMarkersForAddresses(
            walletAddresses,
            categoryFilter ?? undefined,
            500
          )
        : Promise.resolve([]),
    enabled: !!walletAddresses && walletAddresses.length > 0,
  });

  const isLoading = isLoadingAddresses || isLoadingMarkers;
  const addressCount = walletAddresses?.length || 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-secondary-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Map
        </Link>

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading text-foreground flex items-center gap-3">
              <MapPin className="w-7 h-7 text-primary" />
              My Places
            </h1>
            <p className="text-secondary-foreground text-sm mt-1">
              Markers you&apos;ve created on Bitcoin
            </p>
          </div>

          {addressCount > 0 && (
            <div className="text-xs text-secondary-foreground bg-map-bg border border-map-border rounded-lg px-3 py-2">
              <span className="text-foreground/60">Scanning:</span>{" "}
              <span className="font-mono">{addressCount} addresses</span>
            </div>
          )}
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-secondary-foreground shrink-0" />
          <button
            onClick={() => setCategoryFilter(null)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
              categoryFilter === null
                ? "bg-primary text-white"
                : "bg-map-bg border border-map-border text-secondary-foreground hover:border-primary/50"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all flex items-center gap-1.5 ${
                categoryFilter === cat.id
                  ? "text-white"
                  : "bg-map-bg border border-map-border text-secondary-foreground hover:border-primary/50"
              }`}
              style={
                categoryFilter === cat.id
                  ? { backgroundColor: cat.color }
                  : undefined
              }
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              {cat.name}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !walletAddresses || walletAddresses.length === 0 ? (
          <div className="text-center py-20">
            <MapPin className="w-16 h-16 text-secondary-foreground mx-auto mb-4 opacity-30" />
            <h2 className="text-xl font-medium text-foreground mb-2">
              Wallet Not Connected
            </h2>
            <p className="text-secondary-foreground">
              Unable to fetch wallet addresses
            </p>
          </div>
        ) : markers && markers.length === 0 ? (
          <div className="text-center py-20">
            <MapPin className="w-16 h-16 text-secondary-foreground mx-auto mb-4 opacity-30" />
            <h2 className="text-xl font-medium text-foreground mb-2">
              No Places Yet
            </h2>
            <p className="text-secondary-foreground mb-6">
              You haven&apos;t created any markers yet
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              <Map className="w-4 h-4" />
              Go to Map
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Stats */}
            <div className="text-sm text-secondary-foreground mb-4">
              {markers?.length} marker{markers?.length !== 1 ? "s" : ""} found
            </div>

            {/* Markers list */}
            {markers?.map((marker) => (
              <MarkerCard key={`${marker.txid}-${marker.vout}`} marker={marker} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function MarkerCard({ marker }: { marker: Marker }) {
  const categoryColor = CATEGORY_COLORS[marker.category.id] || "#FF6B35";

  return (
    <div className="bg-secondary border border-map-border rounded-xl p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3">
        {/* Category icon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: categoryColor }}
        >
          <MapPin className="w-5 h-5 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Message */}
          <p className="text-foreground mb-2">{marker.message}</p>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary-foreground">
            {/* Category */}
            <span
              className="px-2 py-0.5 rounded-full text-white text-[10px] uppercase tracking-wide"
              style={{ backgroundColor: categoryColor }}
            >
              {marker.category.name}
            </span>

            {/* Coordinates */}
            <span>
              {marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}
            </span>

            {/* Date */}
            <span>{formatDate(marker.created_at)}</span>

            {/* Replies */}
            {marker.reply_count > 0 && (
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {marker.reply_count}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          <Link
            href={`/?marker=${marker.txid}&vout=${marker.vout}`}
            className="p-2 text-secondary-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
            title="View on map"
          >
            <Map className="w-4 h-4" />
          </Link>
          <a
            href={getExplorerTxUrl(marker.txid)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-secondary-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
            title="View transaction"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

