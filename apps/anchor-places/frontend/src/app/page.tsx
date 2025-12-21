"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Header,
  MarkerPopup,
  CreateMarkerPanel,
  CategoryFilter,
  SearchBox,
} from "@/components";
import type { Marker } from "@/lib/api";
import type { PendingMarker } from "@/components/map";

// Dynamically import map to avoid SSR issues with Leaflet
const MapComponent = dynamic(
  () => import("@/components/map").then((mod) => mod.MapComponent),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-map-bg flex items-center justify-center">
        <div className="text-secondary-foreground">Loading map...</div>
      </div>
    ),
  }
);

export default function Home() {
  // State
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [flyToMarker, setFlyToMarker] = useState<Marker | null>(null);
  const [pendingMarkers, setPendingMarkers] = useState<PendingMarker[]>([]);
  const [createMarkerPosition, setCreateMarkerPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Handlers
  const handleMarkerClick = useCallback((marker: Marker) => {
    setSelectedMarker(marker);
  }, []);

  const handleCreateMarker = useCallback((lat: number, lng: number) => {
    setCreateMarkerPosition({ lat, lng });
  }, []);

  const handleMarkerSearchSelect = useCallback((marker: Marker) => {
    setFlyToMarker(marker);
    // Reset flyToMarker after animation
    setTimeout(() => setFlyToMarker(null), 2000);
  }, []);

  const handlePendingMarker = useCallback((txid: string, lat: number, lng: number, categoryId: number) => {
    setPendingMarkers(prev => [...prev, { txid, latitude: lat, longitude: lng, categoryId }]);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    // Remove the pending marker after confirmation
    setPendingMarkers([]);
    setCreateMarkerPosition(null);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />

      {/* Main content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Map */}
        <MapComponent
          categoryFilter={categoryFilter}
          onMarkerClick={handleMarkerClick}
          onCreateMarker={handleCreateMarker}
          flyToMarker={flyToMarker}
          pendingMarkers={pendingMarkers}
        />

        {/* Controls overlay */}
        <div className="absolute top-4 left-4 right-4 z-[1000] pointer-events-none">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-0 pointer-events-auto max-w-4xl">
            {/* Search box */}
            <div className="w-full md:w-72 md:mr-3">
              <SearchBox
                onMarkerSelect={handleMarkerSearchSelect}
                categoryFilter={categoryFilter}
              />
            </div>

            {/* Category filter */}
            <CategoryFilter
              selectedCategory={categoryFilter}
              onCategoryChange={setCategoryFilter}
            />
          </div>
        </div>
      </div>

      {/* Marker popup modal */}
      {selectedMarker && (
        <MarkerPopup
          marker={selectedMarker}
          onClose={() => setSelectedMarker(null)}
        />
      )}

      {/* Create marker panel */}
      {createMarkerPosition && (
        <CreateMarkerPanel
          latitude={createMarkerPosition.lat}
          longitude={createMarkerPosition.lng}
          onClose={() => setCreateMarkerPosition(null)}
          onSuccess={handleCreateSuccess}
          onPending={handlePendingMarker}
        />
      )}

      {/* Footer */}
      <div className="h-8 bg-secondary/80 border-t border-map-border flex items-center px-4 text-xs text-secondary-foreground z-50">
        <span>AnchorMap v0.1.0</span>
        <span className="mx-2">•</span>
        <span>Powered by Bitcoin & Anchor Protocol</span>
        <span className="ml-auto">
          <a
            href="https://github.com/anchor-protocol"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            GitHub
          </a>
        </span>
      </div>
    </div>
  );
}

