"use client";

import { useState } from "react";
import { Ticket, Trophy, Clock, ExternalLink } from "lucide-react";
import { cn, formatSats, formatNumbers, statusColor, shortenHash } from "@/lib/utils";

export default function MyTicketsPage() {
  const [pubkey, setPubkey] = useState("");

  // Would use fetchMyTickets(pubkey) when connected
  const tickets: never[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">My Tickets</h1>
        <p className="text-gray-400 mt-2">View your lottery tickets and claim winnings</p>
      </div>

      {/* Pubkey Input */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Your Public Key
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={pubkey}
            onChange={(e) => setPubkey(e.target.value)}
            placeholder="Enter your public key to view tickets..."
            className="flex-1 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-amber-500"
          />
          <button
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors"
          >
            View Tickets
          </button>
        </div>
      </div>

      {/* Tickets */}
      {tickets.length > 0 ? (
        <div className="space-y-3">
          {/* Would map over tickets */}
        </div>
      ) : (
        <div className="text-center py-12 rounded-xl border border-white/10 bg-white/5">
          <Ticket className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 mb-2">No tickets found</p>
          <p className="text-sm text-gray-500">
            {pubkey ? "No tickets for this public key" : "Enter your public key to view tickets"}
          </p>
        </div>
      )}

      {/* Info */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="font-medium text-white mb-2">Ticket States</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className={cn("px-2 py-0.5 rounded text-xs", statusColor("open"))}>Active</span>
            <p className="text-gray-400 mt-1">Waiting for draw</p>
          </div>
          <div>
            <span className={cn("px-2 py-0.5 rounded text-xs", statusColor("drawing"))}>Drawing</span>
            <p className="text-gray-400 mt-1">Draw in progress</p>
          </div>
          <div>
            <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">Winner</span>
            <p className="text-gray-400 mt-1">You won!</p>
          </div>
          <div>
            <span className={cn("px-2 py-0.5 rounded text-xs", statusColor("completed"))}>Completed</span>
            <p className="text-gray-400 mt-1">Lottery ended</p>
          </div>
        </div>
      </div>
    </div>
  );
}

