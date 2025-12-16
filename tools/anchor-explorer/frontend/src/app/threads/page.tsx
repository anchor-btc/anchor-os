"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchRootsFiltered, type Message, type FilterOptions, CARRIER_INFO } from "@/lib/api";
import { MessageCard } from "@/components/message-card";
import Link from "next/link";
import {
  Loader2,
  Anchor,
  MessageSquare,
  RefreshCw,
  ArrowLeft,
  Plus,
  Filter,
  X,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "replies", label: "Most Replies" },
  { value: "size", label: "Largest Size" },
];

const KIND_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "0", label: "Generic" },
  { value: "1", label: "Text" },
  { value: "2", label: "State" },
  { value: "3", label: "Vote" },
  { value: "4", label: "Image" },
];

const CARRIER_OPTIONS = [
  { value: "", label: "All Carriers" },
  { value: "0", label: "📤 OP_RETURN" },
  { value: "1", label: "🖼️ Inscription" },
  { value: "2", label: "📍 Stamps" },
  { value: "3", label: "🔗 Taproot Annex" },
  { value: "4", label: "👁️ Witness Data" },
];

export default function ThreadsPage() {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [tempFilters, setTempFilters] = useState<FilterOptions>({});
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  // Calculate active filter count
  useEffect(() => {
    let count = 0;
    if (filters.txid) count++;
    if (filters.block_height !== undefined || filters.block_min !== undefined || filters.block_max !== undefined) count++;
    if (filters.kind !== undefined) count++;
    if (filters.carrier !== undefined) count++;
    if (filters.text) count++;
    if (filters.from_date || filters.to_date) count++;
    if (filters.min_size !== undefined || filters.max_size !== undefined) count++;
    if (filters.min_replies !== undefined) count++;
    if (filters.sort && filters.sort !== "newest") count++;
    setActiveFilterCount(count);
  }, [filters]);

  // Infinite query for filtered roots
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["roots-filtered", filters],
    queryFn: ({ pageParam = 1 }) => fetchRootsFiltered(pageParam, 20, filters),
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.total_pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  // Flatten and deduplicate messages
  const allMessages = data?.pages.flatMap((page) => page.data) ?? [];
  const messages = allMessages.reduce<Message[]>((acc, msg) => {
    const key = `${msg.txid}:${msg.vout}`;
    if (!acc.some((m) => `${m.txid}:${m.vout}` === key)) {
      acc.push(msg);
    }
    return acc;
  }, []);

  // Sort if not using API sort
  const sortedMessages = filters.sort ? messages : [...messages].sort((a, b) => {
    const heightA = a.block_height ?? Infinity;
    const heightB = b.block_height ?? Infinity;
    if (heightA === heightB) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return heightB - heightA;
  });

  // Intersection observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "100px",
      threshold: 0,
    });

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [handleObserver]);

  const totalMessages = data?.pages[0]?.total ?? 0;

  const applyFilters = () => {
    setFilters(tempFilters);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({});
    setTempFilters({});
  };

  const updateTempFilter = (key: keyof FilterOptions, value: string | number | undefined) => {
    setTempFilters((prev) => ({
      ...prev,
      [key]: value === "" ? undefined : value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-orange-500" />
              All Threads
            </h1>
            <p className="text-sm text-gray-500">
              {totalMessages.toLocaleString()} {activeFilterCount > 0 ? "matching" : "total"} threads
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setTempFilters(filters);
              setShowFilters(!showFilters);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
              showFilters || activeFilterCount > 0
                ? "bg-orange-100 text-orange-700 border border-orange-300"
                : "text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/compose"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Thread
          </Link>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-orange-500" />
              Advanced Filters
            </h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Search Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Text
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search message content..."
                  value={tempFilters.text || ""}
                  onChange={(e) => updateTempFilter("text", e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                />
              </div>
            </div>

            {/* Transaction ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction ID
              </label>
              <input
                type="text"
                placeholder="Full or partial txid..."
                value={tempFilters.txid || ""}
                onChange={(e) => updateTempFilter("txid", e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none font-mono text-sm"
              />
            </div>

            {/* Message Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Type
              </label>
              <select
                value={tempFilters.kind?.toString() || ""}
                onChange={(e) => updateTempFilter("kind", e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white"
              >
                {KIND_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Carrier Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Carrier Type
              </label>
              <select
                value={tempFilters.carrier?.toString() || ""}
                onChange={(e) => updateTempFilter("carrier", e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white"
              >
                {CARRIER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Block Height Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Block Height Range
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={tempFilters.block_min || ""}
                  onChange={(e) => updateTempFilter("block_min", e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={tempFilters.block_max || ""}
                  onChange={(e) => updateTempFilter("block_max", e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                />
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={tempFilters.from_date?.slice(0, 16) || ""}
                  onChange={(e) => updateTempFilter("from_date", e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                  className="w-1/2 px-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                />
                <input
                  type="datetime-local"
                  value={tempFilters.to_date?.slice(0, 16) || ""}
                  onChange={(e) => updateTempFilter("to_date", e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                  className="w-1/2 px-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                />
              </div>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort Order
              </label>
              <select
                value={tempFilters.sort || "newest"}
                onChange={(e) => updateTempFilter("sort", e.target.value as FilterOptions["sort"])}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Body Size Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Body Size (bytes)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={tempFilters.min_size || ""}
                  onChange={(e) => updateTempFilter("min_size", e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={tempFilters.max_size || ""}
                  onChange={(e) => updateTempFilter("max_size", e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                />
              </div>
            </div>

            {/* Min Replies */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Replies
              </label>
              <input
                type="number"
                placeholder="0"
                min="0"
                value={tempFilters.min_replies || ""}
                onChange={(e) => updateTempFilter("min_replies", e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear all filters
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={applyFilters}
                className="px-6 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && !showFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">Active filters:</span>
          {filters.text && (
            <FilterTag label={`Text: "${filters.text}"`} onRemove={() => setFilters({ ...filters, text: undefined })} />
          )}
          {filters.txid && (
            <FilterTag label={`TXID: ${filters.txid.slice(0, 12)}...`} onRemove={() => setFilters({ ...filters, txid: undefined })} />
          )}
          {filters.kind !== undefined && (
            <FilterTag label={`Type: ${KIND_OPTIONS.find((k) => k.value === filters.kind?.toString())?.label}`} onRemove={() => setFilters({ ...filters, kind: undefined })} />
          )}
          {filters.carrier !== undefined && (
            <FilterTag label={`Carrier: ${CARRIER_OPTIONS.find((c) => c.value === filters.carrier?.toString())?.label}`} onRemove={() => setFilters({ ...filters, carrier: undefined })} />
          )}
          {(filters.block_min !== undefined || filters.block_max !== undefined) && (
            <FilterTag 
              label={`Block: ${filters.block_min || "0"} - ${filters.block_max || "∞"}`} 
              onRemove={() => setFilters({ ...filters, block_min: undefined, block_max: undefined })} 
            />
          )}
          {(filters.from_date || filters.to_date) && (
            <FilterTag label="Date range" onRemove={() => setFilters({ ...filters, from_date: undefined, to_date: undefined })} />
          )}
          {filters.sort && filters.sort !== "newest" && (
            <FilterTag label={`Sort: ${SORT_OPTIONS.find((s) => s.value === filters.sort)?.label}`} onRemove={() => setFilters({ ...filters, sort: undefined })} />
          )}
          <button
            onClick={clearFilters}
            className="text-xs text-orange-600 hover:text-orange-700 ml-2"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Threads list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : sortedMessages.length > 0 ? (
        <div className="space-y-4">
          {sortedMessages.map((message) => (
            <MessageCard key={`${message.txid}-${message.vout}`} message={message} />
          ))}

          {/* Load more trigger */}
          <div ref={loadMoreRef} className="py-6 flex justify-center">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading more threads...</span>
              </div>
            ) : hasNextPage ? (
              <button
                onClick={() => fetchNextPage()}
                className="px-6 py-3 text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
              >
                Load more threads
              </button>
            ) : (
              <div className="text-center">
                <Anchor className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {activeFilterCount > 0 ? "No more matching threads" : "You've reached the beginning ⚓"}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100">
          <Anchor className="h-16 w-16 text-orange-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">
            {activeFilterCount > 0 ? "No matching threads" : "No threads yet"}
          </h3>
          <p className="text-gray-500 mb-6">
            {activeFilterCount > 0
              ? "Try adjusting your filters to find more results."
              : "Be the first to create an ANCHOR thread on the network."}
          </p>
          {activeFilterCount > 0 ? (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </button>
          ) : (
            <Link
              href="/compose"
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create First Thread
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
      {label}
      <button onClick={onRemove} className="hover:text-orange-900">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
