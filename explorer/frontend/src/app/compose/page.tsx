"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMessage,
  fetchWalletBalance,
  fetchNewAddress,
  mineBlocks,
  CARRIER_OPTIONS,
} from "@/lib/api";
import {
  PenLine,
  Send,
  Loader2,
  Wallet,
  Copy,
  Check,
  Hammer,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

function ComposeForm() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  
  // Get initial values from URL params
  const parentFromUrl = searchParams.get("parent") || "";
  const voutFromUrl = searchParams.get("vout") || "0";
  
  const [body, setBody] = useState("");
  const [parentTxid, setParentTxid] = useState(parentFromUrl);
  const [parentVout, setParentVout] = useState(voutFromUrl);
  const [carrier, setCarrier] = useState(0); // Default to OP_RETURN
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ txid: string; vout: number; carrier?: number } | null>(
    null
  );
  
  // Update state when URL params change
  useEffect(() => {
    if (parentFromUrl) {
      setParentTxid(parentFromUrl);
    }
    if (voutFromUrl) {
      setParentVout(voutFromUrl);
    }
  }, [parentFromUrl, voutFromUrl]);

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: fetchWalletBalance,
  });

  const { data: address, refetch: refetchAddress } = useQuery({
    queryKey: ["wallet-address"],
    queryFn: fetchNewAddress,
    enabled: false,
  });

  const createMutation = useMutation({
    mutationFn: async (req: Parameters<typeof createMessage>[0]) => {
      // Create the message
      const result = await createMessage(req);
      
      // Automatically mine a block to confirm the transaction
      await mineBlocks(1);
      
      // Wait a bit for the indexer to pick it up
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return result;
    },
    onSuccess: (data) => {
      setSuccess({ txid: data.txid, vout: data.vout, carrier: data.carrier });
      setBody("");
      setCarrier(0); // Reset to default
      setError(null);
      
      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["roots"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      
      // If it was a reply, invalidate the parent's replies cache
      if (parentTxid) {
        queryClient.invalidateQueries({ queryKey: ["replies", parentTxid, parseInt(parentVout)] });
        queryClient.invalidateQueries({ queryKey: ["message", parentTxid, parseInt(parentVout)] });
        queryClient.invalidateQueries({ queryKey: ["thread", parentTxid, parseInt(parentVout)] });
      }
      
      // Clear parent fields after invalidation
      setParentTxid("");
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess(null);
    },
  });

  const mineMutation = useMutation({
    mutationFn: () => mineBlocks(1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    createMutation.mutate({
      kind: 1, // Text
      body: body.trim(),
      parent_txid: parentTxid || undefined,
      parent_vout: parentTxid ? parseInt(parentVout) : undefined,
      carrier,
    });
  };

  const handleGetAddress = async () => {
    const result = await refetchAddress();
    if (result.data?.address) {
      navigator.clipboard.writeText(result.data.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <PenLine className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Compose Message</h1>
      </div>

      {/* Wallet Info */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <span className="font-medium">Wallet Balance</span>
          </div>
          {balanceLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="font-mono">
              {balance?.total.toFixed(8)} BTC
            </span>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleGetAddress}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copied!" : "Get Address"}
          </button>
          <button
            onClick={() => mineMutation.mutate()}
            disabled={mineMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm disabled:opacity-50"
          >
            {mineMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Hammer className="h-4 w-4" />
            )}
            Mine Block
          </button>
        </div>

        {address?.address && (
          <p className="mt-2 text-sm font-mono text-muted-foreground break-all">
            {address.address}
          </p>
        )}
      </div>

      {/* Reply Info Banner */}
      {parentTxid && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
          <p className="text-sm font-medium text-primary mb-1">Replying to message:</p>
          <Link
            href={`/message/${parentTxid}/${parentVout}`}
            className="text-sm font-mono text-primary hover:underline break-all"
          >
            {parentTxid}:{parentVout}
          </Link>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-500">Error</p>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-medium text-green-500">Message Created!</p>
            {success.carrier !== undefined && (
              <span className="text-xs bg-green-500/20 text-green-600 px-2 py-1 rounded-full">
                {CARRIER_OPTIONS.find(c => c.value === success.carrier)?.icon}{" "}
                {CARRIER_OPTIONS.find(c => c.value === success.carrier)?.label}
              </span>
            )}
          </div>
          <Link
            href={`/message/${success.txid}/${success.vout}`}
            className="text-sm text-green-400 hover:underline font-mono break-all"
          >
            {success.txid}:{success.vout}
          </Link>
        </div>
      )}

      {/* Compose Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message here..."
            rows={5}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>

        {/* Carrier Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Data Carrier
          </label>
          <div className="grid grid-cols-3 gap-3">
            {CARRIER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setCarrier(option.value)}
                className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                  carrier === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 bg-secondary"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{option.icon}</span>
                  <span className="font-medium">{option.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{option.description}</p>
                {carrier === option.value && (
                  <div className="absolute top-2 right-2">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}
              </button>
            ))}
          </div>
          {carrier === 2 && (
            <p className="mt-2 text-xs text-yellow-600 bg-yellow-50 p-2 rounded-lg">
              ⚠️ Stamps are permanent and cannot be pruned. They increase storage requirements for all Bitcoin nodes.
            </p>
          )}
          {carrier === 3 && (
            <p className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded-lg">
              🔗 Taproot Annex transactions are valid but not relayed by standard nodes. They need libre relay nodes or direct miner submission.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Parent TXID{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              type="text"
              value={parentTxid}
              onChange={(e) => setParentTxid(e.target.value)}
              placeholder="Reply to message..."
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Parent Vout
            </label>
            <input
              type="number"
              value={parentVout}
              onChange={(e) => setParentVout(e.target.value)}
              min="0"
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!body.trim() || createMutation.isPending}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          {createMutation.isPending ? "Creating & Mining..." : "Send Message"}
        </button>
      </form>

      {/* Info */}
      <div className="text-sm text-muted-foreground space-y-2">
        <p>
          Messages are embedded in Bitcoin transactions using different data carriers:
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li><strong>OP_RETURN</strong> - Standard prunable output, 80 bytes (100KB in v30+)</li>
          <li><strong>Inscription</strong> - Ordinals-style witness data, up to ~4MB with 75% fee discount</li>
          <li><strong>Stamps</strong> - Permanent bare multisig, stored in UTXO set forever</li>
        </ul>
        <p>
          If you provide a Parent TXID, your message will be anchored as a reply
          to that message.
        </p>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="max-w-2xl mx-auto flex justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ComposeForm />
    </Suspense>
  );
}
