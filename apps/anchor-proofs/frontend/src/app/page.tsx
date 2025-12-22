"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { StatsCard, ProofCard } from "@/components";
import { Container } from "@AnchorProtocol/ui";
import { listProofs } from "@/lib/api";
import { FileCheck, Shield, ArrowRight } from "lucide-react";

export default function HomePage() {
  const { data: recentProofs } = useQuery({
    queryKey: ["proofs", 1, "", false],
    queryFn: () => listProofs(1, 6),
  });

  return (
    <Container className="space-y-12">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Proof of Existence on{" "}
          <span className="text-emerald-500">Bitcoin</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
          Timestamp any file on the Bitcoin blockchain. Create immutable proof that
          your document, image, or data existed at a specific point in time.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/stamp"
            className="w-full sm:w-auto px-8 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
          >
            <FileCheck className="w-5 h-5" />
            Stamp a File
          </Link>
          <Link
            href="/validate"
            className="w-full sm:w-auto px-8 py-4 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
          >
            <Shield className="w-5 h-5" />
            Validate a File
          </Link>
        </div>
      </div>

      {/* How it Works */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6 text-center">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 text-center">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-emerald-500">1</span>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Upload File</h3>
            <p className="text-slate-400 text-sm">
              Select any file from your device. It never leaves your browser.
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 text-center">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-emerald-500">2</span>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Generate Hash</h3>
            <p className="text-slate-400 text-sm">
              A unique SHA-256 or SHA-512 fingerprint is computed locally.
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 text-center">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-emerald-500">3</span>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Record on Bitcoin</h3>
            <p className="text-slate-400 text-sm">
              The hash is permanently recorded in a Bitcoin transaction.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Protocol Statistics</h2>
        <StatsCard />
      </div>

      {/* Recent Proofs */}
      {recentProofs && recentProofs.data.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Recent Proofs</h2>
            <Link
              href="/proofs"
              className="text-emerald-500 hover:text-emerald-400 flex items-center gap-1 text-sm"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProofs.data.map((proof) => (
              <ProofCard key={proof.id} proof={proof} />
            ))}
          </div>
        </div>
      )}
    </Container>
  );
}
