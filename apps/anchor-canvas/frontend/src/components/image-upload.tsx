'use client';

import { useCallback, useRef, useState, useMemo } from 'react';
import Image from 'next/image';
import { Upload, X, Check, Loader2, ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';
import {
  type Pixel,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  calculatePayloadSize,
  CARRIER_INFO,
} from '@/lib/api';

// Export the preview type for canvas integration
export interface ImagePreview {
  pixels: Pixel[]; // Current pixels with offset applied
  originalPixels: Pixel[]; // Original pixels at (0,0) origin for recalculation
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

interface ImageUploadProps {
  onImport: (pixels: Pixel[]) => void;
  onPreview?: (preview: ImagePreview) => void;
  selectedColor: { r: number; g: number; b: number };
  hasActivePreview?: boolean;
}

// Preset sizes for quick resize
const PRESETS = [
  { name: 'Tiny', width: 32, height: 32 },
  { name: 'Small', width: 64, height: 64 },
  { name: 'Medium', width: 128, height: 128 },
  { name: 'Large', width: 256, height: 256 },
  { name: 'XL', width: 512, height: 512 },
];

export function ImageUpload({ onImport, onPreview }: ImageUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });
  const [processing, setProcessing] = useState(false);
  const [settings, setSettings] = useState({
    x: 0,
    y: 0,
    maxWidth: 128,
    maxHeight: 128,
    threshold: 10, // Skip pixels too similar to background
    scale: 100, // Percentage scale
  });
  const [pixelCount, setPixelCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate estimated costs
  const payloadSize = useMemo(() => calculatePayloadSize(pixelCount), [pixelCount]);
  const maxBytes = CARRIER_INFO.inscription.maxBytes;
  const isPayloadTooLarge = payloadSize > maxBytes;
  const estimatedFee = useMemo(() => Math.ceil(payloadSize * 0.25 + 150), [payloadSize]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPreview(dataUrl);

      // Get original dimensions (use native HTMLImageElement, not Next.js Image)
      const img = document.createElement('img');
      img.onload = () => {
        setOriginalDimensions({ width: img.width, height: img.height });
        // Auto-set max dimensions based on image aspect ratio
        const aspectRatio = img.width / img.height;
        if (aspectRatio > 1) {
          setSettings((s) => ({
            ...s,
            maxWidth: Math.min(128, img.width),
            maxHeight: Math.min(Math.round(128 / aspectRatio), img.height),
          }));
        } else {
          setSettings((s) => ({
            ...s,
            maxWidth: Math.min(Math.round(128 * aspectRatio), img.width),
            maxHeight: Math.min(128, img.height),
          }));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  const processImage = useCallback(async (): Promise<Pixel[]> => {
    if (!preview) return [];

    return new Promise((resolve) => {
      // Use native HTMLImageElement, not Next.js Image component
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          resolve([]);
          return;
        }

        // Calculate scaled dimensions
        const scale = Math.min(settings.maxWidth / img.width, settings.maxHeight / img.height, 1);
        const width = Math.floor(img.width * scale);
        const height = Math.floor(img.height * scale);

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve([]);
          return;
        }

        // Draw scaled image
        ctx.drawImage(img, 0, 0, width, height);

        // Extract pixels
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels: Pixel[] = [];

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = imageData.data[idx];
            const g = imageData.data[idx + 1];
            const b = imageData.data[idx + 2];
            const a = imageData.data[idx + 3];

            // Skip transparent pixels
            if (a < 128) continue;

            // Skip near-black pixels (background)
            const brightness = (r + g + b) / 3;
            if (brightness < settings.threshold) continue;

            const canvasX = settings.x + x;
            const canvasY = settings.y + y;

            // Check bounds
            if (canvasX >= 0 && canvasX < CANVAS_WIDTH && canvasY >= 0 && canvasY < CANVAS_HEIGHT) {
              pixels.push({ x: canvasX, y: canvasY, r, g, b });
            }
          }
        }

        resolve(pixels);
      };
      img.src = preview;
    });
  }, [preview, settings]);

  // Process image and return pixels at origin (0,0) for preview mode
  const processImageAtOrigin = useCallback(async (): Promise<{
    pixels: Pixel[];
    width: number;
    height: number;
  }> => {
    if (!preview) return { pixels: [], width: 0, height: 0 };

    return new Promise((resolve) => {
      // Use native HTMLImageElement, not Next.js Image component
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          resolve({ pixels: [], width: 0, height: 0 });
          return;
        }

        const scale = Math.min(settings.maxWidth / img.width, settings.maxHeight / img.height, 1);
        const width = Math.floor(img.width * scale);
        const height = Math.floor(img.height * scale);

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ pixels: [], width: 0, height: 0 });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels: Pixel[] = [];

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = imageData.data[idx];
            const g = imageData.data[idx + 1];
            const b = imageData.data[idx + 2];
            const a = imageData.data[idx + 3];

            if (a < 128) continue;
            const brightness = (r + g + b) / 3;
            if (brightness < settings.threshold) continue;

            // Store at origin (0,0) - offset will be applied later
            pixels.push({ x, y, r, g, b });
          }
        }

        resolve({ pixels, width, height });
      };
      img.src = preview;
    });
  }, [preview, settings.maxWidth, settings.maxHeight, settings.threshold]);

  const handlePreview = useCallback(async () => {
    setProcessing(true);
    const pixels = await processImage();
    setPixelCount(pixels.length);
    setProcessing(false);
  }, [processImage]);

  // Send preview to canvas for interactive positioning
  const handlePreviewOnCanvas = useCallback(async () => {
    if (!onPreview) return;

    setProcessing(true);
    const { pixels: originalPixels, width, height } = await processImageAtOrigin();

    // Apply current offset to pixels
    const offsetX = settings.x;
    const offsetY = settings.y;
    const pixels = originalPixels
      .map((p) => ({
        ...p,
        x: p.x + offsetX,
        y: p.y + offsetY,
      }))
      .filter((p) => p.x >= 0 && p.x < CANVAS_WIDTH && p.y >= 0 && p.y < CANVAS_HEIGHT);

    setPixelCount(pixels.length);

    onPreview({
      pixels,
      originalPixels,
      offsetX,
      offsetY,
      width,
      height,
    });

    setIsOpen(false);
    setProcessing(false);
  }, [onPreview, processImageAtOrigin, settings.x, settings.y]);

  const handleImport = useCallback(async () => {
    setProcessing(true);
    const pixels = await processImage();
    onImport(pixels);
    setIsOpen(false);
    setPreview(null);
    setPixelCount(0);
    setProcessing(false);
  }, [processImage, onImport]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setPreview(null);
    setPixelCount(0);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
      >
        <Upload size={16} />
        <span>Import Image</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-background border border-secondary rounded-xl p-6 w-full max-w-lg mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Import Image</h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-secondary rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {!preview ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-secondary rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
          >
            <Upload className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-400 mb-2">Click to upload an image</p>
            <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-video bg-secondary rounded-lg overflow-hidden">
              <Image src={preview} alt="Preview" fill className="object-contain" unoptimized />
              <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs z-10">
                {originalDimensions.width} x {originalDimensions.height}
              </div>
            </div>

            {/* Size Presets */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Quick Resize</label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      const aspectRatio = originalDimensions.width / originalDimensions.height;
                      if (aspectRatio > 1) {
                        setSettings((s) => ({
                          ...s,
                          maxWidth: preset.width,
                          maxHeight: Math.round(preset.width / aspectRatio),
                        }));
                      } else {
                        setSettings((s) => ({
                          ...s,
                          maxWidth: Math.round(preset.height * aspectRatio),
                          maxHeight: preset.height,
                        }));
                      }
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      settings.maxWidth === preset.width || settings.maxHeight === preset.height
                        ? 'bg-primary text-black'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    {preset.name} ({preset.width}px)
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Canvas X</label>
                <input
                  type="number"
                  value={settings.x}
                  onChange={(e) => setSettings({ ...settings, x: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={CANVAS_WIDTH - 1}
                  className="w-full px-3 py-2 bg-secondary rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Canvas Y</label>
                <input
                  type="number"
                  value={settings.y}
                  onChange={(e) => setSettings({ ...settings, y: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={CANVAS_HEIGHT - 1}
                  className="w-full px-3 py-2 bg-secondary rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1 flex items-center gap-2">
                  <ZoomOut size={14} />
                  Max Width
                </label>
                <input
                  type="number"
                  value={settings.maxWidth}
                  onChange={(e) =>
                    setSettings({ ...settings, maxWidth: parseInt(e.target.value) || 10 })
                  }
                  min={1}
                  max={1000}
                  className="w-full px-3 py-2 bg-secondary rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1 flex items-center gap-2">
                  <Maximize2 size={14} />
                  Max Height
                </label>
                <input
                  type="number"
                  value={settings.maxHeight}
                  onChange={(e) =>
                    setSettings({ ...settings, maxHeight: parseInt(e.target.value) || 10 })
                  }
                  min={1}
                  max={1000}
                  className="w-full px-3 py-2 bg-secondary rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Background Threshold (skip dark pixels): {settings.threshold}
              </label>
              <input
                type="range"
                value={settings.threshold}
                onChange={(e) => setSettings({ ...settings, threshold: parseInt(e.target.value) })}
                min={0}
                max={100}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Include all</span>
                <span>Skip dark</span>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Pixels:</span>
                <span
                  className={`font-mono ${isPayloadTooLarge ? 'text-red-400' : 'text-primary'}`}
                >
                  {pixelCount > 0 ? pixelCount.toLocaleString() : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Payload size:</span>
                <span
                  className={`font-mono ${isPayloadTooLarge ? 'text-red-400' : 'text-gray-300'}`}
                >
                  {payloadSize > 0 ? `${(payloadSize / 1024).toFixed(1)} KB` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Est. fee (Inscription):</span>
                <span className="font-mono text-bitcoin">
                  ~{estimatedFee.toLocaleString()} sats
                </span>
              </div>
              {isPayloadTooLarge && (
                <div className="text-xs text-red-400 mt-2">⚠️ Too large! Reduce image size.</div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  onClick={handlePreview}
                  disabled={processing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50"
                >
                  {processing ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <ZoomIn size={16} />
                  )}
                  Count Pixels
                </button>
                <button
                  onClick={handleImport}
                  disabled={processing || pixelCount === 0 || isPayloadTooLarge}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/80 transition-colors disabled:opacity-50"
                >
                  {processing ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Check size={16} />
                  )}
                  Import {pixelCount > 0 ? `${pixelCount.toLocaleString()}` : ''}
                </button>
              </div>

              {/* Preview on canvas for interactive positioning */}
              {onPreview && (
                <button
                  onClick={handlePreviewOnCanvas}
                  disabled={processing || isPayloadTooLarge}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  {processing ? <Loader2 className="animate-spin" size={16} /> : <Move size={16} />}
                  Preview on Canvas (drag to position)
                </button>
              )}
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <canvas ref={canvasRef} className="hidden" />

        <p className="text-xs text-gray-500 mt-4">
          Tip: Smaller images = cheaper transactions. Use Inscription carrier for large images.
        </p>
      </div>
    </div>
  );
}
