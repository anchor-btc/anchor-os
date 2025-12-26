'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input, Container } from '@AnchorProtocol/ui';
import {
  createMessage,
  fetchWalletBalance,
  fetchNewAddress,
  mineBlocks,
  CARRIER_OPTIONS,
  saveMyMessageRef,
} from '@/lib/api';
import { PenLine, Send, Loader2, Wallet, Copy, Check, Hammer, AlertCircle } from 'lucide-react';
import Link from 'next/link';

function ComposeForm() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  // Get initial values from URL params
  const parentFromUrl = searchParams.get('parent') || '';
  const voutFromUrl = searchParams.get('vout') || '0';

  const [body, setBody] = useState('');
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
    queryKey: ['wallet-balance'],
    queryFn: fetchWalletBalance,
  });

  const { data: address, refetch: refetchAddress } = useQuery({
    queryKey: ['wallet-address'],
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
      await new Promise((resolve) => setTimeout(resolve, 2000));

      return result;
    },
    onSuccess: (data) => {
      setSuccess({ txid: data.txid, vout: data.vout, carrier: data.carrier });
      setBody('');
      setCarrier(0); // Reset to default
      setError(null);

      // Save to localStorage for "My Threads" feature
      saveMyMessageRef({
        txid: data.txid,
        vout: data.vout,
        createdAt: new Date().toISOString(),
        isReply: !!parentTxid,
      });

      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['roots'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['my-messages'] }); // Also invalidate my messages

      // If it was a reply, invalidate the parent's replies cache
      if (parentTxid) {
        queryClient.invalidateQueries({ queryKey: ['replies', parentTxid, parseInt(parentVout)] });
        queryClient.invalidateQueries({ queryKey: ['message', parentTxid, parseInt(parentVout)] });
        queryClient.invalidateQueries({ queryKey: ['thread', parentTxid, parseInt(parentVout)] });
      }

      // Clear parent fields after invalidation
      setParentTxid('');
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess(null);
    },
  });

  const mineMutation = useMutation({
    mutationFn: () => mineBlocks(1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
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
    <Container size="md" className="space-y-8">
      <div className="flex items-center gap-3">
        <PenLine className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Compose Message</h1>
      </div>

      {/* Wallet Info */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <span className="font-medium text-foreground">Wallet Balance</span>
          </div>
          {balanceLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="font-mono text-foreground">{balance?.total.toFixed(8)} BTC</span>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="secondary" size="sm" onClick={handleGetAddress}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Get Address'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => mineMutation.mutate()}
            disabled={mineMutation.isPending}
          >
            {mineMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Hammer className="h-4 w-4" />
            )}
            Mine Block
          </Button>
        </div>

        {address?.address && (
          <p className="mt-2 text-sm font-mono text-muted-foreground break-all">
            {address.address}
          </p>
        )}
      </Card>

      {/* Reply Info Banner */}
      {parentTxid && (
        <Card className="p-4 bg-primary/10 border-primary/30">
          <p className="text-sm font-medium text-primary mb-1">Replying to message:</p>
          <Link
            href={`/message/${parentTxid}/${parentVout}`}
            className="text-sm font-mono text-primary hover:underline break-all"
          >
            {parentTxid}:{parentVout}
          </Link>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="p-4 bg-destructive/10 border-destructive/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Error</p>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Success */}
      {success && (
        <Card className="p-4 bg-success/10 border-success/30">
          <div className="flex items-center justify-between mb-2">
            <p className="font-medium text-success">Message Created!</p>
            {success.carrier !== undefined && (
              <span className="text-xs bg-success/20 text-success px-2 py-1 rounded-full">
                {CARRIER_OPTIONS.find((c) => c.value === success.carrier)?.icon}{' '}
                {CARRIER_OPTIONS.find((c) => c.value === success.carrier)?.label}
              </span>
            )}
          </div>
          <Link
            href={`/message/${success.txid}/${success.vout}`}
            className="text-sm text-success/80 hover:underline font-mono break-all"
          >
            {success.txid}:{success.vout}
          </Link>
        </Card>
      )}

      {/* Compose Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message here..."
            rows={5}
            className="w-full bg-secondary border border-input rounded-md px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </div>

        {/* Carrier Selection */}
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">Data Carrier</label>
          <div className="grid grid-cols-3 gap-3">
            {CARRIER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setCarrier(option.value)}
                className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                  carrier === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 bg-secondary'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{option.icon}</span>
                  <span className="font-medium text-foreground">{option.label}</span>
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
            <p className="mt-2 text-xs text-warning bg-warning/10 p-2 rounded-lg">
              Stamps are permanent and cannot be pruned. They increase storage requirements for all
              Bitcoin nodes.
            </p>
          )}
          {carrier === 3 && (
            <p className="mt-2 text-xs text-primary bg-primary/10 p-2 rounded-lg">
              Taproot Annex transactions are valid but not relayed by standard nodes. They need
              libre relay nodes or direct miner submission.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              Parent TXID <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              type="text"
              value={parentTxid}
              onChange={(e) => setParentTxid(e.target.value)}
              placeholder="Reply to message..."
              className="font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">Parent Vout</label>
            <Input
              type="number"
              value={parentVout}
              onChange={(e) => setParentVout(e.target.value)}
              min={0}
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="accent"
          size="lg"
          className="w-full"
          disabled={!body.trim() || createMutation.isPending}
          loading={createMutation.isPending}
        >
          {createMutation.isPending ? (
            'Creating & Mining...'
          ) : (
            <>
              <Send className="h-5 w-5" />
              Send Message
            </>
          )}
        </Button>
      </form>

      {/* Info */}
      <div className="text-sm text-muted-foreground space-y-2">
        <p>Messages are embedded in Bitcoin transactions using different data carriers:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>OP_RETURN</strong> - Standard prunable output, 80 bytes (100KB in v30+)
          </li>
          <li>
            <strong>Inscription</strong> - Ordinals-style witness data, up to ~4MB with 75% fee
            discount
          </li>
          <li>
            <strong>Stamps</strong> - Permanent bare multisig, stored in UTXO set forever
          </li>
        </ul>
        <p>
          If you provide a Parent TXID, your message will be anchored as a reply to that message.
        </p>
      </div>
    </Container>
  );
}

function LoadingFallback() {
  return (
    <Container size="md" className="flex justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </Container>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ComposeForm />
    </Suspense>
  );
}
