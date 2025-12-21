"use client";

import { useState, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchMarkers, type Marker } from "@/lib/api";
import { CategoryBadge } from "./category-filter";
import { debounce } from "@/lib/utils";

interface SearchBoxProps {
  onMarkerSelect: (marker: Marker) => void;
  categoryFilter: number | null;
}

export function SearchBox({ onMarkerSelect, categoryFilter }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Debounce the search query
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetQuery = useCallback(
    debounce((value: string) => setDebouncedQuery(value), 300),
    []
  );

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", debouncedQuery, categoryFilter],
    queryFn: () => searchMarkers(debouncedQuery, categoryFilter ?? undefined, 20),
    enabled: debouncedQuery.length >= 2,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSetQuery(value);
    setIsOpen(value.length >= 2);
  };

  const handleClear = () => {
    setQuery("");
    setDebouncedQuery("");
    setIsOpen(false);
  };

  const handleSelect = (marker: Marker) => {
    onMarkerSelect(marker);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative bg-secondary/90 backdrop-blur-sm rounded-xl border border-map-border p-1.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground" />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => query.length >= 2 && setIsOpen(true)}
            placeholder="Search markers..."
            className="w-full pl-10 pr-10 py-2 bg-map-bg rounded-lg text-sm text-foreground placeholder:text-secondary-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Results dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-secondary border border-map-border rounded-xl shadow-xl overflow-hidden z-[1100] max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : results && results.length > 0 ? (
            <div className="divide-y divide-map-border">
              {results.map((marker) => (
                <button
                  key={`${marker.txid}-${marker.vout}`}
                  onClick={() => handleSelect(marker)}
                  className="w-full px-4 py-3 text-left hover:bg-map-bg transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-foreground line-clamp-2">
                      {marker.message}
                    </p>
                    <CategoryBadge category={marker.category} />
                  </div>
                  <p className="text-xs text-secondary-foreground mt-1">
                    {marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}
                  </p>
                </button>
              ))}
            </div>
          ) : debouncedQuery.length >= 2 ? (
            <div className="py-8 text-center text-secondary-foreground">
              No markers found
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

