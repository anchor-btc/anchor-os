"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Coins, CheckCircle, Plus, Send, X, Loader2, ChevronRight } from "lucide-react";
import { useState } from "react";
import { fetchEvents, EventRequest } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { formatSats } from "@/lib/utils";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3701";

// Categories
const CATEGORIES = [
  { id: 1, name: "Block", description: "Block height and mining" },
  { id: 2, name: "Prices", description: "Asset prices and markets" },
  { id: 4, name: "Sports", description: "Sports events and outcomes" },
  { id: 8, name: "Weather", description: "Weather conditions" },
  { id: 16, name: "Elections", description: "Political events" },
  { id: 32, name: "Random", description: "Random number generation" },
];

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateEventModal({ isOpen, onClose, onSuccess }: CreateEventModalProps) {
  const [category, setCategory] = useState(2);
  const [description, setDescription] = useState("");
  const [resolutionBlock, setResolutionBlock] = useState("");
  const [bounty, setBounty] = useState("10000");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!description) {
      setError("Please enter a description");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/events/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          description,
          resolution_block: resolutionBlock ? parseInt(resolutionBlock) : null,
          bounty_sats: parseInt(bounty) || 0,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create event");
      }

      onSuccess();
      onClose();
      setDescription("");
      setResolutionBlock("");
      setBounty("10000");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-lg w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Create Event Request</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    category === cat.id
                      ? "bg-purple-600 text-white"
                      : "bg-white/5 text-gray-400 hover:text-white"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Question/Event Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will be the BTC price at 00:00 UTC tomorrow?"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
            />
          </div>

          {/* Resolution Block */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Resolution Block (optional)
            </label>
            <input
              type="number"
              value={resolutionBlock}
              onChange={(e) => setResolutionBlock(e.target.value)}
              placeholder="Block height when event resolves"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Bounty */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bounty (sats)
            </label>
            <input
              type="number"
              value={bounty}
              onChange={(e) => setBounty(e.target.value)}
              placeholder="10000"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Higher bounties incentivize faster responses from oracles
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !description}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create Event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AttestModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventRequest | null;
  onSuccess: () => void;
}

function AttestModal({ isOpen, onClose, event, onSuccess }: AttestModalProps) {
  const [outcome, setOutcome] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!outcome || !event) {
      setError("Please enter an outcome");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Call wallet API to create attestation message
      const res = await fetch("http://localhost:8001/wallet/create-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: 31, // OracleAttestation
          body: outcome,
          body_is_hex: false,
          carrier: 0, // OP_RETURN
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to create attestation");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setOutcome("");
        setSuccess(false);
      }, 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-lg w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Submit Attestation</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Event Info */}
          <div className="p-3 bg-slate-800 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Event Question</p>
            <p className="text-white">{event.description}</p>
            <div className="flex items-center gap-3 mt-2 text-sm">
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                {event.category_name}
              </span>
              {event.bounty_sats > 0 && (
                <span className="text-amber-400 flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  {formatSats(event.bounty_sats)} bounty
                </span>
              )}
            </div>
          </div>

          {/* Outcome */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Attestation (Outcome)
            </label>
            <textarea
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="Enter the outcome or answer..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be signed with your oracle identity and broadcast to the network
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Attestation submitted successfully!
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !outcome || success}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Submit Attestation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAttestModal, setShowAttestModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventRequest | null>(null);
  const queryClient = useQueryClient();

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ["events", statusFilter],
    queryFn: () => fetchEvents(statusFilter === "all" ? undefined : statusFilter, 50),
  });

  const handleAttest = (event: EventRequest) => {
    setSelectedEvent(event);
    setShowAttestModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Event Requests</h1>
          <p className="text-gray-400 mt-2">Events waiting for oracle attestation</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {["pending", "fulfilled", "all"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
              statusFilter === status
                ? "bg-purple-600 text-white"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Events List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading events...</div>
      ) : (
        <div className="space-y-3">
          {events?.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:border-purple-500/50 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-300">
                      {event.category_name}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      event.status === "pending"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-green-500/20 text-green-400"
                    }`}>
                      {event.status}
                    </span>
                  </div>
                  <p className="text-white mt-2">{event.description}</p>
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    Event ID: {event.event_id.slice(0, 32)}...
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {event.bounty_sats > 0 && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-400">
                        <Coins className="w-4 h-4" />
                        <span className="font-medium">{formatSats(event.bounty_sats)}</span>
                      </div>
                      <p className="text-xs text-gray-500">Bounty</p>
                    </div>
                  )}
                  {event.status === "pending" && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleAttest(event);
                      }}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      Attest
                    </button>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                </div>
                {event.resolution_block && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Resolves at block {event.resolution_block}
                  </div>
                )}
                {event.fulfilled_by && (
                  <div className="flex items-center gap-1 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    Fulfilled
                  </div>
                )}
              </div>
            </Link>
          ))}
          {(!events || events.length === 0) && (
            <div className="text-center py-12 text-gray-400">
              No events found
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => refetch()}
      />
      <AttestModal
        isOpen={showAttestModal}
        onClose={() => {
          setShowAttestModal(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
