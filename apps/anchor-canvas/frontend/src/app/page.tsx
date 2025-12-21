"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@/components/canvas";
import { Header } from "@/components/header";
import { PaintPanel } from "@/components/paint-panel";
import { PixelInfo } from "@/components/pixel-info";
import { RecentActivity } from "@/components/recent-activity";
import { Toolbar, type Tool } from "@/components/toolbar";
import { ImageUpload, type ImagePreview } from "@/components/image-upload";
import type { Pixel } from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Max pixels for Inscription carrier: ~557,142 (3.9MB / 7 bytes per pixel)
const MAX_SELECTED_PIXELS = 600000;
const MAX_HISTORY = 50;

type HistoryEntry = Map<string, Pixel>;

export default function Home() {
  // State
  const [activeTool, setActiveTool] = useState<Tool>("paint");
  const [showGrid, setShowGrid] = useState(false);
  const [brushSize, setBrushSize] = useState(1);
  const [selectedPixels, setSelectedPixels] = useState<Map<string, Pixel>>(new Map());
  const [selectedColor, setSelectedColor] = useState({ r: 255, g: 107, b: 53 });
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number; y: number } | null>(null);
  const [selectedPixelForInfo, setSelectedPixelForInfo] = useState<{ x: number; y: number } | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [feeRate, setFeeRate] = useState(1);
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
  const [pendingPixels, setPendingPixels] = useState<Map<string, Pixel>>(new Map());
  
  // History for undo/redo
  const [history, setHistory] = useState<HistoryEntry[]>([new Map()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoRef = useRef(false);
  
  // Zoom state (controlled from canvas)
  const [zoomLevel, setZoomLevel] = useState(1);
  const canvasRef = useRef<{
    zoomIn: () => void;
    zoomOut: () => void;
    resetView: () => void;
    centerOnContent: () => void;
    getZoom: () => number;
    pickColor: (x: number, y: number) => { r: number; g: number; b: number } | null;
  } | null>(null);

  // Save to history when selection changes
  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    
    // Don't save empty states repeatedly
    if (selectedPixels.size === 0 && history[historyIndex]?.size === 0) {
      return;
    }
    
    // Check if state actually changed
    const currentState = history[historyIndex];
    if (currentState && currentState.size === selectedPixels.size) {
      let same = true;
      selectedPixels.forEach((pixel, key) => {
        const existing = currentState.get(key);
        if (!existing || existing.r !== pixel.r || existing.g !== pixel.g || existing.b !== pixel.b) {
          same = false;
        }
      });
      if (same) return;
    }
    
    // Add new state to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(new Map(selectedPixels));
    
    // Limit history size
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [selectedPixels, history, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    isUndoRedoRef.current = true;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setSelectedPixels(new Map(history[newIndex]));
  }, [canUndo, historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    isUndoRedoRef.current = true;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setSelectedPixels(new Map(history[newIndex]));
  }, [canRedo, historyIndex, history]);

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

  const handleMoveToPending = useCallback(() => {
    setPendingPixels((prev) => {
      const next = new Map(prev);
      selectedPixels.forEach((pixel, key) => {
        next.set(key, pixel);
      });
      return next;
    });
    setSelectedPixels(new Map());
    // Reset history after successful paint
    setHistory([new Map()]);
    setHistoryIndex(0);
  }, [selectedPixels]);

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
    setImagePreview(null);
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
    setTimeout(() => {
      setRefreshTrigger((prev) => prev + 1);
    }, 2000);
  }, []);

  // Color picker callback (from eyedropper)
  const handleColorPick = useCallback((color: { r: number; g: number; b: number }) => {
    setSelectedColor(color);
    setActiveTool("paint"); // Switch back to paint after picking
  }, []);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    canvasRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    canvasRef.current?.zoomOut();
  }, []);

  const handleZoomReset = useCallback(() => {
    canvasRef.current?.centerOnContent();
  }, []);

  const handleZoomChange = useCallback((zoom: number) => {
    setZoomLevel(zoom);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      
      // Redo with Ctrl+Y
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
        return;
      }
      
      switch (e.key.toLowerCase()) {
        case "v":
          setActiveTool("select");
          break;
        case "b":
          setActiveTool("paint");
          break;
        case "e":
          setActiveTool("erase");
          break;
        case "h":
          setActiveTool("pan");
          break;
        case "l":
          setActiveTool("line");
          break;
        case "r":
          setActiveTool("rectangle");
          break;
        case "c":
          setActiveTool("circle");
          break;
        case "f":
          setActiveTool("fill");
          break;
        case "i":
          setActiveTool("eyedropper");
          break;
        case "g":
          setShowGrid((prev) => !prev);
          break;
        case "escape":
          handleClearSelection();
          break;
        case "[":
          setBrushSize((s) => Math.max(1, s - 1));
          break;
        case "]":
          setBrushSize((s) => Math.min(50, s + 1));
          break;
        case "=":
        case "+":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
        case "0":
          handleZoomReset();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClearSelection, handleUndo, handleRedo, handleZoomIn, handleZoomOut, handleZoomReset]);

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a]">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Main canvas area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <Toolbar
              activeTool={activeTool}
              onToolChange={setActiveTool}
              showGrid={showGrid}
              onToggleGrid={() => setShowGrid(!showGrid)}
              selectedCount={selectedPixels.size}
              onClearSelection={handleClearSelection}
              brushSize={brushSize}
              onBrushSizeChange={setBrushSize}
              selectedColor={selectedColor}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onZoomReset={handleZoomReset}
              zoomLevel={zoomLevel}
              cursorPosition={hoveredPixel}
            />
          </div>

          {/* Canvas */}
          <div className="flex-1 p-3">
            <Canvas
              ref={canvasRef}
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
              onZoomChange={handleZoomChange}
              onColorPick={handleColorPick}
            />
          </div>
        </div>

        {/* Sidebar toggle */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="hidden lg:flex items-center justify-center w-5 bg-[#0d0d0d] border-l border-white/[0.06] hover:bg-white/[0.04] transition-colors text-white/30 hover:text-white/60"
        >
          {showSidebar ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Right sidebar */}
        {showSidebar && (
          <div className="w-80 border-l border-white/[0.06] bg-[#0d0d0d] overflow-y-auto hidden lg:block">
            <div className="p-4 space-y-4">
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

              <ImageUpload
                onImport={handleImageImport}
                onPreview={handleImagePreview}
                selectedColor={selectedColor}
                hasActivePreview={!!imagePreview}
              />

              {selectedPixelForInfo && (
                <PixelInfo x={selectedPixelForInfo.x} y={selectedPixelForInfo.y} />
              )}

              <RecentActivity onPixelClick={handleRecentPixelClick} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="h-6 bg-[#0a0a0a] border-t border-white/[0.06] flex items-center justify-center px-4 text-[10px] text-white/25 font-mono">
        <span>4580 × 4580</span>
        <span className="mx-3 text-white/10">|</span>
        <span>Powered by Bitcoin & Anchor Protocol</span>
      </div>
    </div>
  );
}
