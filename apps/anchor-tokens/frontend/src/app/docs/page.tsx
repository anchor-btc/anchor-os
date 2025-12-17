"use client";

import { ArrowLeft, Book, Coins, Zap, Shield, Code } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/header";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <Book className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Documentation</h1>
            <p className="text-gray-400">Learn about Anchor Tokens</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Overview */}
          <section className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-orange-400" />
              What are Anchor Tokens?
            </h2>
            <p className="text-gray-300 mb-4">
              Anchor Tokens is a UTXO-based token protocol built on the Anchor Protocol. 
              Similar to Bitcoin Runes, tokens are attached to Bitcoin UTXOs, enabling:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>Permissionless token deployment</li>
              <li>Efficient token transfers using Bitcoin transactions</li>
              <li>UTXO-based ownership model (no separate token chain)</li>
              <li>75% fee discount using Witness Data carrier</li>
            </ul>
          </section>

          {/* Operations */}
          <section className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Token Operations
            </h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-900/50 rounded-lg">
                <h3 className="font-semibold text-purple-400 mb-2">DEPLOY (0x01)</h3>
                <p className="text-gray-400 text-sm">
                  Create a new token with ticker, decimals, max supply, and optional mint limit.
                  First-come-first-served ticker registration.
                </p>
              </div>

              <div className="p-4 bg-gray-900/50 rounded-lg">
                <h3 className="font-semibold text-green-400 mb-2">MINT (0x02)</h3>
                <p className="text-gray-400 text-sm">
                  Mint new tokens to a specific output. Respects mint limits and open mint flags.
                  Creates a new token UTXO.
                </p>
              </div>

              <div className="p-4 bg-gray-900/50 rounded-lg">
                <h3 className="font-semibold text-blue-400 mb-2">TRANSFER (0x03)</h3>
                <p className="text-gray-400 text-sm">
                  Transfer tokens from input UTXOs to output addresses.
                  Uses anchors to reference source UTXOs.
                </p>
              </div>

              <div className="p-4 bg-gray-900/50 rounded-lg">
                <h3 className="font-semibold text-red-400 mb-2">BURN (0x04)</h3>
                <p className="text-gray-400 text-sm">
                  Permanently destroy tokens. Only works if the token has the burnable flag enabled.
                </p>
              </div>

              <div className="p-4 bg-gray-900/50 rounded-lg">
                <h3 className="font-semibold text-cyan-400 mb-2">SPLIT (0x05)</h3>
                <p className="text-gray-400 text-sm">
                  Split a single UTXO into multiple UTXOs with different amounts.
                </p>
              </div>
            </div>
          </section>

          {/* Fee Optimization */}
          <section className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              Fee Optimization
            </h2>
            <p className="text-gray-300 mb-4">
              Anchor Tokens uses several techniques to minimize transaction fees:
            </p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-3 text-gray-400">Strategy</th>
                    <th className="text-left p-3 text-gray-400">Savings</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-700/50">
                    <td className="p-3">Witness Data carrier</td>
                    <td className="p-3 text-green-400">75% discount</td>
                  </tr>
                  <tr className="border-b border-gray-700/50">
                    <td className="p-3">Varint (LEB128) encoding</td>
                    <td className="p-3 text-green-400">~50% vs fixed-width</td>
                  </tr>
                  <tr className="border-b border-gray-700/50">
                    <td className="p-3">Batch transfers</td>
                    <td className="p-3 text-green-400">Multiple ops per tx</td>
                  </tr>
                  <tr>
                    <td className="p-3">Short tickers</td>
                    <td className="p-3 text-green-400">Smaller payloads</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
              <p className="text-sm text-gray-400">
                <strong className="text-white">Example:</strong> A single transfer using OP_RETURN costs ~180 sats @ 1 sat/vB.
                Using Witness Data, the same transfer costs only ~45 sats.
              </p>
            </div>
          </section>

          {/* Technical Details */}
          <section className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Code className="w-5 h-5 text-blue-400" />
              Technical Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Protocol Kind</h3>
                <p className="text-gray-400 text-sm">
                  Uses <code className="px-2 py-1 bg-gray-900 rounded">AnchorKind::Custom(20)</code> to identify token messages.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Payload Format</h3>
                <pre className="p-4 bg-gray-900 rounded-lg text-sm overflow-x-auto">
{`[operation: u8][token_id: varint][...operation_data]

DEPLOY: [0x01][ticker_len][ticker][decimals][max_supply][mint_limit][flags]
MINT:   [0x02][token_id][amount][output_idx]
TRANSFER: [0x03][token_id][count][[output_idx][amount]...]
BURN:   [0x04][token_id][amount]
SPLIT:  [0x05][token_id][count][[output_idx][amount]...]`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Token ID</h3>
                <p className="text-gray-400 text-sm">
                  Tokens are identified by their deploy transaction. The indexer assigns a sequential ID
                  for efficient varint encoding in subsequent operations.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
