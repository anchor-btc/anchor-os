"use client";

import { Header } from "@/components";
import { FileText, Hash, Shield, Clock, Code, ExternalLink } from "lucide-react";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold text-white">Documentation</h1>
        </div>
        <p className="text-slate-400 mb-8">
          Learn how Anchor Proofs works and how to use it to timestamp your files.
        </p>

        {/* What is Proof of Existence */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            What is Proof of Existence?
          </h2>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <p className="text-slate-300 mb-4">
              Proof of Existence is a method to prove that a specific document or file
              existed at a particular point in time. By recording a cryptographic hash
              of your file on the Bitcoin blockchain, you create an immutable timestamp
              that cannot be altered or forged.
            </p>
            <p className="text-slate-300">
              This is useful for establishing ownership, proving the existence of
              intellectual property, notarizing documents, or creating tamper-proof
              records.
            </p>
          </div>
        </section>

        {/* How it Works */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-500" />
            How It Works
          </h2>
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h3 className="font-medium text-white mb-2">1. File Hashing</h3>
              <p className="text-slate-300">
                When you upload a file, it is processed entirely in your browser using
                the Web Crypto API. A cryptographic hash (SHA-256 or SHA-512) is
                computed from the file contents. This hash is a unique fingerprint of
                your file - even a single bit change produces a completely different
                hash.
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h3 className="font-medium text-white mb-2">2. Bitcoin Transaction</h3>
              <p className="text-slate-300">
                The hash is embedded in a Bitcoin transaction using the Anchor Protocol
                (Kind 11). The transaction is broadcast to the Bitcoin network and
                permanently recorded in a block. The timestamp comes from the Bitcoin
                blockchain itself, making it tamper-proof.
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h3 className="font-medium text-white mb-2">3. Verification</h3>
              <p className="text-slate-300">
                To verify a file, you simply upload it again and we compute the same
                hash. If that hash exists in our database, we show you the original
                timestamp and transaction details. The file is proven to have existed
                at that time.
              </p>
            </div>
          </div>
        </section>

        {/* Supported Algorithms */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Hash className="w-5 h-5 text-emerald-500" />
            Hash Algorithms
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h3 className="font-medium text-white mb-2">SHA-256</h3>
              <p className="text-slate-300 text-sm mb-2">
                The standard algorithm used by Bitcoin. Produces a 256-bit (32-byte)
                hash. Recommended for most use cases.
              </p>
              <code className="text-xs text-emerald-400 bg-slate-700/50 px-2 py-1 rounded">
                64 hex characters
              </code>
            </div>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h3 className="font-medium text-white mb-2">SHA-512</h3>
              <p className="text-slate-300 text-sm mb-2">
                A larger hash providing additional security margin. Produces a 512-bit
                (64-byte) hash.
              </p>
              <code className="text-xs text-emerald-400 bg-slate-700/50 px-2 py-1 rounded">
                128 hex characters
              </code>
            </div>
          </div>
        </section>

        {/* Protocol Details */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Code className="w-5 h-5 text-emerald-500" />
            Protocol Details
          </h2>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <p className="text-slate-300 mb-4">
              Anchor Proofs uses the Anchor Protocol with Kind 11 (Proof of Existence).
              The payload format is:
            </p>
            <pre className="bg-slate-700/50 rounded-lg p-4 text-sm text-emerald-300 overflow-x-auto">
{`[operation: u8][hash_algo: u8][hash: 32/64 bytes][metadata...]

Operations:
  0x01 = STAMP (register new proof)
  0x02 = REVOKE (invalidate proof)
  0x03 = BATCH (multiple proofs)

Hash Algorithms:
  0x01 = SHA-256 (32 bytes)
  0x02 = SHA-512 (64 bytes)

Metadata (optional):
  [filename_len: u8][filename: utf8]
  [mime_len: u8][mime: utf8]
  [file_size: u64]
  [desc_len: u8][desc: utf8]`}
            </pre>
          </div>
        </section>

        {/* Links */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Resources</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <a
              href="https://github.com/AnchorProtocol"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 hover:border-emerald-500/50 transition-colors flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                <ExternalLink className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <h3 className="font-medium text-white">Anchor Protocol</h3>
                <p className="text-sm text-slate-400">GitHub repository</p>
              </div>
            </a>
            <a
              href="http://localhost:3012/swagger-ui"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 hover:border-emerald-500/50 transition-colors flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                <Code className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <h3 className="font-medium text-white">API Documentation</h3>
                <p className="text-sm text-slate-400">OpenAPI / Swagger</p>
              </div>
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
