"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components";
import {
  checkAvailability,
  registerDomain,
  mineBlocks,
  type DnsRecordInput,
} from "@/lib/api";
import {
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

const RECORD_TYPES = ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "SRV"];

interface RecordFormData {
  id: number;
  record_type: string;
  value: string;
  ttl: number;
  priority?: number;
  weight?: number;
  port?: number;
}

export default function RegisterPage() {
  const queryClient = useQueryClient();
  const [domainName, setDomainName] = useState("");
  const [availability, setAvailability] = useState<boolean | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [records, setRecords] = useState<RecordFormData[]>([
    { id: 1, record_type: "A", value: "", ttl: 300 },
  ]);
  const [nextId, setNextId] = useState(2);
  const [success, setSuccess] = useState<{ txid: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: async () => {
      const dnsRecords: DnsRecordInput[] = records
        .filter((r) => r.value.trim())
        .map((r) => ({
          record_type: r.record_type,
          value: r.value,
          ttl: r.ttl,
          priority: r.priority,
          weight: r.weight,
          port: r.port,
        }));

      const fullName = domainName.endsWith(".bit")
        ? domainName
        : `${domainName}.bit`;

      return registerDomain(fullName, dnsRecords);
    },
    onSuccess: async (data) => {
      setSuccess({ txid: data.txid });
      setError(null);
      // Mine a block to confirm the transaction
      try {
        await mineBlocks(1);
      } catch {
        // Ignore mining errors (might be on mainnet)
      }
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-domains"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Registration failed");
      setSuccess(null);
    },
  });

  const handleCheckAvailability = async () => {
    if (!domainName.trim()) return;

    setIsCheckingAvailability(true);
    setAvailability(null);

    try {
      const fullName = domainName.endsWith(".bit")
        ? domainName
        : `${domainName}.bit`;
      const result = await checkAvailability(fullName);
      setAvailability(result.available);
    } catch {
      setAvailability(null);
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const addRecord = () => {
    setRecords([
      ...records,
      { id: nextId, record_type: "A", value: "", ttl: 300 },
    ]);
    setNextId(nextId + 1);
  };

  const removeRecord = (id: number) => {
    if (records.length > 1) {
      setRecords(records.filter((r) => r.id !== id));
    }
  };

  const updateRecord = (id: number, field: string, value: string | number) => {
    setRecords(
      records.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName.trim() || !availability) return;
    registerMutation.mutate();
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">
          Register a .bit Domain
        </h1>
        <p className="text-slate-400 mb-8">
          Secure your domain on the Bitcoin blockchain. First-come, first-served.
        </p>

        {success ? (
          <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <h2 className="text-xl font-bold text-white">
                Domain Registered!
              </h2>
            </div>
            <p className="text-slate-300 mb-4">
              Your domain has been registered successfully.
            </p>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-sm text-slate-400">Transaction ID:</p>
              <p className="font-mono text-white break-all">{success.txid}</p>
            </div>
            <button
              onClick={() => {
                setSuccess(null);
                setDomainName("");
                setRecords([{ id: 1, record_type: "A", value: "", ttl: 300 }]);
                setAvailability(null);
              }}
              className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Register Another Domain
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Domain Name */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Domain Name
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={domainName}
                    onChange={(e) => {
                      setDomainName(e.target.value.toLowerCase());
                      setAvailability(null);
                    }}
                    placeholder="mysite"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    .bit
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCheckAvailability}
                  disabled={!domainName.trim() || isCheckingAvailability}
                  className="px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  {isCheckingAvailability ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Check"
                  )}
                </button>
              </div>

              {/* Availability Status */}
              {availability !== null && (
                <div
                  className={`mt-3 flex items-center gap-2 ${
                    availability ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {availability ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Domain is available!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      <span>Domain is already registered</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* DNS Records */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-slate-300">
                  DNS Records
                </label>
                <button
                  type="button"
                  onClick={addRecord}
                  className="flex items-center gap-1 text-bitcoin-orange hover:text-orange-400 transition-colors text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Record
                </button>
              </div>

              <div className="space-y-4">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="flex gap-3 items-start p-4 bg-slate-700/30 rounded-lg"
                  >
                    {/* Record Type */}
                    <select
                      value={record.record_type}
                      onChange={(e) =>
                        updateRecord(record.id, "record_type", e.target.value)
                      }
                      className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
                    >
                      {RECORD_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>

                    {/* Value */}
                    <input
                      type="text"
                      value={record.value}
                      onChange={(e) =>
                        updateRecord(record.id, "value", e.target.value)
                      }
                      placeholder={
                        record.record_type === "A"
                          ? "93.184.216.34"
                          : record.record_type === "AAAA"
                          ? "2001:db8::1"
                          : "value"
                      }
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
                    />

                    {/* TTL */}
                    <input
                      type="number"
                      value={record.ttl}
                      onChange={(e) =>
                        updateRecord(record.id, "ttl", parseInt(e.target.value))
                      }
                      className="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
                      placeholder="TTL"
                    />

                    {/* Priority (for MX/SRV) */}
                    {(record.record_type === "MX" ||
                      record.record_type === "SRV") && (
                      <input
                        type="number"
                        value={record.priority || ""}
                        onChange={(e) =>
                          updateRecord(
                            record.id,
                            "priority",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
                        placeholder="Pri"
                      />
                    )}

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => removeRecord(record.id)}
                      disabled={records.length === 1}
                      className="p-2 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={
                !domainName.trim() ||
                !availability ||
                registerMutation.isPending
              }
              className="w-full py-4 bg-bitcoin-orange text-white font-bold rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Registering...
                </>
              ) : (
                "Register Domain"
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
