"use client";

import Link from "next/link";
import { File, ExternalLink, Clock, CheckCircle, XCircle } from "lucide-react";
import { formatFileSize, truncateHash } from "@/lib/hash";
import { getExplorerTxUrl } from "@/lib/api";

interface ProofCardProps {
  proof: {
    id: number;
    hash_algo: number;
    hash_algo_name: string;
    file_hash: string;
    filename?: string | null;
    mime_type?: string | null;
    file_size?: number | null;
    txid: string;
    txid_prefix: string;
    block_height?: number | null;
    is_revoked: boolean;
    created_at: string;
  };
  showDetails?: boolean;
}

export function ProofCard({ proof, showDetails = false }: ProofCardProps) {
  const mimeCategory = proof.mime_type?.split("/")[0] || "unknown";

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-slate-700 rounded-lg">
            <File className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-medium truncate">
                {proof.filename || "Unnamed file"}
              </h3>
              {proof.is_revoked ? (
                <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
                  <XCircle className="w-3 h-3" />
                  Revoked
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Valid
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              {proof.mime_type || "application/octet-stream"}
              {proof.file_size && ` • ${formatFileSize(proof.file_size)}`}
            </p>
          </div>
        </div>

        <Link
          href={`/proof/${proof.file_hash}?algo=${proof.hash_algo_name.toLowerCase().replace("-", "")}`}
          className="flex items-center gap-1 text-sm text-emerald-500 hover:text-emerald-400"
        >
          View
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {showDetails && (
        <div className="mt-4 space-y-3">
          {/* Hash */}
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-400">
                {proof.hash_algo_name} Hash
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(proof.file_hash)}
                className="text-xs text-emerald-500 hover:underline"
              >
                Copy
              </button>
            </div>
            <p className="font-mono text-xs text-white break-all">
              {proof.file_hash}
            </p>
          </div>

          {/* Transaction */}
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-400">Transaction</span>
              <a
                href={getExplorerTxUrl(proof.txid)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-500 hover:underline flex items-center gap-1"
              >
                Explorer
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="font-mono text-xs text-white break-all">
              {proof.txid}
            </p>
          </div>
        </div>
      )}

      {/* Footer info */}
      <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between text-sm text-slate-400">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{new Date(proof.created_at).toLocaleDateString()}</span>
        </div>
        {proof.block_height && (
          <span>Block #{proof.block_height.toLocaleString()}</span>
        )}
      </div>
    </div>
  );
}
