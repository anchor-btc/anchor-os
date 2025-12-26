'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { FileUpload, ProofCard, type FileUploadResult } from '@/components';
import { validateHash, type ValidationResult } from '@/lib/api';
import { HashAlgorithm, getAlgorithmName } from '@/lib/proof-encoder';
import { Loader2, CheckCircle, XCircle, Shield, AlertCircle } from 'lucide-react';

export default function ValidatePage() {
  const [fileResult, setFileResult] = useState<FileUploadResult | null>(null);
  const [selectedAlgo, setSelectedAlgo] = useState<HashAlgorithm>(HashAlgorithm.SHA256);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateMutation = useMutation({
    mutationFn: async () => {
      if (!fileResult) throw new Error('No file selected');

      const hash =
        selectedAlgo === HashAlgorithm.SHA256 ? fileResult.sha256.hex : fileResult.sha512.hex;

      return validateHash(hash, selectedAlgo === HashAlgorithm.SHA256 ? 'sha256' : 'sha512');
    },
    onSuccess: (data) => {
      setValidationResult(data);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Validation failed');
      setValidationResult(null);
    },
  });

  const handleFileProcessed = (result: FileUploadResult) => {
    setFileResult(result);
    setValidationResult(null);
    setError(null);
  };

  const handleClear = () => {
    setFileResult(null);
    setValidationResult(null);
    setError(null);
  };

  const handleValidate = () => {
    if (!fileResult) return;
    validateMutation.mutate();
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-bold text-white">Validate a File</h1>
      </div>
      <p className="text-slate-400 mb-8">
        Verify if a file has been timestamped on Bitcoin. Upload the file and we will check if its
        hash exists in our records.
      </p>

      <div className="space-y-6">
        {/* File Upload */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <label className="block text-sm font-medium text-slate-300 mb-4">
            Select File to Validate
          </label>
          <FileUpload
            onFileProcessed={handleFileProcessed}
            onClear={handleClear}
            disabled={validateMutation.isPending}
          />
        </div>

        {/* Algorithm Selection */}
        {fileResult && !validationResult && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <label className="block text-sm font-medium text-slate-300 mb-4">
              Hash Algorithm to Check
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setSelectedAlgo(HashAlgorithm.SHA256)}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  selectedAlgo === HashAlgorithm.SHA256
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="font-medium text-white">SHA-256</div>
                <div className="text-xs text-slate-400 mt-1">32 bytes</div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedAlgo(HashAlgorithm.SHA512)}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  selectedAlgo === HashAlgorithm.SHA512
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="font-medium text-white">SHA-512</div>
                <div className="text-xs text-slate-400 mt-1">64 bytes</div>
              </button>
            </div>

            <button
              onClick={handleValidate}
              disabled={validateMutation.isPending}
              className="mt-4 w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {validateMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5" />
                  Validate File
                </>
              )}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Validation Result */}
        {validationResult && (
          <div
            className={`rounded-xl border p-6 ${
              validationResult.is_valid
                ? 'bg-emerald-500/20 border-emerald-500/50'
                : 'bg-red-500/20 border-red-500/50'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              {validationResult.is_valid ? (
                <>
                  <CheckCircle className="h-8 w-8 text-emerald-400" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Verified!</h2>
                    <p className="text-emerald-300">This file has been timestamped on Bitcoin</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-8 w-8 text-red-400" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Not Found</h2>
                    <p className="text-red-300">No proof of existence found for this file</p>
                  </div>
                </>
              )}
            </div>

            {/* Show file info */}
            {fileResult && (
              <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Filename:</span>
                    <p className="text-white truncate">{fileResult.filename}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Algorithm:</span>
                    <p className="text-white">{getAlgorithmName(selectedAlgo)}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-xs text-slate-400">Hash:</span>
                  <p className="font-mono text-xs text-white break-all mt-1">
                    {selectedAlgo === HashAlgorithm.SHA256
                      ? fileResult.sha256.hex
                      : fileResult.sha512.hex}
                  </p>
                </div>
              </div>
            )}

            {/* Show proof details if found */}
            {validationResult.is_valid && validationResult.proof && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3">Proof Details</h3>
                <ProofCard proof={validationResult.proof} showDetails />
              </div>
            )}

            {/* Try again button */}
            <button
              onClick={handleClear}
              className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Validate Another File
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
