'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { getProofByHash, revokeProof, mineBlocks, getExplorerTxUrl } from '@/lib/api';
import { formatFileSize } from '@/lib/hash';
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Copy,
  Clock,
  File,
  Hash,
  Database,
  Blocks,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { useState } from 'react';

export default function ProofDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const hash = params.hash as string;
  const algo = searchParams.get('algo') || undefined;

  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [revokeSuccess, setRevokeSuccess] = useState(false);

  const {
    data: proof,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['proof', hash, algo],
    queryFn: () => getProofByHash(hash, algo),
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      if (!proof) throw new Error('No proof');
      return revokeProof(proof.file_hash, proof.hash_algo_name.toLowerCase().replace('-', ''));
    },
    onSuccess: async () => {
      setShowRevokeConfirm(false);
      setRevokeSuccess(true);
      try {
        await mineBlocks(1);
      } catch {}
      queryClient.invalidateQueries({ queryKey: ['proof', hash, algo] });
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (isLoading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      </main>
    );
  }

  if (error || !proof) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-12">
        <Link
          href="/proofs"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Proofs
        </Link>
        <div className="text-center py-20">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Proof Not Found</h2>
          <p className="text-slate-400">No proof exists for this hash in our records.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <Link
        href="/proofs"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Proofs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center">
            <File className="w-7 h-7 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{proof.filename || 'Unnamed file'}</h1>
            <p className="text-slate-400 mt-1">
              {proof.mime_type || 'application/octet-stream'}
              {proof.file_size && ` • ${formatFileSize(proof.file_size)}`}
            </p>
          </div>
        </div>

        {/* Status badge */}
        {proof.is_revoked ? (
          <span className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-full">
            <XCircle className="w-4 h-4" />
            Revoked
          </span>
        ) : (
          <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full">
            <CheckCircle className="w-4 h-4" />
            Valid
          </span>
        )}
      </div>

      {/* Revoke success */}
      {revokeSuccess && (
        <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <p className="text-yellow-300">
            Proof has been revoked. It may take a moment for the blockchain to confirm.
          </p>
        </div>
      )}

      {/* Description */}
      {proof.description && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 mb-6">
          <h2 className="text-sm font-medium text-slate-400 mb-2">Description</h2>
          <p className="text-white">{proof.description}</p>
        </div>
      )}

      {/* Hash Info */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 mb-6">
        <h2 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
          <Hash className="w-4 h-4" />
          File Hash ({proof.hash_algo_name})
        </h2>
        <div className="flex items-center justify-between gap-4 bg-slate-700/50 rounded-lg p-4">
          <code className="text-sm text-white break-all font-mono">{proof.file_hash}</code>
          <button
            onClick={() => copyToClipboard(proof.file_hash)}
            className="p-2 text-slate-400 hover:text-white transition-colors flex-shrink-0"
            title="Copy hash"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Transaction Info */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 mb-6">
        <h2 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
          <Database className="w-4 h-4" />
          Transaction Details
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 bg-slate-700/50 rounded-lg p-4">
            <div className="min-w-0 flex-1">
              <span className="text-xs text-slate-400">Transaction ID</span>
              <code className="block text-sm text-white break-all font-mono mt-1">
                {proof.txid}
              </code>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => copyToClipboard(proof.txid)}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                title="Copy txid"
              >
                <Copy className="w-4 h-4" />
              </button>
              <a
                href={getExplorerTxUrl(proof.txid)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-emerald-500 hover:text-emerald-400 transition-colors"
                title="View in explorer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Blocks className="w-3 h-3" />
                Block Height
              </span>
              <p className="text-white font-medium mt-1">
                {proof.block_height?.toLocaleString() || 'Pending'}
              </p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Timestamp
              </span>
              <p className="text-white font-medium mt-1">
                {new Date(proof.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Revoked Info */}
      {proof.is_revoked && proof.revoked_txid && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium text-red-400 mb-4 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Revocation Details
          </h2>
          <div className="flex items-center justify-between gap-4 bg-slate-800/50 rounded-lg p-4">
            <div className="min-w-0 flex-1">
              <span className="text-xs text-slate-400">Revocation Transaction</span>
              <code className="block text-sm text-white break-all font-mono mt-1">
                {proof.revoked_txid}
              </code>
            </div>
            <a
              href={getExplorerTxUrl(proof.revoked_txid!)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-emerald-500 hover:text-emerald-400 transition-colors flex-shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Link
          href={`/certificate/${proof.file_hash}?algo=${proof.hash_algo_name.toLowerCase().replace('-', '')}`}
          className="flex-1 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Download Certificate
        </Link>

        {!proof.is_revoked && (
          <button
            onClick={() => setShowRevokeConfirm(true)}
            className="px-6 py-3 bg-red-500/20 text-red-400 font-medium rounded-xl hover:bg-red-500/30 transition-colors flex items-center gap-2"
          >
            <XCircle className="w-5 h-5" />
            Revoke
          </button>
        )}
      </div>

      {/* Revoke Confirmation Modal */}
      {showRevokeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-2">Revoke Proof?</h2>
            <p className="text-slate-400 mb-6">
              This action will permanently mark this proof as revoked on the Bitcoin blockchain.
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRevokeConfirm(false)}
                className="flex-1 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => revokeMutation.mutate()}
                disabled={revokeMutation.isPending}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {revokeMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Revoke Proof'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
