"use client";

import { useState } from "react";
import { Ticket, Info } from "lucide-react";

export default function CreateLotteryPage() {
  const [lotteryType, setLotteryType] = useState(0);
  const [numberCount, setNumberCount] = useState(6);
  const [numberMax, setNumberMax] = useState(49);
  const [drawBlock, setDrawBlock] = useState("");
  const [ticketPrice, setTicketPrice] = useState("10000");
  const [oraclePubkey, setOraclePubkey] = useState("");

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4">
          <Ticket className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white">Create Lottery</h1>
        <p className="text-gray-400 mt-2">
          Set up a new lottery with custom rules and prize structure
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Lottery Type
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 0, name: "Daily", desc: "~144 blocks" },
              { value: 1, name: "Weekly", desc: "~1008 blocks" },
              { value: 2, name: "Jackpot", desc: "Custom" },
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => setLotteryType(type.value)}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  lotteryType === type.value
                    ? "border-amber-500 bg-amber-500/20"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <p className="font-medium text-white">{type.name}</p>
                <p className="text-xs text-gray-400">{type.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Numbers to Pick
            </label>
            <input
              type="number"
              value={numberCount}
              onChange={(e) => setNumberCount(Number(e.target.value))}
              min={1}
              max={10}
              className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:border-amber-500"
            />
            <p className="text-xs text-gray-500 mt-1">How many numbers players must pick</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max Number
            </label>
            <input
              type="number"
              value={numberMax}
              onChange={(e) => setNumberMax(Number(e.target.value))}
              min={numberCount}
              max={100}
              className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:border-amber-500"
            />
            <p className="text-xs text-gray-500 mt-1">Numbers range from 1 to this</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Draw Block Height
          </label>
          <input
            type="number"
            value={drawBlock}
            onChange={(e) => setDrawBlock(e.target.value)}
            placeholder="e.g., 850000"
            className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
          />
          <p className="text-xs text-gray-500 mt-1">Block height when the draw will occur</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Ticket Price (sats)
          </label>
          <input
            type="number"
            value={ticketPrice}
            onChange={(e) => setTicketPrice(e.target.value)}
            min={1000}
            step={1000}
            className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:border-amber-500"
          />
          <p className="text-xs text-gray-500 mt-1">Minimum: 1,000 sats</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Oracle Public Key
          </label>
          <input
            type="text"
            value={oraclePubkey}
            onChange={(e) => setOraclePubkey(e.target.value)}
            placeholder="02abc123..."
            className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-amber-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Oracle that will attest to winning numbers. 
            <a href="/oracles" className="text-amber-400 hover:underline ml-1">Browse oracles →</a>
          </p>
        </div>

        <div className="pt-4 border-t border-white/10">
          <button
            disabled={!drawBlock || !oraclePubkey}
            className="w-full py-3 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium transition-colors"
          >
            Create Lottery
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-300 mb-1">How lottery creation works</h3>
            <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
              <li>Configure your lottery parameters above</li>
              <li>Sign the creation message with your wallet</li>
              <li>Lottery goes live after blockchain confirmation</li>
              <li>Users can buy tickets until draw block</li>
              <li>Oracle attests to winning numbers at draw block</li>
              <li>Winners claim prizes via DLC settlement</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

