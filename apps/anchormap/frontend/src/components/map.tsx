"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { fetchMarkersInBounds, type Marker, type Category } from "@/lib/api";

export interface PendingMarker {
  txid: string;
  latitude: number;
  longitude: number;
  categoryId: number;
}

interface MapComponentProps {
  categoryFilter: number | null;
  onMarkerClick: (marker: Marker) => void;
  onCreateMarker: (lat: number, lng: number) => void;
  flyToMarker: Marker | null;
  pendingMarkers?: PendingMarker[];
}

// Category colors map
const CATEGORY_COLORS: Record<number, string> = {
  0: "#f97316", // General - Orange
  1: "#3b82f6", // Tourism - Blue
  2: "#22c55e", // Commerce - Green
  3: "#a855f7", // Event - Purple
  4: "#ef4444", // Warning - Red
  5: "#eab308", // Historic - Yellow
};

// This component only renders on the client
function MapInner({
  categoryFilter,
  onMarkerClick,
  onCreateMarker,
  flyToMarker,
  pendingMarkers = [],
}: MapComponentProps) {
  const [L, setL] = useState<typeof import("leaflet") | null>(null);
  const [ReactLeaflet, setReactLeaflet] = useState<typeof import("react-leaflet") | null>(null);
  const [bounds, setBounds] = useState({
    lat_min: -85,
    lat_max: 85,
    lng_min: -180,
    lng_max: 180,
  });
  const mapRef = useRef<any>(null);

  // Load Leaflet dynamically
  useEffect(() => {
    Promise.all([
      import("leaflet"),
      import("react-leaflet"),
    ]).then(([leaflet, reactLeaflet]) => {
      setL(leaflet.default);
      setReactLeaflet(reactLeaflet);
    });
  }, []);

  const { data: markers } = useQuery({
    queryKey: ["markers", bounds, categoryFilter],
    queryFn: () =>
      fetchMarkersInBounds({
        ...bounds,
        category: categoryFilter ?? undefined,
        limit: 500,
      }),
    enabled: !!L && !!ReactLeaflet,
    refetchInterval: 30000,
  });

  // Handle fly to marker
  useEffect(() => {
    if (flyToMarker && mapRef.current) {
      mapRef.current.flyTo([flyToMarker.latitude, flyToMarker.longitude], 15, {
        duration: 1,
      });
    }
  }, [flyToMarker]);

  // Create marker icons
  const createMarkerIcon = useCallback(
    (category: Category) => {
      if (!L) return null;

      const iconHtml = `
        <div class="custom-marker" style="background-color: ${category.color}; width: 32px; height: 32px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `;

      return L.divIcon({
        html: iconHtml,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });
    },
    [L]
  );

  // Create pending marker icon with pulsing animation
  const createPendingMarkerIcon = useCallback(
    (categoryId: number) => {
      if (!L) return null;

      const color = CATEGORY_COLORS[categoryId] || "#f97316";
      const iconHtml = `
        <div class="pending-marker" style="position: relative;">
          <div style="position: absolute; top: -8px; left: -8px; width: 48px; height: 48px; border-radius: 50%; background-color: ${color}; opacity: 0.3; animation: pulse-ring 1.5s ease-out infinite;"></div>
          <div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 15px ${color}80; animation: pulse-glow 1.5s ease-in-out infinite; position: relative;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
        </div>
        <style>
          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.5; }
            100% { transform: scale(1.5); opacity: 0; }
          }
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 2px 15px ${color}80; }
            50% { box-shadow: 0 2px 25px ${color}; }
          }
        </style>
      `;

      return L.divIcon({
        html: iconHtml,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });
    },
    [L]
  );

  // Memoize marker icons
  const markerIcons = useMemo(() => {
    if (!L) return {};
    const icons: Record<number, ReturnType<typeof L.divIcon>> = {};
    markers?.forEach((marker) => {
      if (!icons[marker.category.id]) {
        const icon = createMarkerIcon(marker.category);
        if (icon) icons[marker.category.id] = icon;
      }
    });
    return icons;
  }, [L, markers, createMarkerIcon]);

  if (!L || !ReactLeaflet) {
    return (
      <div className="w-full h-full bg-map-bg flex items-center justify-center">
        <div className="text-secondary-foreground">Loading map...</div>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker: LeafletMarker, Popup, useMapEvents, useMap } = ReactLeaflet;

  // Map event handler component
  function MapEventHandler() {
    const map = useMapEvents({
      moveend: () => {
        const mapBounds = map.getBounds();
        setBounds({
          lat_min: mapBounds.getSouth(),
          lat_max: mapBounds.getNorth(),
          lng_min: mapBounds.getWest(),
          lng_max: mapBounds.getEast(),
        });
      },
      dblclick: (e: any) => {
        onCreateMarker(e.latlng.lat, e.latlng.lng);
      },
    });

    // Store map ref
    useEffect(() => {
      mapRef.current = map;
    }, [map]);

    return null;
  }

  // Define world bounds to prevent white space
  const worldBounds = L.latLngBounds(
    L.latLng(-85, -180),
    L.latLng(85, 180)
  );

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2.5}
      minZoom={2.3}
      maxZoom={18}
      className="w-full h-full"
      doubleClickZoom={false}
      maxBounds={worldBounds}
      maxBoundsViscosity={1.0}
      worldCopyJump={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <MapEventHandler />

      {markers?.map((marker) => {
        const icon = markerIcons[marker.category.id];
        if (!icon) return null;

        return (
          <LeafletMarker
            key={`${marker.txid}-${marker.vout}`}
            position={[marker.latitude, marker.longitude]}
            icon={icon}
            eventHandlers={{
              click: () => onMarkerClick(marker),
            }}
          >
            <Popup>
              <div className="min-w-48">
                <p className="text-sm font-medium mb-1">{marker.message}</p>
                <p className="text-xs opacity-70">{marker.reply_count} replies</p>
              </div>
            </Popup>
          </LeafletMarker>
        );
      })}

      {/* Pending markers with pulsing animation */}
      {pendingMarkers.map((pending) => {
        const icon = createPendingMarkerIcon(pending.categoryId);
        if (!icon) return null;

        return (
          <LeafletMarker
            key={`pending-${pending.txid}`}
            position={[pending.latitude, pending.longitude]}
            icon={icon}
          >
            <Popup>
              <div className="min-w-48">
                <p className="text-sm font-medium mb-1 text-yellow-600">⏳ Pending confirmation...</p>
                <p className="text-xs opacity-70 font-mono">{pending.txid.slice(0, 16)}...</p>
              </div>
            </Popup>
          </LeafletMarker>
        );
      })}
    </MapContainer>
  );
}

export function MapComponent(props: MapComponentProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="w-full h-full bg-map-bg flex items-center justify-center">
        <div className="text-secondary-foreground">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <MapInner {...props} />

      {/* Create marker hint */}
      <div className="absolute bottom-4 left-4 bg-secondary/90 backdrop-blur-sm border border-map-border rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-secondary-foreground z-[1000]">
        <Plus className="w-4 h-4 text-primary" />
        Double-click to pin a marker
      </div>
    </div>
  );
}
