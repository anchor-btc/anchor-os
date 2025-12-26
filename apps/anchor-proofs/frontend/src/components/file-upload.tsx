'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, File, X, Loader2 } from 'lucide-react';
import { hashFileBoth, getFileMetadata, formatFileSize, type HashResult } from '@/lib/hash';
import { HashAlgorithm } from '@/lib/proof-encoder';

export interface FileUploadResult {
  file: File;
  filename: string;
  mimeType: string;
  fileSize: number;
  sha256: HashResult;
  sha512: HashResult;
}

interface FileUploadProps {
  onFileProcessed: (result: FileUploadResult) => void;
  onClear?: () => void;
  selectedAlgorithm?: HashAlgorithm;
  disabled?: boolean;
}

export function FileUpload({ onFileProcessed, onClear, disabled = false }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedFile, setProcessedFile] = useState<FileUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setProgress(0);
      setError(null);

      try {
        // Get file metadata
        const metadata = getFileMetadata(file);

        // Generate both hashes
        const { sha256, sha512 } = await hashFileBoth(file, setProgress);

        const result: FileUploadResult = {
          file,
          filename: metadata.filename,
          mimeType: metadata.mimeType,
          fileSize: metadata.fileSize,
          sha256,
          sha512,
        };

        setProcessedFile(result);
        onFileProcessed(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process file');
      } finally {
        setIsProcessing(false);
        setProgress(0);
      }
    },
    [onFileProcessed]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled || isProcessing) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFile(files[0]);
      }
    },
    [disabled, isProcessing, processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled || isProcessing) return;

      const files = e.target.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    },
    [disabled, isProcessing, processFile]
  );

  const handleClear = useCallback(() => {
    setProcessedFile(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onClear?.();
  }, [onClear]);

  const handleClick = useCallback(() => {
    if (!disabled && !isProcessing) {
      inputRef.current?.click();
    }
  }, [disabled, isProcessing]);

  return (
    <div className="w-full">
      {/* Drop zone */}
      {!processedFile && (
        <div
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-200
            ${isDragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600 hover:border-slate-500'}
            ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            disabled={disabled || isProcessing}
          />

          {isProcessing ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 text-emerald-500 animate-spin" />
              <div className="text-white">Processing file...</div>
              <div className="w-full max-w-xs bg-slate-700 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-sm text-slate-400">{progress}%</div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Upload className="h-12 w-12 text-slate-400" />
              <div>
                <p className="text-white font-medium">
                  Drag and drop a file here, or click to select
                </p>
                <p className="text-sm text-slate-400 mt-1">Any file type supported</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Processed file display */}
      {processedFile && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-700 rounded-lg">
                <File className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{processedFile.filename}</p>
                <p className="text-sm text-slate-400">
                  {processedFile.mimeType} • {formatFileSize(processedFile.fileSize)}
                </p>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              disabled={disabled}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Hash results */}
          <div className="mt-4 space-y-3">
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-400">SHA-256</span>
                <button
                  onClick={() => navigator.clipboard.writeText(processedFile.sha256.hex)}
                  className="text-xs text-emerald-500 hover:underline"
                >
                  Copy
                </button>
              </div>
              <p className="font-mono text-xs text-white break-all">{processedFile.sha256.hex}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-400">SHA-512</span>
                <button
                  onClick={() => navigator.clipboard.writeText(processedFile.sha512.hex)}
                  className="text-xs text-emerald-500 hover:underline"
                >
                  Copy
                </button>
              </div>
              <p className="font-mono text-xs text-white break-all">{processedFile.sha512.hex}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
          <p className="text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
