"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Radio,
  Pause,
  Play,
  Trash2,
  ArrowDown,
  MessageSquare,
  Box,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getIndexerWebSocketUrl, LiveMessageEvent, LiveMessage } from "@/lib/api";

export function LiveFeed() {
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [stats, setStats] = useState<{ total: number; block: number } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pausedMessagesRef = useRef<LiveMessage[]>([]);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(getIndexerWebSocketUrl());

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data: LiveMessageEvent = JSON.parse(event.data);

          if (data.event_type === "new_message" && data.message) {
            if (isPaused) {
              pausedMessagesRef.current.push(data.message);
            } else {
              setMessages((prev) => [...prev.slice(-99), data.message!]);
            }
          } else if (data.event_type === "stats" && data.stats) {
            setStats({
              total: data.stats.total_messages,
              block: data.stats.last_indexed_block,
            });
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Reconnect after delay
        setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch {
      setIsConnected(false);
    }
  }, [isPaused]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // Resume and apply paused messages
  const handleResume = () => {
    setMessages((prev) => [...prev, ...pausedMessagesRef.current].slice(-100));
    pausedMessagesRef.current = [];
    setIsPaused(false);
  };

  const clearMessages = () => {
    setMessages([]);
    pausedMessagesRef.current = [];
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            isConnected ? "bg-green-500/10" : "bg-red-500/10"
          )}>
            <Radio className={cn(
              "w-5 h-5",
              isConnected ? "text-green-500 animate-pulse" : "text-red-500"
            )} />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Live Feed</h2>
            <p className="text-sm text-muted-foreground">
              {isConnected ? (
                stats ? `Block ${stats.block.toLocaleString()} • ${stats.total.toLocaleString()} total` : "Connected"
              ) : (
                "Connecting..."
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPaused && pausedMessagesRef.current.length > 0 && (
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
              {pausedMessagesRef.current.length} queued
            </span>
          )}
          <button
            onClick={() => isPaused ? handleResume() : setIsPaused(true)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isPaused ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              autoScroll ? "bg-cyan-500/20 text-cyan-400" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
            title={autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            onClick={clearMessages}
            className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
            title="Clear"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        className="bg-slate-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-xs"
      >
        {!isConnected ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
            <p>Waiting for new messages...</p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, i) => (
              <LiveMessageRow key={`${msg.id}-${i}`} message={msg} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LiveMessageRow({ message }: { message: LiveMessage }) {
  const kindColors: Record<string, string> = {
    "Text": "text-orange-400",
    "Canvas": "text-purple-400",
    "Image": "text-pink-400",
    "Map": "text-blue-400",
    "DNS": "text-cyan-400",
    "Proof": "text-emerald-400",
    "Token Deploy": "text-amber-400",
    "Token Mint": "text-amber-400",
    "Token Transfer": "text-amber-400",
  };

  const carrierColors: Record<string, string> = {
    "OP_RETURN": "text-blue-400",
    "Inscription": "text-orange-400",
    "Stamps": "text-pink-400",
    "Taproot Annex": "text-green-400",
    "Witness Data": "text-purple-400",
  };

  return (
    <div className="flex items-center gap-2 py-1 border-b border-slate-800 last:border-0">
      <span className={cn("w-24 shrink-0", kindColors[message.kind_name] || "text-gray-400")}>
        {message.kind_name}
      </span>
      <span className={cn("w-20 shrink-0", carrierColors[message.carrier_name] || "text-gray-400")}>
        {message.carrier_name}
      </span>
      <span className="text-slate-500 w-16 shrink-0 text-right">
        #{message.block_height ?? "?"}
      </span>
      <span className="text-slate-400 flex-1 truncate">
        {message.txid.slice(0, 16)}...:{message.vout}
      </span>
      {message.body_preview && (
        <span className="text-slate-600 truncate max-w-32">
          {message.body_preview.slice(0, 20)}...
        </span>
      )}
    </div>
  );
}

