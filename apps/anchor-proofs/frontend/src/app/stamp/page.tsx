'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileUpload, type FileUploadResult } from '@/components';
import { stampProof, mineBlocks, type StampRequest } from '@/lib/api';
import { HashAlgorithm, getAlgorithmName } from '@/lib/proof-encoder';
import { Loader2, CheckCircle, AlertCircle, FileCheck, Radio } from 'lucide-react';

// Carrier types matching anchor-core
const CARRIERS = [
  { id: 0, name: 'OP_RETURN', description: 'Standard, fast confirmation' },
  { id: 1, name: 'Inscription', description: 'Ordinals-style, permanent' },
  { id: 2, name: 'Stamps', description: 'Bare multisig, unprunable' },
  { id: 4, name: 'Witness Data', description: 'Tapscript, 75% fee discount' },
];

export default function StampPage() {
  const queryClient = useQueryClient();
  const [fileResult, setFileResult] = useState<FileUploadResult | null>(null);
  const [selectedAlgo, setSelectedAlgo] = useState<HashAlgorithm>(HashAlgorithm.SHA256);
  const [selectedCarrier, setSelectedCarrier] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [success, setSuccess] = useState<{ txid: string; carrier: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stampMutation = useMutation({
    mutationFn: async () => {
      if (!fileResult) throw new Error('No file selected');

      const hash =
        selectedAlgo === HashAlgorithm.SHA256 ? fileResult.sha256.hex : fileResult.sha512.hex;

      const request: StampRequest = {
        hash_algo: selectedAlgo === HashAlgorithm.SHA256 ? 'sha256' : 'sha512',
        file_hash: hash,
        filename: fileResult.filename,
        mime_type: fileResult.mimeType,
        file_size: fileResult.fileSize,
        description: description || undefined,
        carrier: selectedCarrier,
      };

      return stampProof(request);
    },
    onSuccess: async (data) => {
      setSuccess({ txid: data.txid, carrier: data.carrier_name });
      setError(null);
      // Mine a block to confirm
      try {
        await mineBlocks(1);
      } catch {
        // Ignore mining errors
      }
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to create proof');
      setSuccess(null);
    },
  });

  const handleFileProcessed = (result: FileUploadResult) => {
    setFileResult(result);
    setSuccess(null);
    setError(null);
  };

  const handleClear = () => {
    setFileResult(null);
    setSuccess(null);
    setError(null);
    setDescription('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileResult) return;
    stampMutation.mutate();
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
          <FileCheck className="w-5 h-5 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-bold text-white">Stamp a File</h1>
      </div>
      <p className="text-slate-400 mb-8">
        Create a proof of existence for any file. The file is hashed locally and only the hash is
        stored on Bitcoin.
      </p>

      {success ? (
        <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Proof Created!</h2>
          </div>
          <p className="text-slate-300 mb-4">
            Your file has been timestamped on the Bitcoin blockchain.
          </p>
          <div className="bg-slate-800/50 rounded-lg p-4 mb-4 space-y-3">
            <div>
              <p className="text-sm text-slate-400 mb-1">Transaction ID:</p>
              <p className="font-mono text-white break-all">{success.txid}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Carrier Used:</p>
              <p className="text-white">{success.carrier}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Stamp Another File
            </button>
            <a
              href={`http://localhost:4000/tx/${success.txid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
            >
              View in Explorer
            </a>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <label className="block text-sm font-medium text-slate-300 mb-4">Select File</label>
            <FileUpload
              onFileProcessed={handleFileProcessed}
              onClear={handleClear}
              disabled={stampMutation.isPending}
            />
          </div>

          {/* Algorithm Selection */}
          {fileResult && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <label className="block text-sm font-medium text-slate-300 mb-4">
                Hash Algorithm
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
                  <div className="text-xs text-slate-400 mt-1">32 bytes • Standard</div>
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
                  <div className="text-xs text-slate-400 mt-1">64 bytes • Enhanced</div>
                </button>
              </div>

              {/* Selected hash preview */}
              <div className="mt-4 bg-slate-700/50 rounded-lg p-3">
                <div className="text-xs font-medium text-slate-400 mb-1">
                  Selected Hash ({getAlgorithmName(selectedAlgo)})
                </div>
                <p className="font-mono text-xs text-white break-all">
                  {selectedAlgo === HashAlgorithm.SHA256
                    ? fileResult.sha256.hex
                    : fileResult.sha512.hex}
                </p>
              </div>
            </div>
          )}

          {/* Carrier Selection */}
          {fileResult && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <label className="block text-sm font-medium text-slate-300 mb-4">Carrier Type</label>
              <div className="grid grid-cols-2 gap-3">
                {CARRIERS.map((carrier) => (
                  <button
                    key={carrier.id}
                    type="button"
                    onClick={() => setSelectedCarrier(carrier.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedCarrier === carrier.id
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Radio
                        className={`w-4 h-4 ${
                          selectedCarrier === carrier.id ? 'text-emerald-500' : 'text-slate-500'
                        }`}
                      />
                      <span className="font-medium text-white">{carrier.name}</span>
                    </div>
                    <div className="text-xs text-slate-400 ml-6">{carrier.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {fileResult && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for this proof..."
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                rows={3}
                maxLength={255}
              />
              <div className="text-xs text-slate-400 mt-1 text-right">{description.length}/255</div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!fileResult || stampMutation.isPending}
            className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {stampMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating Proof...
              </>
            ) : (
              <>
                <FileCheck className="h-5 w-5" />
                Create Proof of Existence
              </>
            )}
          </button>
        </form>
      )}
    </main>
  );
}
