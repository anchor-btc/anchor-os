"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CANVAS_WIDTH, CANVAS_HEIGHT, type Pixel, fetchCanvasData } from "@/lib/api";
import { type ImagePreview } from "./image-upload";

export type Tool = "select" | "paint" | "erase" | "pan";

interface CanvasProps {
  tool: Tool;
  brushSize: number;
  onPixelSelect?: (x: number, y: number) => void;
  onPixelHover?: (x: number, y: number) => void;
  selectedPixels: Map<string, Pixel>;
  selectedColor: { r: number; g: number; b: number };
  onAddPixel?: (pixel: Pixel) => void;
  onAddPixels?: (pixels: Pixel[]) => void;
  onRemovePixel?: (key: string) => void;
  onClearSelection?: () => void;
  showGrid: boolean;
  refreshTrigger?: number;
  // Image preview for interactive positioning
  imagePreview?: ImagePreview | null;
  onImagePreviewMove?: (offsetX: number, offsetY: number) => void;
  onImagePreviewConfirm?: () => void;
  onImagePreviewCancel?: () => void;
  // Pending pixels (waiting for indexing)
  pendingPixels?: Map<string, Pixel>;
  onPendingPixelsIndexed?: (indexedPixels: Map<string, Pixel>) => void;
}

export function Canvas({
  tool,
  brushSize,
  onPixelSelect,
  onPixelHover,
  selectedPixels,
  selectedColor,
  onAddPixel,
  onAddPixels,
  onRemovePixel,
  onClearSelection,
  showGrid,
  refreshTrigger,
  imagePreview,
  onImagePreviewMove,
  onImagePreviewConfirm,
  onImagePreviewCancel,
  pendingPixels,
  onPendingPixelsIndexed,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pixels, setPixels] = useState<Map<string, Pixel>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pixelCount, setPixelCount] = useState(0);

  // View state
  const [zoom, setZoom] = useState(0.15);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number } | null>(null);
  
  // Image preview drag state
  const [isDraggingPreview, setIsDraggingPreview] = useState(false);
  const [previewDragStart, setPreviewDragStart] = useState({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  
  // Pending pixels animation
  const [pulsePhase, setPulsePhase] = useState(0);

  // Load canvas data
  const loadCanvas = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchCanvasData();
      setPixels(data);
      setPixelCount(data.size);
      setError(null);
      console.log(`Loaded ${data.size} pixels from server`);
    } catch (err) {
      console.error("Failed to load canvas:", err);
      setError(err instanceof Error ? err.message : "Failed to load canvas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCanvas();
    const interval = setInterval(loadCanvas, 10000);
    return () => clearInterval(interval);
  }, [loadCanvas]);

  // Reload when refresh trigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadCanvas();
    }
  }, [refreshTrigger, loadCanvas]);

  // Animate pending pixels (pulse effect)
  useEffect(() => {
    if (!pendingPixels || pendingPixels.size === 0) return;
    
    const interval = setInterval(() => {
      setPulsePhase((prev) => (prev + 1) % 60);
    }, 50);
    
    return () => clearInterval(interval);
  }, [pendingPixels]);

  // Check if pending pixels have been indexed
  useEffect(() => {
    if (!pendingPixels || pendingPixels.size === 0 || !onPendingPixelsIndexed) return;
    
    // Check which pending pixels are now in the indexed pixels
    const indexedPending = new Map<string, Pixel>();
    pendingPixels.forEach((pixel, key) => {
      if (pixels.has(key)) {
        const indexedPixel = pixels.get(key)!;
        // Check if the color matches (it was actually indexed)
        if (indexedPixel.r === pixel.r && indexedPixel.g === pixel.g && indexedPixel.b === pixel.b) {
          indexedPending.set(key, pixel);
        }
      }
    });
    
    if (indexedPending.size > 0) {
      onPendingPixelsIndexed(indexedPending);
    }
  }, [pixels, pendingPixels, onPendingPixelsIndexed]);

  // Get brush pixels around a center point
  const getBrushPixels = useCallback(
    (centerX: number, centerY: number): Pixel[] => {
      const result: Pixel[] = [];
      const radius = Math.floor(brushSize / 2);

      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const x = centerX + dx;
          const y = centerY + dy;

          // Check bounds
          if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) continue;

          // For circular brush, check distance
          if (brushSize > 1) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > radius + 0.5) continue;
          }

          result.push({ x, y, ...selectedColor });
        }
      }

      return result;
    },
    [brushSize, selectedColor]
  );

  // Render main canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas with dark background
    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const pixelSize = zoom;
    const startX = Math.max(0, Math.floor(-offset.x / pixelSize));
    const startY = Math.max(0, Math.floor(-offset.y / pixelSize));
    const endX = Math.min(CANVAS_WIDTH, Math.ceil((canvas.width - offset.x) / pixelSize));
    const endY = Math.min(CANVAS_HEIGHT, Math.ceil((canvas.height - offset.y) / pixelSize));

    // Draw canvas background (slightly lighter than page background)
    const canvasStartX = Math.max(0, offset.x);
    const canvasStartY = Math.max(0, offset.y);
    const canvasEndX = Math.min(canvas.width, CANVAS_WIDTH * pixelSize + offset.x);
    const canvasEndY = Math.min(canvas.height, CANVAS_HEIGHT * pixelSize + offset.y);

    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(canvasStartX, canvasStartY, canvasEndX - canvasStartX, canvasEndY - canvasStartY);

    // Draw grid if enabled and zoomed in enough
    if (showGrid && zoom >= 6) {
      ctx.strokeStyle = "#2a2a2a";
      ctx.lineWidth = 0.5;
      for (let x = startX; x <= endX; x++) {
        const screenX = x * pixelSize + offset.x;
        ctx.beginPath();
        ctx.moveTo(screenX, canvasStartY);
        ctx.lineTo(screenX, canvasEndY);
        ctx.stroke();
      }
      for (let y = startY; y <= endY; y++) {
        const screenY = y * pixelSize + offset.y;
        ctx.beginPath();
        ctx.moveTo(canvasStartX, screenY);
        ctx.lineTo(canvasEndX, screenY);
        ctx.stroke();
      }
    }

    // Draw pixels from database
    pixels.forEach((pixel) => {
      if (pixel.x >= startX && pixel.x < endX && pixel.y >= startY && pixel.y < endY) {
        const screenX = pixel.x * pixelSize + offset.x;
        const screenY = pixel.y * pixelSize + offset.y;
        ctx.fillStyle = `rgb(${pixel.r}, ${pixel.g}, ${pixel.b})`;
        ctx.fillRect(screenX, screenY, Math.max(1, pixelSize), Math.max(1, pixelSize));
      }
    });

    // Draw selected pixels (preview with transparency)
    selectedPixels.forEach((pixel) => {
      const screenX = pixel.x * pixelSize + offset.x;
      const screenY = pixel.y * pixelSize + offset.y;
      
      // Draw pixel with slight transparency
      ctx.fillStyle = `rgba(${pixel.r}, ${pixel.g}, ${pixel.b}, 0.8)`;
      ctx.fillRect(screenX, screenY, Math.max(1, pixelSize), Math.max(1, pixelSize));
      
      // Draw selection border when zoomed in
      if (zoom >= 4) {
        ctx.strokeStyle = "#00d9ff";
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX, screenY, pixelSize, pixelSize);
      }
    });

    // Draw pending pixels (pulsing effect - waiting for confirmation)
    if (pendingPixels && pendingPixels.size > 0) {
      const pulseOpacity = 0.5 + Math.sin(pulsePhase * 0.2) * 0.3; // Oscillates between 0.2 and 0.8
      pendingPixels.forEach((pixel) => {
        const screenX = pixel.x * pixelSize + offset.x;
        const screenY = pixel.y * pixelSize + offset.y;
        
        // Draw pixel with pulsing transparency
        ctx.fillStyle = `rgba(${pixel.r}, ${pixel.g}, ${pixel.b}, ${pulseOpacity})`;
        ctx.fillRect(screenX, screenY, Math.max(1, pixelSize), Math.max(1, pixelSize));
        
        // Draw pending indicator border when zoomed in
        if (zoom >= 4) {
          ctx.strokeStyle = `rgba(255, 200, 0, ${pulseOpacity})`; // Golden/yellow for pending
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX, screenY, pixelSize, pixelSize);
        }
      });
    }

    // Draw image preview (semi-transparent, with bounding box)
    if (imagePreview && imagePreview.pixels.length > 0) {
      // Draw preview pixels
      imagePreview.pixels.forEach((pixel) => {
        const screenX = pixel.x * pixelSize + offset.x;
        const screenY = pixel.y * pixelSize + offset.y;
        ctx.fillStyle = `rgba(${pixel.r}, ${pixel.g}, ${pixel.b}, 0.6)`;
        ctx.fillRect(screenX, screenY, Math.max(1, pixelSize), Math.max(1, pixelSize));
      });
      
      // Draw bounding box around the preview
      const previewStartX = imagePreview.offsetX * pixelSize + offset.x;
      const previewStartY = imagePreview.offsetY * pixelSize + offset.y;
      const previewWidth = imagePreview.width * pixelSize;
      const previewHeight = imagePreview.height * pixelSize;
      
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(previewStartX, previewStartY, previewWidth, previewHeight);
      ctx.setLineDash([]);
      
      // Draw corner handles for resize indication
      const handleSize = 8;
      ctx.fillStyle = "#3b82f6";
      // Top-left
      ctx.fillRect(previewStartX - handleSize/2, previewStartY - handleSize/2, handleSize, handleSize);
      // Top-right
      ctx.fillRect(previewStartX + previewWidth - handleSize/2, previewStartY - handleSize/2, handleSize, handleSize);
      // Bottom-left
      ctx.fillRect(previewStartX - handleSize/2, previewStartY + previewHeight - handleSize/2, handleSize, handleSize);
      // Bottom-right
      ctx.fillRect(previewStartX + previewWidth - handleSize/2, previewStartY + previewHeight - handleSize/2, handleSize, handleSize);
    }

    // Draw brush preview on hover
    if (hoverPixel && (tool === "paint" || tool === "erase") && zoom >= 2 && !imagePreview) {
      const brushPixels = getBrushPixels(hoverPixel.x, hoverPixel.y);
      brushPixels.forEach(({ x, y }) => {
        const screenX = x * pixelSize + offset.x;
        const screenY = y * pixelSize + offset.y;
        ctx.strokeStyle = tool === "paint" ? "#ff6b35" : "#ff3535";
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX, screenY, pixelSize, pixelSize);
      });
    } else if (hoverPixel && zoom >= 2 && !imagePreview) {
      // Simple hover highlight
      const screenX = hoverPixel.x * pixelSize + offset.x;
      const screenY = hoverPixel.y * pixelSize + offset.y;
      ctx.strokeStyle = "#ff6b35";
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, screenY, pixelSize, pixelSize);
    }
  }, [pixels, selectedPixels, pendingPixels, pulsePhase, zoom, offset, hoverPixel, showGrid, tool, brushSize, getBrushPixels, imagePreview]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  useEffect(() => {
    const handleResize = () => renderCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [renderCanvas]);

  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((screenX - rect.left - offset.x) / zoom);
      const y = Math.floor((screenY - rect.top - offset.y) / zoom);
      return { x, y };
    },
    [offset, zoom]
  );

  const handlePaint = useCallback(
    (clientX: number, clientY: number) => {
      const { x, y } = screenToCanvas(clientX, clientY);
      if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) return;

      if (tool === "paint") {
        const brushPixels = getBrushPixels(x, y);
        if (onAddPixels) {
          onAddPixels(brushPixels);
        } else {
          brushPixels.forEach((p) => onAddPixel?.(p));
        }
      } else if (tool === "erase") {
        const brushPixels = getBrushPixels(x, y);
        brushPixels.forEach(({ x: px, y: py }) => {
          onRemovePixel?.(`${px},${py}`);
        });
      }
    },
    [screenToCanvas, tool, getBrushPixels, onAddPixel, onAddPixels, onRemovePixel]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Check if clicking on image preview for dragging
      if (imagePreview && e.button === 0) {
        const { x, y } = screenToCanvas(e.clientX, e.clientY);
        const inPreviewX = x >= imagePreview.offsetX && x < imagePreview.offsetX + imagePreview.width;
        const inPreviewY = y >= imagePreview.offsetY && y < imagePreview.offsetY + imagePreview.height;
        
        if (inPreviewX && inPreviewY) {
          setIsDraggingPreview(true);
          setPreviewDragStart({
            x: e.clientX,
            y: e.clientY,
            offsetX: imagePreview.offsetX,
            offsetY: imagePreview.offsetY,
          });
          return;
        }
      }
      
      if (e.button === 1 || (e.button === 0 && e.shiftKey) || tool === "pan") {
        setIsDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      } else if (e.button === 0 && !imagePreview) {
        const { x, y } = screenToCanvas(e.clientX, e.clientY);
        if (x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
          if (tool === "select") {
            const key = `${x},${y}`;
            if (selectedPixels.has(key)) {
              onRemovePixel?.(key);
            } else {
              onAddPixel?.({ x, y, ...selectedColor });
            }
            onPixelSelect?.(x, y);
          } else if (tool === "paint" || tool === "erase") {
            setIsPainting(true);
            handlePaint(e.clientX, e.clientY);
          }
        }
      }
    },
    [offset, screenToCanvas, selectedPixels, selectedColor, tool, onAddPixel, onRemovePixel, onPixelSelect, handlePaint, imagePreview]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDraggingPreview && imagePreview && onImagePreviewMove) {
        const deltaX = Math.round((e.clientX - previewDragStart.x) / zoom);
        const deltaY = Math.round((e.clientY - previewDragStart.y) / zoom);
        const newOffsetX = Math.max(0, Math.min(CANVAS_WIDTH - imagePreview.width, previewDragStart.offsetX + deltaX));
        const newOffsetY = Math.max(0, Math.min(CANVAS_HEIGHT - imagePreview.height, previewDragStart.offsetY + deltaY));
        onImagePreviewMove(newOffsetX, newOffsetY);
      } else if (isDragging) {
        setOffset({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      } else if (isPainting && !imagePreview) {
        handlePaint(e.clientX, e.clientY);
      } else {
        const { x, y } = screenToCanvas(e.clientX, e.clientY);
        if (x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
          setHoverPixel({ x, y });
          onPixelHover?.(x, y);
        } else {
          setHoverPixel(null);
        }
      }
    },
    [isDragging, isPainting, dragStart, screenToCanvas, onPixelHover, handlePaint, isDraggingPreview, imagePreview, previewDragStart, zoom, onImagePreviewMove]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsPainting(false);
    setIsDraggingPreview(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setIsPainting(false);
    setIsDraggingPreview(false);
    setHoverPixel(null);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY > 0 ? 0.85 : 1.15;
      const newZoom = Math.max(0.02, Math.min(80, zoom * zoomFactor));

      const zoomRatio = newZoom / zoom;
      const newOffsetX = mouseX - (mouseX - offset.x) * zoomRatio;
      const newOffsetY = mouseY - (mouseY - offset.y) * zoomRatio;

      setZoom(newZoom);
      setOffset({ x: newOffsetX, y: newOffsetY });
    },
    [zoom, offset]
  );

  const zoomIn = useCallback(() => setZoom((z) => Math.min(80, z * 1.5)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(0.02, z / 1.5)), []);

  const resetView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / CANVAS_WIDTH;
    const scaleY = rect.height / CANVAS_HEIGHT;
    const newZoom = Math.min(scaleX, scaleY) * 0.9;

    setZoom(newZoom);
    setOffset({
      x: (rect.width - CANVAS_WIDTH * newZoom) / 2,
      y: (rect.height - CANVAS_HEIGHT * newZoom) / 2,
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(resetView, 100);
    return () => clearTimeout(timer);
  }, [resetView]);

  const getCursor = () => {
    if (isDragging) return "grabbing";
    if (tool === "pan") return "grab";
    if (tool === "paint") return "crosshair";
    if (tool === "erase") return "crosshair";
    return "crosshair";
  };

  if (loading && pixels.size === 0) {
    return (
      <div className="canvas-container flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-gray-400">Loading canvas...</p>
        </div>
      </div>
    );
  }

  if (error && pixels.size === 0) {
    return (
      <div className="canvas-container flex items-center justify-center">
        <div className="text-center text-red-400">
          <p className="mb-2">Failed to load canvas</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="canvas-container"
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas
          ref={canvasRef}
          style={{ cursor: getCursor() }}
          className="absolute inset-0"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
        />
      </div>

      {/* Zoom controls */}
      <div className="absolute right-4 top-4 zoom-controls">
        <button onClick={zoomIn} className="zoom-btn" title="Zoom In">+</button>
        <button onClick={zoomOut} className="zoom-btn" title="Zoom Out">−</button>
        <button onClick={resetView} className="zoom-btn text-sm" title="Reset View">⌂</button>
      </div>

      {/* Info display */}
      <div className="absolute left-4 top-4 bg-secondary/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs font-mono">
        <span className="text-gray-400">Pixels loaded:</span>{" "}
        <span className="text-primary">{pixelCount}</span>
        {pendingPixels && pendingPixels.size > 0 && (
          <>
            <span className="text-gray-400 ml-2">|</span>{" "}
            <span className="text-yellow-400 animate-pulse">⏳ {pendingPixels.size} pending</span>
          </>
        )}
      </div>

      {/* Coordinates display */}
      {hoverPixel && (
        <div className="absolute left-4 bottom-4 bg-secondary/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm font-mono">
          <span className="text-gray-400">Position:</span>{" "}
          <span className="text-accent">{hoverPixel.x}</span>,{" "}
          <span className="text-accent">{hoverPixel.y}</span>
        </div>
      )}

      {/* Zoom level display */}
      <div className="absolute right-4 bottom-4 bg-secondary/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm font-mono">
        <span className="text-gray-400">Zoom:</span>{" "}
        <span className="text-primary">{(zoom * 100).toFixed(0)}%</span>
      </div>

      {/* Image preview controls */}
      {imagePreview && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="text-sm text-white">
              <span className="font-medium">{imagePreview.pixels.length}</span> pixels
              <span className="mx-2 text-blue-200">•</span>
              Position: <span className="font-mono">{imagePreview.offsetX}, {imagePreview.offsetY}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onImagePreviewCancel}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onImagePreviewConfirm}
                className="px-3 py-1.5 bg-white text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors"
              >
                Confirm Position
              </button>
            </div>
          </div>
          <div className="text-xs text-blue-200 mt-2 text-center">
            Drag the image to reposition, then click Confirm
          </div>
        </div>
      )}
    </div>
  );
}
