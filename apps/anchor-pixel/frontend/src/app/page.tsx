"use client";

import { useCallback, useEffect, useState } from "react";
import { Canvas, type Tool } from "@/components/canvas";
import { Header } from "@/components/header";
import { PaintPanel } from "@/components/paint-panel";
import { PixelInfo } from "@/components/pixel-info";
import { RecentActivity } from "@/components/recent-activity";
import { Toolbar } from "@/components/toolbar";
import { ImageUpload, type ImagePreview } from "@/components/image-upload";
import type { Pixel } from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Max pixels for Inscription carrier: ~557,142 (3.9MB / 7 bytes per pixel)
// Limited to 600K for practical performance reasons
const MAX_SELECTED_PIXELS = 600000;

export default function Home() {
  // State
  const [activeTool, setActiveTool] = useState<Tool>("paint");
  const [showGrid, setShowGrid] = useState(false);
  const [brushSize, setBrushSize] = useState(1);
  const [selectedPixels, setSelectedPixels] = useState<Map<string, Pixel>>(new Map());
  const [selectedColor, setSelectedColor] = useState({ r: 255, g: 107, b: 53 }); // Primary orange
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number; y: number } | null>(null);
  const [selectedPixelForInfo, setSelectedPixelForInfo] = useState<{ x: number; y: number } | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [feeRate, setFeeRate] = useState(1); // Default 1 sat/vbyte
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
  const [pendingPixels, setPendingPixels] = useState<Map<string, Pixel>>(new Map()); // Pixels waiting for indexing

  // Handlers
  const handleAddPixel = useCallback((pixel: Pixel) => {
    setSelectedPixels((prev) => {
      if (prev.size >= MAX_SELECTED_PIXELS) return prev;
      const next = new Map(prev);
      next.set(`${pixel.x},${pixel.y}`, pixel);
      return next;
    });
  }, []);

  const handleAddPixels = useCallback((pixels: Pixel[]) => {
    setSelectedPixels((prev) => {
      const next = new Map(prev);
      for (const pixel of pixels) {
        if (next.size >= MAX_SELECTED_PIXELS) break;
        next.set(`${pixel.x},${pixel.y}`, pixel);
      }
      return next;
    });
  }, []);

  const handleRemovePixel = useCallback((key: string) => {
    setSelectedPixels((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedPixels(new Map());
  }, []);

  // Move selected pixels to pending (after successful TX)
  const handleMoveToPending = useCallback(() => {
    setPendingPixels((prev) => {
      const next = new Map(prev);
      selectedPixels.forEach((pixel, key) => {
        next.set(key, pixel);
      });
      return next;
    });
    setSelectedPixels(new Map());
  }, [selectedPixels]);

  // Clear pending pixels that have been indexed
  const clearIndexedPendingPixels = useCallback((indexedPixels: Map<string, Pixel>) => {
    setPendingPixels((prev) => {
      const next = new Map(prev);
      indexedPixels.forEach((_, key) => {
        next.delete(key);
      });
      return next;
    });
  }, []);

  const handlePixelSelect = useCallback((x: number, y: number) => {
    setSelectedPixelForInfo({ x, y });
  }, []);

  const handlePixelHover = useCallback((x: number, y: number) => {
    setHoveredPixel({ x, y });
  }, []);

  const handleRecentPixelClick = useCallback((x: number, y: number) => {
    setSelectedPixelForInfo({ x, y });
  }, []);

  const handleImageImport = useCallback((pixels: Pixel[]) => {
    setSelectedPixels(new Map(pixels.map((p) => [`${p.x},${p.y}`, p])));
    setImagePreview(null); // Clear preview after import
  }, []);

  const handleImagePreview = useCallback((preview: ImagePreview) => {
    setImagePreview(preview);
  }, []);

  const handleImagePreviewMove = useCallback((offsetX: number, offsetY: number) => {
    setImagePreview((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        offsetX,
        offsetY,
        pixels: prev.originalPixels.map((p) => ({
          ...p,
          x: p.x + offsetX,
          y: p.y + offsetY,
        })),
      };
    });
  }, []);

  const handleImagePreviewConfirm = useCallback(() => {
    if (imagePreview) {
      setSelectedPixels(new Map(imagePreview.pixels.map((p) => [`${p.x},${p.y}`, p])));
      setImagePreview(null);
    }
  }, [imagePreview]);

  const handleImagePreviewCancel = useCallback(() => {
    setImagePreview(null);
  }, []);

  const handleTransactionSuccess = useCallback(() => {
    // Trigger canvas refresh after successful transaction
    setTimeout(() => {
      setRefreshTrigger((prev) => prev + 1);
    }, 2000); // Wait 2 seconds for indexer to process
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key.toLowerCase()) {
        case "v":
          setActiveTool("select");
          break;
        case "p":
          setActiveTool("paint");
          break;
        case "e":
          setActiveTool("erase");
          break;
        case "h":
          setActiveTool("pan");
          break;
        case "g":
          setShowGrid((prev) => !prev);
          break;
        case "escape":
          handleClearSelection();
          break;
        case "[":
          setBrushSize((s) => Math.max(1, s - 2));
          break;
        case "]":
          setBrushSize((s) => Math.min(21, s + 2));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClearSelection]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Main canvas area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-800">
            <Toolbar
              activeTool={activeTool}
              onToolChange={setActiveTool}
              showGrid={showGrid}
              onToggleGrid={() => setShowGrid(!showGrid)}
              selectedCount={selectedPixels.size}
              onClearSelection={handleClearSelection}
              brushSize={brushSize}
              onBrushSizeChange={setBrushSize}
            />
          </div>

          {/* Canvas */}
          <div className="flex-1 p-4">
            <Canvas
              tool={activeTool}
              brushSize={brushSize}
              onPixelSelect={handlePixelSelect}
              onPixelHover={handlePixelHover}
              selectedPixels={selectedPixels}
              selectedColor={selectedColor}
              onAddPixel={handleAddPixel}
              onAddPixels={handleAddPixels}
              onRemovePixel={handleRemovePixel}
              onClearSelection={handleClearSelection}
              showGrid={showGrid}
              refreshTrigger={refreshTrigger}
              imagePreview={imagePreview}
              onImagePreviewMove={handleImagePreviewMove}
              onImagePreviewConfirm={handleImagePreviewConfirm}
              onImagePreviewCancel={handleImagePreviewCancel}
              pendingPixels={pendingPixels}
              onPendingPixelsIndexed={clearIndexedPendingPixels}
            />
          </div>
        </div>

        {/* Sidebar toggle */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="hidden lg:flex items-center justify-center w-6 bg-secondary border-l border-gray-800 hover:bg-gray-800 transition-colors"
        >
          {showSidebar ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Right sidebar */}
        {showSidebar && (
          <div className="w-80 border-l border-gray-800 bg-secondary/50 overflow-y-auto hidden lg:block">
            <div className="p-4 space-y-4">
              {/* Paint panel */}
              <PaintPanel
                selectedPixels={selectedPixels}
                selectedColor={selectedColor}
                onColorChange={setSelectedColor}
                onClearSelection={handleClearSelection}
                onMoveToPending={handleMoveToPending}
                onTransactionSuccess={handleTransactionSuccess}
                feeRate={feeRate}
                onFeeRateChange={setFeeRate}
              />

              {/* Image upload */}
              <ImageUpload
                onImport={handleImageImport}
                onPreview={handleImagePreview}
                selectedColor={selectedColor}
                hasActivePreview={!!imagePreview}
              />

              {/* Pixel info */}
              {selectedPixelForInfo && (
                <PixelInfo x={selectedPixelForInfo.x} y={selectedPixelForInfo.y} />
              )}

              {/* Recent activity */}
              <RecentActivity onPixelClick={handleRecentPixelClick} />
            </div>
          </div>
        )}
      </div>

      {/* Footer stats bar */}
      <div className="h-8 bg-secondary/80 border-t border-gray-800 flex items-center px-4 text-xs text-gray-500">
        <span>PixelMap v0.1.0</span>
        <span className="mx-2">•</span>
        <span>Canvas: 4580 x 4580</span>
        <span className="mx-2">•</span>
        <span>~21 million pixels</span>
        <span className="mx-2">•</span>
        <span>Max ~557K pixels (Inscription)</span>
        <span className="ml-auto">Powered by Bitcoin & Anchor Protocol</span>
      </div>
    </div>
  );
}
