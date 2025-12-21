"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { CANVAS_WIDTH, CANVAS_HEIGHT, type Pixel, fetchCanvasData } from "@/lib/api";
import { type ImagePreview } from "./image-upload";
import { type Tool } from "./toolbar";

export type { Tool };

export interface CanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  centerOnContent: () => void;
  getZoom: () => number;
  pickColor: (x: number, y: number) => { r: number; g: number; b: number } | null;
}

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
  imagePreview?: ImagePreview | null;
  onImagePreviewMove?: (offsetX: number, offsetY: number) => void;
  onImagePreviewConfirm?: () => void;
  onImagePreviewCancel?: () => void;
  pendingPixels?: Map<string, Pixel>;
  onPendingPixelsIndexed?: (indexedPixels: Map<string, Pixel>) => void;
  onZoomChange?: (zoom: number) => void;
  onColorPick?: (color: { r: number; g: number; b: number }) => void;
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  {
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
    onZoomChange,
    onColorPick,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pixels, setPixels] = useState<Map<string, Pixel>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pixelCount, setPixelCount] = useState(0);

  // View state
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hasInitializedView, setHasInitializedView] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number } | null>(null);
  
  // Shape drawing state
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [shapeEnd, setShapeEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  
  // Image preview drag state
  const [isDraggingPreview, setIsDraggingPreview] = useState(false);
  const [previewDragStart, setPreviewDragStart] = useState({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  
  // Pending pixels animation
  const [pulsePhase, setPulsePhase] = useState(0);

  // Notify parent of zoom changes
  useEffect(() => {
    onZoomChange?.(zoom);
  }, [zoom, onZoomChange]);

  // Load canvas data
  const loadCanvas = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchCanvasData();
      setPixels(data);
      setPixelCount(data.size);
      setError(null);
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

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadCanvas();
    }
  }, [refreshTrigger, loadCanvas]);

  // Animate pending pixels
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
    const indexedPending = new Map<string, Pixel>();
    pendingPixels.forEach((pixel, key) => {
      if (pixels.has(key)) {
        const indexedPixel = pixels.get(key)!;
        if (indexedPixel.r === pixel.r && indexedPixel.g === pixel.g && indexedPixel.b === pixel.b) {
          indexedPending.set(key, pixel);
        }
      }
    });
    if (indexedPending.size > 0) {
      onPendingPixelsIndexed(indexedPending);
    }
  }, [pixels, pendingPixels, onPendingPixelsIndexed]);

  // Get brush pixels
  const getBrushPixels = useCallback(
    (centerX: number, centerY: number): Pixel[] => {
      const result: Pixel[] = [];
      const radius = Math.floor(brushSize / 2);
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const x = centerX + dx;
          const y = centerY + dy;
          if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) continue;
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

  // Get line pixels (Bresenham's algorithm)
  const getLinePixels = useCallback(
    (x0: number, y0: number, x1: number, y1: number): Pixel[] => {
      const result: Pixel[] = [];
      const dx = Math.abs(x1 - x0);
      const dy = Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;
      let x = x0, y = y0;
      
      while (true) {
        // Add brush at this point
        const radius = Math.floor(brushSize / 2);
        for (let bx = -radius; bx <= radius; bx++) {
          for (let by = -radius; by <= radius; by++) {
            const px = x + bx;
            const py = y + by;
            if (px < 0 || px >= CANVAS_WIDTH || py < 0 || py >= CANVAS_HEIGHT) continue;
            if (brushSize > 1 && Math.sqrt(bx * bx + by * by) > radius + 0.5) continue;
            result.push({ x: px, y: py, ...selectedColor });
          }
        }
        
        if (x === x1 && y === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
      }
      return result;
    },
    [brushSize, selectedColor]
  );

  // Get rectangle pixels
  const getRectanglePixels = useCallback(
    (x0: number, y0: number, x1: number, y1: number): Pixel[] => {
      const result: Pixel[] = [];
      const minX = Math.max(0, Math.min(x0, x1));
      const maxX = Math.min(CANVAS_WIDTH - 1, Math.max(x0, x1));
      const minY = Math.max(0, Math.min(y0, y1));
      const maxY = Math.min(CANVAS_HEIGHT - 1, Math.max(y0, y1));
      
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          // Draw border only (thickness = brushSize)
          const isOnBorder = 
            x < minX + brushSize || x > maxX - brushSize ||
            y < minY + brushSize || y > maxY - brushSize;
          if (isOnBorder) {
            result.push({ x, y, ...selectedColor });
          }
        }
      }
      return result;
    },
    [brushSize, selectedColor]
  );

  // Get circle pixels (midpoint algorithm)
  const getCirclePixels = useCallback(
    (cx: number, cy: number, endX: number, endY: number): Pixel[] => {
      const result: Pixel[] = [];
      const radius = Math.round(Math.sqrt(Math.pow(endX - cx, 2) + Math.pow(endY - cy, 2)));
      if (radius === 0) return [{ x: cx, y: cy, ...selectedColor }];
      
      const addPixelWithBrush = (x: number, y: number) => {
        const bRadius = Math.floor(brushSize / 2);
        for (let bx = -bRadius; bx <= bRadius; bx++) {
          for (let by = -bRadius; by <= bRadius; by++) {
            const px = x + bx;
            const py = y + by;
            if (px < 0 || px >= CANVAS_WIDTH || py < 0 || py >= CANVAS_HEIGHT) continue;
            if (brushSize > 1 && Math.sqrt(bx * bx + by * by) > bRadius + 0.5) continue;
            result.push({ x: px, y: py, ...selectedColor });
          }
        }
      };
      
      let x = 0, y = radius;
      let d = 3 - 2 * radius;
      
      while (y >= x) {
        addPixelWithBrush(cx + x, cy + y);
        addPixelWithBrush(cx - x, cy + y);
        addPixelWithBrush(cx + x, cy - y);
        addPixelWithBrush(cx - x, cy - y);
        addPixelWithBrush(cx + y, cy + x);
        addPixelWithBrush(cx - y, cy + x);
        addPixelWithBrush(cx + y, cy - x);
        addPixelWithBrush(cx - y, cy - x);
        
        x++;
        if (d > 0) {
          y--;
          d = d + 4 * (x - y) + 10;
        } else {
          d = d + 4 * x + 6;
        }
      }
      return result;
    },
    [brushSize, selectedColor]
  );

  // Flood fill algorithm
  const getFloodFillPixels = useCallback(
    (startX: number, startY: number): Pixel[] => {
      const result: Pixel[] = [];
      const visited = new Set<string>();
      const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
      
      // Get target color (the color we're replacing)
      const targetPixel = pixels.get(`${startX},${startY}`) || selectedPixels.get(`${startX},${startY}`);
      const targetColor = targetPixel 
        ? { r: targetPixel.r, g: targetPixel.g, b: targetPixel.b }
        : { r: 26, g: 26, b: 26 }; // Default canvas background
      
      // Don't fill if target is same as selected color
      if (targetColor.r === selectedColor.r && 
          targetColor.g === selectedColor.g && 
          targetColor.b === selectedColor.b) {
        return result;
      }
      
      const maxFill = 50000; // Limit to prevent hanging
      
      while (queue.length > 0 && result.length < maxFill) {
        const { x, y } = queue.shift()!;
        const key = `${x},${y}`;
        
        if (visited.has(key)) continue;
        if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) continue;
        
        const currentPixel = pixels.get(key) || selectedPixels.get(key);
        const currentColor = currentPixel
          ? { r: currentPixel.r, g: currentPixel.g, b: currentPixel.b }
          : { r: 26, g: 26, b: 26 };
        
        // Check if color matches target
        if (currentColor.r !== targetColor.r ||
            currentColor.g !== targetColor.g ||
            currentColor.b !== targetColor.b) {
          continue;
        }
        
        visited.add(key);
        result.push({ x, y, ...selectedColor });
        
        // Add neighbors
        queue.push({ x: x + 1, y });
        queue.push({ x: x - 1, y });
        queue.push({ x, y: y + 1 });
        queue.push({ x, y: y - 1 });
      }
      
      return result;
    },
    [pixels, selectedPixels, selectedColor]
  );

  // Pick color from canvas
  const pickColor = useCallback(
    (x: number, y: number): { r: number; g: number; b: number } | null => {
      const key = `${x},${y}`;
      const pixel = selectedPixels.get(key) || pixels.get(key);
      if (pixel) {
        return { r: pixel.r, g: pixel.g, b: pixel.b };
      }
      return null;
    },
    [pixels, selectedPixels]
  );

  // Zoom functions
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

  const centerOnContent = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Always show the full canvas centered, with a reasonable zoom
    // This ensures users always see the whole canvas on load
    const scaleX = rect.width / CANVAS_WIDTH;
    const scaleY = rect.height / CANVAS_HEIGHT;
    const fitZoom = Math.min(scaleX, scaleY) * 0.85; // 85% to add some margin
    
    setZoom(fitZoom);
    setOffset({
      x: (rect.width - CANVAS_WIDTH * fitZoom) / 2,
      y: (rect.height - CANVAS_HEIGHT * fitZoom) / 2,
    });
  }, []);

  // Expose functions via ref
  useImperativeHandle(ref, () => ({
    zoomIn,
    zoomOut,
    resetView,
    centerOnContent,
    getZoom: () => zoom,
    pickColor,
  }), [zoomIn, zoomOut, resetView, centerOnContent, zoom, pickColor]);

  // Initialize view
  useEffect(() => {
    if (!hasInitializedView && !loading && pixels.size >= 0) {
      const timer = setTimeout(() => {
        centerOnContent();
        setHasInitializedView(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, pixels.size, hasInitializedView, centerOnContent]);

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear with dark background
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const pixelSize = zoom;
    const startX = Math.max(0, Math.floor(-offset.x / pixelSize));
    const startY = Math.max(0, Math.floor(-offset.y / pixelSize));
    const endX = Math.min(CANVAS_WIDTH, Math.ceil((canvas.width - offset.x) / pixelSize));
    const endY = Math.min(CANVAS_HEIGHT, Math.ceil((canvas.height - offset.y) / pixelSize));

    // Canvas background
    const canvasStartX = Math.max(0, offset.x);
    const canvasStartY = Math.max(0, offset.y);
    const canvasEndX = Math.min(canvas.width, CANVAS_WIDTH * pixelSize + offset.x);
    const canvasEndY = Math.min(canvas.height, CANVAS_HEIGHT * pixelSize + offset.y);

    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(canvasStartX, canvasStartY, canvasEndX - canvasStartX, canvasEndY - canvasStartY);

    // Grid
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

    // Draw indexed pixels
    pixels.forEach((pixel) => {
      if (pixel.x >= startX && pixel.x < endX && pixel.y >= startY && pixel.y < endY) {
        const screenX = pixel.x * pixelSize + offset.x;
        const screenY = pixel.y * pixelSize + offset.y;
        ctx.fillStyle = `rgb(${pixel.r}, ${pixel.g}, ${pixel.b})`;
        ctx.fillRect(screenX, screenY, Math.max(1, pixelSize), Math.max(1, pixelSize));
      }
    });

    // Draw selected pixels
    selectedPixels.forEach((pixel) => {
      const screenX = pixel.x * pixelSize + offset.x;
      const screenY = pixel.y * pixelSize + offset.y;
      ctx.fillStyle = `rgba(${pixel.r}, ${pixel.g}, ${pixel.b}, 0.85)`;
      ctx.fillRect(screenX, screenY, Math.max(1, pixelSize), Math.max(1, pixelSize));
      if (zoom >= 4) {
        ctx.strokeStyle = "#00d9ff";
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX, screenY, pixelSize, pixelSize);
      }
    });

    // Draw pending pixels (pulsing)
    if (pendingPixels && pendingPixels.size > 0) {
      const pulseOpacity = 0.5 + Math.sin(pulsePhase * 0.2) * 0.3;
      pendingPixels.forEach((pixel) => {
        const screenX = pixel.x * pixelSize + offset.x;
        const screenY = pixel.y * pixelSize + offset.y;
        ctx.fillStyle = `rgba(${pixel.r}, ${pixel.g}, ${pixel.b}, ${pulseOpacity})`;
        ctx.fillRect(screenX, screenY, Math.max(1, pixelSize), Math.max(1, pixelSize));
        if (zoom >= 4) {
          ctx.strokeStyle = `rgba(255, 200, 0, ${pulseOpacity})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX, screenY, pixelSize, pixelSize);
        }
      });
    }

    // Draw image preview
    if (imagePreview && imagePreview.pixels.length > 0) {
      imagePreview.pixels.forEach((pixel) => {
        const screenX = pixel.x * pixelSize + offset.x;
        const screenY = pixel.y * pixelSize + offset.y;
        ctx.fillStyle = `rgba(${pixel.r}, ${pixel.g}, ${pixel.b}, 0.6)`;
        ctx.fillRect(screenX, screenY, Math.max(1, pixelSize), Math.max(1, pixelSize));
      });
      
      const previewStartX = imagePreview.offsetX * pixelSize + offset.x;
      const previewStartY = imagePreview.offsetY * pixelSize + offset.y;
      const previewWidth = imagePreview.width * pixelSize;
      const previewHeight = imagePreview.height * pixelSize;
      
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(previewStartX, previewStartY, previewWidth, previewHeight);
      ctx.setLineDash([]);
    }

    // Draw shape preview while drawing
    if (isDrawingShape && shapeStart && shapeEnd) {
      let previewPixels: Pixel[] = [];
      if (tool === "line") {
        previewPixels = getLinePixels(shapeStart.x, shapeStart.y, shapeEnd.x, shapeEnd.y);
      } else if (tool === "rectangle") {
        previewPixels = getRectanglePixels(shapeStart.x, shapeStart.y, shapeEnd.x, shapeEnd.y);
      } else if (tool === "circle") {
        previewPixels = getCirclePixels(shapeStart.x, shapeStart.y, shapeEnd.x, shapeEnd.y);
      }
      
      previewPixels.forEach((pixel) => {
        const screenX = pixel.x * pixelSize + offset.x;
        const screenY = pixel.y * pixelSize + offset.y;
        ctx.fillStyle = `rgba(${pixel.r}, ${pixel.g}, ${pixel.b}, 0.6)`;
        ctx.fillRect(screenX, screenY, Math.max(1, pixelSize), Math.max(1, pixelSize));
      });
    }

    // Brush preview on hover
    if (hoverPixel && !imagePreview && !isDrawingShape) {
      if (tool === "paint" || tool === "erase") {
        const brushPixels = getBrushPixels(hoverPixel.x, hoverPixel.y);
        brushPixels.forEach(({ x, y }) => {
          const screenX = x * pixelSize + offset.x;
          const screenY = y * pixelSize + offset.y;
          ctx.strokeStyle = tool === "paint" ? "rgba(255, 107, 53, 0.8)" : "rgba(255, 53, 53, 0.8)";
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX, screenY, pixelSize, pixelSize);
        });
      } else if (tool === "eyedropper") {
        const screenX = hoverPixel.x * pixelSize + offset.x;
        const screenY = hoverPixel.y * pixelSize + offset.y;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX - 1, screenY - 1, pixelSize + 2, pixelSize + 2);
      } else if (tool === "fill") {
        const screenX = hoverPixel.x * pixelSize + offset.x;
        const screenY = hoverPixel.y * pixelSize + offset.y;
        ctx.strokeStyle = `rgba(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}, 0.8)`;
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, screenY, pixelSize, pixelSize);
      } else if (zoom >= 2) {
        const screenX = hoverPixel.x * pixelSize + offset.x;
        const screenY = hoverPixel.y * pixelSize + offset.y;
        ctx.strokeStyle = "#ff6b35";
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, screenY, pixelSize, pixelSize);
      }
    }
  }, [
    pixels, selectedPixels, pendingPixels, pulsePhase, zoom, offset, hoverPixel, 
    showGrid, tool, brushSize, getBrushPixels, imagePreview, isDrawingShape, 
    shapeStart, shapeEnd, getLinePixels, getRectanglePixels, getCirclePixels, selectedColor
  ]);

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
        onAddPixels?.(brushPixels);
      } else if (tool === "erase") {
        const brushPixels = getBrushPixels(x, y);
        brushPixels.forEach(({ x: px, y: py }) => {
          onRemovePixel?.(`${px},${py}`);
        });
      }
    },
    [screenToCanvas, tool, getBrushPixels, onAddPixels, onRemovePixel]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Image preview drag
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
      
      // Pan
      if (e.button === 1 || (e.button === 0 && e.shiftKey) || tool === "pan") {
        setIsDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
        return;
      }
      
      if (e.button !== 0 || imagePreview) return;
      
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) return;

      // Eyedropper
      if (tool === "eyedropper") {
        const color = pickColor(x, y);
        if (color) {
          onColorPick?.(color);
        }
        return;
      }

      // Fill
      if (tool === "fill") {
        const fillPixels = getFloodFillPixels(x, y);
        if (fillPixels.length > 0) {
          onAddPixels?.(fillPixels);
        }
        return;
      }

      // Shape tools
      if (tool === "line" || tool === "rectangle" || tool === "circle") {
        setShapeStart({ x, y });
        setShapeEnd({ x, y });
        setIsDrawingShape(true);
        return;
      }

      // Select
      if (tool === "select") {
        const key = `${x},${y}`;
        if (selectedPixels.has(key)) {
          onRemovePixel?.(key);
        } else {
          onAddPixel?.({ x, y, ...selectedColor });
        }
        onPixelSelect?.(x, y);
        return;
      }

      // Paint/Erase
      if (tool === "paint" || tool === "erase") {
        setIsPainting(true);
        handlePaint(e.clientX, e.clientY);
      }
    },
    [
      offset, screenToCanvas, selectedPixels, selectedColor, tool, 
      onAddPixel, onAddPixels, onRemovePixel, onPixelSelect, handlePaint, 
      imagePreview, pickColor, onColorPick, getFloodFillPixels
    ]
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
      } else if (isDrawingShape) {
        const { x, y } = screenToCanvas(e.clientX, e.clientY);
        setShapeEnd({ 
          x: Math.max(0, Math.min(CANVAS_WIDTH - 1, x)), 
          y: Math.max(0, Math.min(CANVAS_HEIGHT - 1, y)) 
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
    [
      isDragging, isPainting, isDrawingShape, dragStart, screenToCanvas, 
      onPixelHover, handlePaint, isDraggingPreview, imagePreview, 
      previewDragStart, zoom, onImagePreviewMove
    ]
  );

  const handleMouseUp = useCallback(() => {
    // Finalize shape
    if (isDrawingShape && shapeStart && shapeEnd) {
      let shapePixels: Pixel[] = [];
      if (tool === "line") {
        shapePixels = getLinePixels(shapeStart.x, shapeStart.y, shapeEnd.x, shapeEnd.y);
      } else if (tool === "rectangle") {
        shapePixels = getRectanglePixels(shapeStart.x, shapeStart.y, shapeEnd.x, shapeEnd.y);
      } else if (tool === "circle") {
        shapePixels = getCirclePixels(shapeStart.x, shapeStart.y, shapeEnd.x, shapeEnd.y);
      }
      if (shapePixels.length > 0) {
        onAddPixels?.(shapePixels);
      }
    }
    
    setIsDragging(false);
    setIsPainting(false);
    setIsDraggingPreview(false);
    setIsDrawingShape(false);
    setShapeStart(null);
    setShapeEnd(null);
  }, [isDrawingShape, shapeStart, shapeEnd, tool, getLinePixels, getRectanglePixels, getCirclePixels, onAddPixels]);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setIsPainting(false);
    setIsDraggingPreview(false);
    setIsDrawingShape(false);
    setShapeStart(null);
    setShapeEnd(null);
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

  const getCursor = () => {
    if (isDragging) return "grabbing";
    if (tool === "pan") return "grab";
    if (tool === "eyedropper") return "crosshair";
    if (tool === "fill") return "crosshair";
    return "crosshair";
  };

  if (loading && pixels.size === 0) {
    return (
      <div className="canvas-container flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-white/50">Loading canvas...</p>
        </div>
      </div>
    );
  }

  if (error && pixels.size === 0) {
    return (
      <div className="canvas-container flex items-center justify-center">
        <div className="text-center text-red-400">
          <p className="mb-2">Failed to load canvas</p>
          <p className="text-sm text-white/40">{error}</p>
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

      {/* Info display */}
      <div className="absolute left-3 top-3 bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-[11px] font-mono border border-white/10">
        <span className="text-white/40">Pixels:</span>{" "}
        <span className="text-orange-500">{pixelCount.toLocaleString()}</span>
        {pendingPixels && pendingPixels.size > 0 && (
          <>
            <span className="text-white/20 mx-1.5">|</span>
            <span className="text-yellow-400 animate-pulse">⏳ {pendingPixels.size}</span>
          </>
        )}
      </div>

      {/* Image preview controls */}
      {imagePreview && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-blue-600/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-blue-500/30">
          <div className="flex items-center gap-4">
            <div className="text-sm text-white">
              <span className="font-medium">{imagePreview.pixels.length.toLocaleString()}</span> pixels
              <span className="mx-2 text-blue-200">•</span>
              <span className="font-mono text-xs">{imagePreview.offsetX}, {imagePreview.offsetY}</span>
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
                Confirm
              </button>
            </div>
          </div>
          <div className="text-[10px] text-blue-200 mt-1.5 text-center">
            Drag to reposition
          </div>
        </div>
      )}
    </div>
  );
});
