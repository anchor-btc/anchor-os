"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Header } from "@/components";
import { getDomain, getDomainHistory, getRecordTypeColor, truncateTxid } from "@/lib/api";
import {
  Globe,
  Clock,
  Database,
  History,
  ExternalLink,
  ArrowLeft,
  Loader2,
  Copy,
  CheckCircle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";

export default function DomainDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const decodedName = decodeURIComponent(name);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: domain, isLoading, error } = useQuery({
    queryKey: ["domain", decodedName],
    queryFn: () => getDomain(decodedName),
  });

  const { data: history } = useQuery({
    queryKey: ["domain-history", decodedName],
    queryFn: () => getDomainHistory(decodedName),
    enabled: !!domain,
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-bitcoin-orange" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !domain) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center py-24">
            <Globe className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Domain Not Found
            </h1>
            <p className="text-slate-400 mb-4">
              The domain &quot;{decodedName}&quot; is not registered.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-4 py-2 bg-bitcoin-orange text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Register this domain
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Back Link */}
        <Link
          href="/domains"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to domains
        </Link>

        {/* Domain Header */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-bitcoin-orange/20 rounded-xl">
                <Globe className="h-10 w-10 text-bitcoin-orange" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{domain.name}</h1>
                <p className="text-slate-400 font-mono text-sm">
                  {domain.txid_prefix}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Clock className="h-4 w-4" />
              <span>
                Registered{" "}
                {formatDistanceToNow(new Date(domain.created_at), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-700">
            <div>
              <p className="text-sm text-slate-400">Records</p>
              <p className="text-xl font-bold text-white">
                {domain.records.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Block Height</p>
              <p className="text-xl font-bold text-white">
                {domain.block_height || "Pending"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Last Updated</p>
              <p className="text-xl font-bold text-white">
                {formatDistanceToNow(new Date(domain.updated_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Transaction Info */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Transaction Info
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <div>
                <p className="text-sm text-slate-400">Current Transaction</p>
                <p className="font-mono text-white">{truncateTxid(domain.txid, 16)}</p>
              </div>
              <button
                onClick={() => copyToClipboard(domain.txid, "txid")}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                {copiedField === "txid" ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <div>
                <p className="text-sm text-slate-400">Owner Transaction</p>
                <p className="font-mono text-white">
                  {truncateTxid(domain.owner_txid, 16)}
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(domain.owner_txid, "owner")}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                {copiedField === "owner" ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* DNS Records */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Database className="h-5 w-5" />
            DNS Records
          </h2>

          {domain.records.length > 0 ? (
            <div className="space-y-2">
              {domain.records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-lg"
                >
                  <span
                    className={`px-3 py-1 rounded font-medium text-sm ${getRecordTypeColor(
                      record.record_type
                    )}`}
                  >
                    {record.record_type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-white truncate">
                      {record.value}
                    </p>
                    <p className="text-xs text-slate-400">
                      TTL: {record.ttl}s
                      {record.priority !== undefined &&
                        ` • Priority: ${record.priority}`}
                      {record.port !== undefined && ` • Port: ${record.port}`}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(record.value, `record-${record.id}`)
                    }
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedField === `record-${record.id}` ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-4">No records found</p>
          )}
        </div>

        {/* History */}
        {history && history.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <History className="h-5 w-5" />
              History
            </h2>

            <div className="space-y-2">
              {history.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        entry.operation === "register"
                          ? "bg-green-500/20 text-green-400"
                          : entry.operation === "update"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-purple-500/20 text-purple-400"
                      }`}
                    >
                      {entry.operation}
                    </span>
                    <span className="font-mono text-sm text-slate-300">
                      {truncateTxid(entry.txid, 8)}
                    </span>
                  </div>
                  <div className="text-right">
                    {entry.block_height && (
                      <p className="text-sm text-slate-400">
                        Block #{entry.block_height}
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      {format(new Date(entry.created_at), "PPp")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
