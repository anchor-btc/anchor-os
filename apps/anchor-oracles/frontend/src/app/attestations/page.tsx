'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ExternalLink, Filter } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import {
  fetchAttestations,
  Attestation,
  fetchDefaultExplorer,
  buildExplorerTxUrl,
} from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { shortenPubkey } from '@/lib/utils';

const WALLET_URL = process.env.NEXT_PUBLIC_WALLET_URL || 'http://localhost:3700';

// Dispute Modal component
function DisputeModal({
  isOpen,
  onClose,
  attestation,
}: {
  isOpen: boolean;
  onClose: () => void;
  attestation: Attestation;
}) {
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
      const attestationTxidBytes = hexToBytes(attestation.txid);
      const evidence = new TextEncoder().encode('Disputed via Anchor Oracles UI');

      const body = new Uint8Array(1 + 32 + 1 + 8 + 2 + evidence.length);
      let offset = 0;

      body[offset++] = 1; // action = create dispute
      body.set(attestationTxidBytes, offset);
      offset += 32;
      body[offset++] = reason;

      const stakeView = new DataView(new ArrayBuffer(8));
      stakeView.setBigUint64(0, BigInt(stakeSats), true);
      body.set(new Uint8Array(stakeView.buffer), offset);
      offset += 8;

      body[offset++] = evidence.length & 0xff;
      body[offset++] = (evidence.length >> 8) & 0xff;
      body.set(evidence, offset);

      const res = await fetch(`${WALLET_URL}/wallet/create-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 32,
          body: bytesToHex(body),
          carrier: 'op_return',
        }),
      });

      if (!res.ok) {
        throw new Error((await res.text()) || 'Failed to create dispute');
      }

      const result = await res.json();
      setTxid(result.txid);
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
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
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

function hexToString(hex: string): string | null {
  try {
    const bytes = hexToBytes(hex);
    const decoder = new TextDecoder('utf-8', { fatal: true });
    return decoder.decode(bytes);
  } catch {
    return null;
  }
}

const CATEGORIES = [
  { id: 0, name: 'All' },
  { id: 1, name: 'Block' },
  { id: 2, name: 'Prices' },
  { id: 4, name: 'Sports' },
  { id: 8, name: 'Weather' },
  { id: 16, name: 'Elections' },
  { id: 32, name: 'Random' },
];

export default function AttestationsPage() {
  const [categoryFilter, setCategoryFilter] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [disputeAttestation, setDisputeAttestation] = useState<Attestation | null>(null);

  const { data: attestations, isLoading } = useQuery({
    queryKey: ['attestations'],
    queryFn: () => fetchAttestations(100, 0),
  });

  const { data: explorer } = useQuery({
    queryKey: ['default-explorer'],
    queryFn: fetchDefaultExplorer,
    staleTime: 1000 * 60 * 5,
  });

  // Filter attestations
  const filteredAttestations = attestations?.filter((att) => {
    if (categoryFilter !== 0 && att.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && att.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Attestations</h1>
        <p className="text-gray-400 mt-2">All oracle attestations on the network</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Category</label>
          <div className="flex gap-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  categoryFilter === cat.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <div className="flex gap-1">
            {['all', 'valid', 'pending', 'disputed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                  statusFilter === status
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Attestations Table */}
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading attestations...</div>
        ) : filteredAttestations && filteredAttestations.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left text-sm text-gray-400">
                <th className="px-4 py-3">Oracle</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Block</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAttestations.map((att) => (
                <tr key={att.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    {att.oracle_pubkey ? (
                      <Link
                        href={`/oracles/${att.oracle_pubkey}`}
                        className="text-white hover:text-purple-400"
                      >
                        {att.oracle_name || `Oracle #${att.oracle_id}`}
                      </Link>
                    ) : (
                      <span className="text-gray-400">
                        {att.oracle_name || `Oracle #${att.oracle_id}`}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-300">
                      {att.category_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-xs truncate">
                    {hexToString(att.outcome_data) || shortenPubkey(att.outcome_data, 12)}
                  </td>
                  <td className="px-4 py-3">
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
                  </td>
                  <td className="px-4 py-3 text-gray-500">{att.block_height ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {formatDistanceToNow(new Date(att.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {att.status !== 'disputed' && (
                        <button
                          onClick={() => setDisputeAttestation(att)}
                          className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          title="Dispute"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                      )}
                      {explorer && (
                        <a
                          href={buildExplorerTxUrl(explorer, att.txid)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded bg-white/5 text-gray-400 hover:text-white"
                          title="View Transaction"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <Filter className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No attestations found</p>
            <p className="text-sm text-gray-500 mt-1">
              {categoryFilter !== 0 || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Attestations will appear here when oracles respond to events'}
            </p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
        <h3 className="font-medium text-green-300 mb-2">About Attestations</h3>
        <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
          <li>Oracles submit attestations to answer event requests</li>
          <li>Each attestation is cryptographically signed by the oracle</li>
          <li>Anyone can dispute an attestation by staking sats</li>
          <li>Valid attestations build oracle reputation over time</li>
        </ul>
      </div>

      {/* Dispute Modal */}
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
