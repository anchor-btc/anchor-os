"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Header } from "@/components";
import { Certificate } from "@/components/certificate";
import { getProofByHash } from "@/lib/api";
import { ArrowLeft, Loader2, XCircle } from "lucide-react";

export default function CertificatePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const hash = params.hash as string;
  const algo = searchParams.get("algo") || undefined;

  const { data: proof, isLoading, error } = useQuery({
    queryKey: ["proof", hash, algo],
    queryFn: () => getProofByHash(hash, algo),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !proof) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <Link
            href="/proofs"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Proofs
          </Link>
          <div className="text-center py-20">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Proof Not Found</h2>
            <p className="text-slate-400">
              Cannot generate certificate - no proof exists for this hash.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 print:bg-white print:min-h-0">
      <div className="print:hidden">
        <Header />
      </div>

      <main className="max-w-4xl mx-auto px-4 py-12 print:p-0 print:max-w-none">
        <Link
          href={`/proof/${hash}?algo=${algo || "sha256"}`}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 print:hidden"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Proof Details
        </Link>

        <Certificate proof={proof} />
      </main>
    </div>
  );
}
