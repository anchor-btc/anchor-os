'use client';

import { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useTranslation } from 'react-i18next';
import { X, Check, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImageBase64: string) => void;
  onCancel: () => void;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
  const { t } = useTranslation();
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }, []);

  const getCroppedImg = useCallback(async () => {
    if (!imgRef.current || !completedCrop) return;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Set canvas size to output size (256x256 for profile pictures)
    const outputSize = 256;
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Create circular clip
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Draw the cropped image
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      outputSize,
      outputSize
    );

    // Convert to base64
    const base64 = canvas.toDataURL('image/png', 0.9);
    onCropComplete(base64);
  }, [completedCrop, onCropComplete]);

  const handleReset = () => {
    setScale(1);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, 1));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            {t('profile.cropImage', 'Crop your photo')}
          </h3>
          <button onClick={onCancel} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {t('profile.cropHint', 'Drag to adjust the crop area for your profile picture')}
        </p>

        {/* Crop Area */}
        <div className="relative bg-black/50 rounded-xl overflow-hidden flex items-center justify-center min-h-[300px]">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={1}
            circularCrop
            className="max-h-[400px]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={onImageLoad}
              style={{ transform: `scale(${scale})` }}
              className="max-h-[400px] transition-transform"
            />
          </ReactCrop>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${((scale - 0.5) / 1.5) * 100}%` }}
            />
          </div>
          <button
            onClick={() => setScale((s) => Math.min(2, s + 0.1))}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 hover:bg-muted rounded-lg transition-colors ml-2"
            title="Reset"
          >
            <RotateCcw className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Preview */}
        <div className="flex items-center justify-center gap-4 mt-4 p-4 bg-muted/50 rounded-xl">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-2">{t('profile.preview', 'Preview')}</p>
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-orange-500/20 border-2 border-primary/20 mx-auto">
              {completedCrop && imgRef.current && (
                <canvas
                  id="preview-canvas"
                  className="w-full h-full object-cover"
                  style={{ display: 'none' }}
                />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt="Preview"
                className="w-full h-full object-cover"
                style={{
                  objectPosition: completedCrop
                    ? `${-completedCrop.x * (64 / completedCrop.width)}px ${-completedCrop.y * (64 / completedCrop.height)}px`
                    : 'center',
                  transform: completedCrop
                    ? `scale(${((imgRef.current?.width || 64) / completedCrop.width) * (64 / (imgRef.current?.width || 64))})`
                    : 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={getCroppedImg}
            disabled={!completedCrop}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors',
              'bg-primary text-primary-foreground hover:opacity-90',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Check className="w-4 h-4" />
            {t('profile.applyCrop', 'Apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
