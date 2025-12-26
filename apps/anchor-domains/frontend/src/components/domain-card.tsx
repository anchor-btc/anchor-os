'use client';

import Link from 'next/link';
import { Globe, Clock, Database, ExternalLink, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { DomainListItem, ResolveResponse, PendingTransaction } from '@/lib/api';
import { getRecordTypeColor, truncateTxid } from '@/lib/api';

interface DomainCardProps {
  domain: DomainListItem | ResolveResponse;
  showRecords?: boolean;
  pending?: PendingTransaction;
}

export function DomainCard({ domain, showRecords = false, pending }: DomainCardProps) {
  const isResolveResponse = 'records' in domain;
  const records = isResolveResponse ? (domain as ResolveResponse).records : null;

  return (
    <div
      className={`bg-slate-800/50 rounded-xl border p-6 transition-all ${
        pending
          ? 'border-yellow-500/50 animate-pulse'
          : 'border-slate-700 hover:border-bitcoin-orange/50'
      }`}
    >
      {/* Pending Badge */}
      {pending && (
        <div className="mb-3 flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 rounded-lg w-fit">
          <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />
          <span className="text-sm font-medium text-yellow-400">
            {pending.operation === 'register' ? 'Registering' : 'Updating'} - Awaiting confirmation
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${pending ? 'bg-yellow-500/20' : 'bg-bitcoin-orange/20'}`}
          >
            <Globe className={`h-6 w-6 ${pending ? 'text-yellow-400' : 'text-bitcoin-orange'}`} />
          </div>
          <div>
            <Link
              href={`/domain/${domain.name}`}
              className="text-xl font-bold text-white hover:text-bitcoin-orange transition-colors"
            >
              {domain.name}
            </Link>
            <p className="text-sm text-slate-400 font-mono">{domain.txid_prefix}</p>
          </div>
        </div>
        <Link
          href={`/domain/${domain.name}`}
          className="p-2 text-slate-400 hover:text-white transition-colors"
        >
          <ExternalLink className="h-5 w-5" />
        </Link>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
        <div className="flex items-center gap-1">
          <Database className="h-4 w-4" />
          <span>
            {'record_count' in domain ? domain.record_count : records?.length || 0} records
          </span>
        </div>
        {'created_at' in domain && domain.created_at && (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>
              {formatDistanceToNow(new Date(domain.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        )}
      </div>

      {/* Records Preview */}
      {showRecords && records && records.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-300">DNS Records:</p>
          <div className="space-y-1">
            {records.slice(0, 3).map((record, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 rounded-lg">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${getRecordTypeColor(
                    record.record_type
                  )}`}
                >
                  {record.record_type}
                </span>
                <span className="text-white font-mono text-sm truncate">{record.value}</span>
              </div>
            ))}
            {records.length > 3 && (
              <p className="text-sm text-slate-400 pl-2">+{records.length - 3} more records</p>
            )}
          </div>
        </div>
      )}

      {/* Transaction Info */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-500 font-mono">TX: {truncateTxid(domain.txid, 12)}</p>
      </div>
    </div>
  );
}
