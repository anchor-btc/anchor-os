"use client";

import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Coins, CheckCircle } from "lucide-react";
import { useState } from "react";
import { fetchEvents } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { formatSats } from "@/lib/utils";

export default function EventsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const { data: events, isLoading } = useQuery({
    queryKey: ["events", statusFilter],
    queryFn: () => fetchEvents(statusFilter === "all" ? undefined : statusFilter, 50),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Event Requests</h1>
        <p className="text-gray-400 mt-2">Events waiting for oracle attestation</p>
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
            <div
              key={event.id}
              className="rounded-xl border border-white/10 bg-white/5 p-4 hover:border-purple-500/50 transition-colors"
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
                {event.bounty_sats > 0 && (
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-400">
                      <Coins className="w-4 h-4" />
                      <span className="font-medium">{formatSats(event.bounty_sats)}</span>
                    </div>
                    <p className="text-xs text-gray-500">Bounty</p>
                  </div>
                )}
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
            </div>
          ))}
          {(!events || events.length === 0) && (
            <div className="text-center py-12 text-gray-400">
              No events found
            </div>
          )}
        </div>
      )}

      {/* Create Event Request */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="font-medium text-white mb-2">Need an attestation?</h3>
        <p className="text-sm text-gray-400 mb-4">
          Create an event request and oracles will compete to provide an accurate attestation.
          Add a bounty to incentivize faster responses.
        </p>
        <button className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors">
          Create Event Request
        </button>
      </div>
    </div>
  );
}

