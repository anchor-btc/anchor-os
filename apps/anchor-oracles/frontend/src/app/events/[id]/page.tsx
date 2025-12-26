'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Coins,
  CheckCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import {
  fetchEvent,
  fetchEventAttestations,
  Attestation,
  fetchDefaultExplorer,
  buildExplorerTxUrl,
} from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { formatSats, shortenPubkey } from '@/lib/utils';

const WALLET_URL = process.env.NEXT_PUBLIC_WALLET_URL || 'http://localhost:3700';

interface Identity {
  id: string;
  identity_type: string;
  label: string;
  public_key: string;
  created_at: string;
}

// Modal to submit attestation
function AttestModal({
  isOpen,
  onClose,
  eventId,
  eventDescription,
  category,
}: {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventDescription: string;
  category: number;
}) {
  const queryClient = useQueryClient();
  const [outcome, setOutcome] = useState('');
  const [selectedIdentity, setSelectedIdentity] = useState<Identity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);

  const { data: identities, isLoading: loadingIdentities } = useQuery({
    queryKey: ['wallet-identities'],
    queryFn: async () => {
      const res = await fetch(`${WALLET_URL}/api/identities`);
      if (!res.ok) throw new Error('Failed to fetch identities');
      return res.json() as Promise<Identity[]>;
    },
    enabled: isOpen,
  });

  // Filter to only nostr identities (oracles use nostr keys)
  const nostrIdentities = identities?.filter((i) => i.identity_type === 'nostr') || [];

  const handleSubmit = async () => {
    if (!selectedIdentity || !outcome.trim()) {
      setError('Please select an identity and enter an outcome');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create the attestation message body (Kind 31)
      // Format: action(1) + oracle_pubkey(32) + event_id(32) + category(2) + outcome_len(2) + outcome + signature(64)
      const pubkeyBytes = hexToBytes(selectedIdentity.public_key);
      const eventIdBytes = hexToBytes(eventId);
      const outcomeBytes = new TextEncoder().encode(outcome);

      const body = new Uint8Array(1 + 32 + 32 + 2 + 2 + outcomeBytes.length);
      let offset = 0;

      // action = 1 (submit attestation)
      body[offset++] = 1;

      // oracle pubkey (32 bytes)
      body.set(pubkeyBytes, offset);
      offset += 32;

      // event_id (32 bytes)
      body.set(eventIdBytes, offset);
      offset += 32;

      // category (2 bytes, little endian)
      body[offset++] = category & 0xff;
      body[offset++] = (category >> 8) & 0xff;

      // outcome length (2 bytes, little endian)
      body[offset++] = outcomeBytes.length & 0xff;
      body[offset++] = (outcomeBytes.length >> 8) & 0xff;

      // outcome data
      body.set(outcomeBytes, offset);

      // Send to wallet to create message
      const res = await fetch(`${WALLET_URL}/wallet/create-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 31, // Oracle Attestation
          body: bytesToHex(body),
          carrier: 'op_return',
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to create attestation');
      }

      const result = await res.json();
      setTxid(result.txid);
      queryClient.invalidateQueries({ queryKey: ['event-attestations'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-white mb-4">Submit Attestation</h2>

        <div className="mb-4 p-3 rounded-lg bg-white/5">
          <p className="text-sm text-gray-400">{eventDescription}</p>
        </div>

        {txid ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-white font-medium mb-2">Attestation Submitted!</p>
            <p className="text-sm text-gray-400 font-mono break-all">{txid}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Select Oracle Identity</label>
              {loadingIdentities ? (
                <p className="text-gray-500">Loading identities...</p>
              ) : nostrIdentities.length === 0 ? (
                <p className="text-yellow-400 text-sm">
                  No Nostr identities found. Create one in the Wallet first.
                </p>
              ) : (
                <div className="space-y-2">
                  {nostrIdentities.map((identity) => (
                    <button
                      key={identity.id}
                      onClick={() => setSelectedIdentity(identity)}
                      className={`w-full p-3 rounded-lg border text-left transition-colors ${
                        selectedIdentity?.id === identity.id
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-white/10 bg-white/5 hover:border-purple-500/50'
                      }`}
                    >
                      <p className="text-white font-medium">{identity.label}</p>
                      <p className="text-xs text-gray-500 font-mono">
                        {shortenPubkey(identity.public_key, 12)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Outcome</label>
              <input
                type="text"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Enter the event outcome..."
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">{error}</div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedIdentity || !outcome.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Modal to dispute an attestation
function DisputeModal({
  isOpen,
  onClose,
  attestation,
}: {
  isOpen: boolean;
  onClose: () => void;
  attestation: Attestation;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState(1);
  const [stakeSats, setStakeSats] = useState(10000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);

  const reasons = [
    { id: 1, name: 'Incorrect outcome', description: 'The attested outcome is factually wrong' },
    { id: 2, name: 'Premature attestation', description: 'Event was attested before resolution' },
    { id: 3, name: 'Invalid signature', description: 'The attestation signature is invalid' },
    {
      id: 4,
      name: 'Oracle not authorized',
      description: 'Oracle not authorized for this category',
    },
  ];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Create the dispute message body (Kind 32)
      // Format: action(1) + attestation_txid(32) + reason(1) + stake_amount(8) + evidence_len(2) + evidence
      const attestationTxidBytes = hexToBytes(attestation.txid);
      const evidence = new TextEncoder().encode('Disputed via Anchor Oracles UI');

      const body = new Uint8Array(1 + 32 + 1 + 8 + 2 + evidence.length);
      let offset = 0;

      // action = 1 (create dispute)
      body[offset++] = 1;

      // attestation txid (32 bytes)
      body.set(attestationTxidBytes, offset);
      offset += 32;

      // reason (1 byte)
      body[offset++] = reason;

      // stake amount (8 bytes, little endian)
      const stakeView = new DataView(new ArrayBuffer(8));
      stakeView.setBigUint64(0, BigInt(stakeSats), true);
      body.set(new Uint8Array(stakeView.buffer), offset);
      offset += 8;

      // evidence length (2 bytes, little endian)
      body[offset++] = evidence.length & 0xff;
      body[offset++] = (evidence.length >> 8) & 0xff;

      // evidence
      body.set(evidence, offset);

      // Send to wallet to create message
      const res = await fetch(`${WALLET_URL}/wallet/create-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 32, // Oracle Dispute
          body: bytesToHex(body),
          carrier: 'op_return',
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to create dispute');
      }

      const result = await res.json();
      setTxid(result.txid);
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-white mb-4">Dispute Attestation</h2>

        <div className="mb-4 p-3 rounded-lg bg-white/5">
          <p className="text-xs text-gray-500">Attestation</p>
          <p className="text-sm text-gray-400 font-mono">{shortenPubkey(attestation.txid, 16)}</p>
          <p className="text-xs text-gray-500 mt-2">Oracle</p>
          <p className="text-sm text-white">{attestation.oracle_name || 'Unknown'}</p>
        </div>

        {txid ? (
          <div className="text-center py-6">
            <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <p className="text-white font-medium mb-2">Dispute Created!</p>
            <p className="text-sm text-gray-400 font-mono break-all">{txid}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Dispute Reason</label>
              <div className="space-y-2">
                {reasons.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setReason(r.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      reason === r.id
                        ? 'border-red-500 bg-red-500/20'
                        : 'border-white/10 bg-white/5 hover:border-red-500/50'
                    }`}
                  >
                    <p className="text-white font-medium">{r.name}</p>
                    <p className="text-xs text-gray-500">{r.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Stake Amount (sats)</label>
              <input
                type="number"
                value={stakeSats}
                onChange={(e) => setStakeSats(parseInt(e.target.value) || 0)}
                min={1000}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-red-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                You will lose this stake if the dispute is rejected
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">{error}</div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Helper functions
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function EventDetailPage() {
  const params = useParams();
  const eventId = parseInt(params.id as string);
  const [showAttestModal, setShowAttestModal] = useState(false);
  const [disputeAttestation, setDisputeAttestation] = useState<Attestation | null>(null);

  const { data: event, isLoading: loadingEvent } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => fetchEvent(eventId),
    enabled: !isNaN(eventId),
  });

  const { data: attestations, isLoading: loadingAttestations } = useQuery({
    queryKey: ['event-attestations', eventId],
    queryFn: () => fetchEventAttestations(eventId),
    enabled: !isNaN(eventId),
  });

  const { data: explorer } = useQuery({
    queryKey: ['default-explorer'],
    queryFn: fetchDefaultExplorer,
    staleTime: 1000 * 60 * 5,
  });

  if (loadingEvent) {
    return <div className="text-center py-12 text-gray-400">Loading event...</div>;
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">Event not found</p>
        <Link href="/events" className="text-purple-400 hover:underline">
          ← Back to events
        </Link>
      </div>
    );
  }

  const statusColor =
    event.status === 'pending'
      ? 'bg-yellow-500/20 text-yellow-400'
      : event.status === 'fulfilled'
        ? 'bg-green-500/20 text-green-400'
        : 'bg-gray-500/20 text-gray-400';

  return (
    <div className="space-y-6">
      <Link
        href="/events"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to events
      </Link>

      {/* Event Header */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full text-sm bg-purple-500/20 text-purple-300">
                {event.category_name}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm ${statusColor}`}>
                {event.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">{event.description}</h1>
            <p className="text-gray-500 font-mono text-sm mt-2">ID: {event.event_id}</p>
          </div>
          {event.status === 'pending' && (
            <button
              onClick={() => setShowAttestModal(true)}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Submit Attestation
            </button>
          )}
        </div>

        {/* Event Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-amber-400">
              <Coins className="w-5 h-5" />
              <span className="text-2xl font-bold">{formatSats(event.bounty_sats)}</span>
            </div>
            <p className="text-sm text-gray-500">Bounty</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-blue-400">
              <Calendar className="w-5 h-5" />
              <span className="text-2xl font-bold">{event.resolution_block || 'N/A'}</span>
            </div>
            <p className="text-sm text-gray-500">Resolution Block</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-2xl font-bold">{attestations?.length || 0}</span>
            </div>
            <p className="text-sm text-gray-500">Attestations</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <Clock className="w-5 h-5" />
              <span className="text-lg font-medium">
                {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm text-gray-500">Created</p>
          </div>
        </div>
      </div>

      {/* Attestations */}
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Attestations</h2>
          {event.status === 'pending' && (
            <button
              onClick={() => setShowAttestModal(true)}
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              + Submit Attestation
            </button>
          )}
        </div>

        {loadingAttestations ? (
          <div className="p-8 text-center text-gray-400">Loading attestations...</div>
        ) : attestations && attestations.length > 0 ? (
          <div className="divide-y divide-white/5">
            {attestations.map((att) => (
              <div key={att.id} className="p-4 hover:bg-white/5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {att.oracle_pubkey ? (
                        <Link
                          href={`/oracles/${att.oracle_pubkey}`}
                          className="text-white font-medium hover:text-purple-400"
                        >
                          {att.oracle_name || `Oracle #${att.oracle_id}`}
                        </Link>
                      ) : (
                        <span className="text-gray-400 font-medium">
                          {att.oracle_name || `Oracle #${att.oracle_id}`}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          att.status === 'valid'
                            ? 'bg-green-500/20 text-green-400'
                            : att.status === 'disputed'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {att.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Outcome:{' '}
                      <span className="text-white">
                        {hexToString(att.outcome_data) || att.outcome_data}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1 font-mono">
                      TX: {shortenPubkey(att.txid, 12)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {att.status !== 'disputed' && (
                      <button
                        onClick={() => setDisputeAttestation(att)}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm flex items-center gap-1"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Dispute
                      </button>
                    )}
                    {explorer && (
                      <a
                        href={buildExplorerTxUrl(explorer, att.txid)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>Block {att.block_height ?? 'pending'}</span>
                  <span>{formatDistanceToNow(new Date(att.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-gray-400 mb-2">No attestations yet</p>
            <p className="text-sm text-gray-500">Be the first oracle to attest this event</p>
            {event.status === 'pending' && (
              <button
                onClick={() => setShowAttestModal(true)}
                className="mt-4 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
              >
                Submit Attestation
              </button>
            )}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
        <h3 className="font-medium text-purple-300 mb-2">How Event Attestation Works</h3>
        <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
          <li>Oracles submit attestations with the event outcome</li>
          <li>Multiple oracles can attest the same event</li>
          <li>Anyone can dispute an attestation by staking funds</li>
          <li>The oracle that first correctly attests earns the bounty</li>
        </ul>
      </div>

      {/* Modals */}
      <AttestModal
        isOpen={showAttestModal}
        onClose={() => setShowAttestModal(false)}
        eventId={event.event_id}
        eventDescription={event.description}
        category={event.category}
      />

      {disputeAttestation && (
        <DisputeModal
          isOpen={true}
          onClose={() => setDisputeAttestation(null)}
          attestation={disputeAttestation}
        />
      )}
    </div>
  );
}

// Helper to try to decode hex as UTF-8 string
function hexToString(hex: string): string | null {
  try {
    const bytes = hexToBytes(hex);
    const decoder = new TextDecoder('utf-8', { fatal: true });
    return decoder.decode(bytes);
  } catch {
    return null;
  }
}
