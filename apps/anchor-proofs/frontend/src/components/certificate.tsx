'use client';

import { FileCheck, Printer } from 'lucide-react';
import type { Proof } from '@/lib/api';
import { formatFileSize } from '@/lib/hash';

interface CertificateProps {
  proof: Proof;
}

export function Certificate({ proof }: CertificateProps) {
  const handlePrint = () => {
    window.print();
  };

  const timestamp = new Date(proof.created_at);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Print Button */}
      <div className="mb-6 flex gap-4 print:hidden">
        <button
          onClick={handlePrint}
          className="flex-1 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
        >
          <Printer className="w-5 h-5" />
          Print Certificate
        </button>
      </div>

      {/* Certificate */}
      <div
        id="certificate-content"
        className="bg-white text-slate-900 rounded-xl border-4 border-emerald-500 p-8 print:border-2 print:rounded-none print:shadow-none"
      >
        {/* Header */}
        <div className="text-center border-b-2 border-slate-200 pb-6 mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center print:bg-emerald-50">
              <FileCheck className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Certificate of Proof</h1>
          <p className="text-lg text-slate-600">Proof of Existence on Bitcoin</p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Statement */}
          <div className="text-center bg-emerald-50 rounded-lg p-4">
            <p className="text-slate-700">
              This certifies that the file identified below was timestamped on the Bitcoin
              blockchain on:
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-2">
              {timestamp.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <p className="text-slate-600">at {timestamp.toLocaleTimeString('en-US')} UTC</p>
          </div>

          {/* File Details */}
          <div className="border border-slate-200 rounded-lg p-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase mb-3">File Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Filename:</span>
                <p className="font-medium text-slate-900">{proof.filename || 'Unnamed file'}</p>
              </div>
              <div>
                <span className="text-slate-500">File Size:</span>
                <p className="font-medium text-slate-900">
                  {proof.file_size ? formatFileSize(proof.file_size) : 'Unknown'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">MIME Type:</span>
                <p className="font-medium text-slate-900">
                  {proof.mime_type || 'application/octet-stream'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Hash Algorithm:</span>
                <p className="font-medium text-slate-900">{proof.hash_algo_name}</p>
              </div>
            </div>
          </div>

          {/* Hash */}
          <div className="border border-slate-200 rounded-lg p-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase mb-3">
              Cryptographic Hash ({proof.hash_algo_name})
            </h2>
            <p className="font-mono text-xs break-all bg-slate-100 p-3 rounded text-slate-700">
              {proof.file_hash}
            </p>
          </div>

          {/* Transaction */}
          <div className="border border-slate-200 rounded-lg p-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase mb-3">Bitcoin Transaction</h2>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-slate-500">Transaction ID:</span>
                <p className="font-mono text-xs break-all bg-slate-100 p-2 rounded text-slate-700">
                  {proof.txid}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Block Height:</span>
                  <p className="font-medium text-slate-900">
                    {proof.block_height?.toLocaleString() || 'Pending'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Output Index:</span>
                  <p className="font-medium text-slate-900">{proof.vout}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          {proof.is_revoked && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 font-medium">⚠️ This proof has been revoked</p>
              {proof.revoked_txid && (
                <p className="text-sm text-red-600 mt-1">Revocation TX: {proof.revoked_txid}</p>
              )}
            </div>
          )}

          {/* Verification Instructions */}
          <div className="bg-slate-50 rounded-lg p-4 text-sm">
            <h2 className="font-bold text-slate-700 mb-2">How to Verify</h2>
            <ol className="list-decimal list-inside space-y-1 text-slate-600">
              <li>Compute the {proof.hash_algo_name} hash of your file</li>
              <li>Compare it with the hash shown above</li>
              <li>Verify the transaction exists on a Bitcoin blockchain explorer</li>
              <li>Confirm the block timestamp matches the certified date</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t-2 border-slate-200 text-center text-sm text-slate-500">
          <p>
            Certified by <span className="font-medium text-emerald-600">Anchor Proofs</span>
          </p>
          <p className="mt-1">Using the Anchor Protocol on Bitcoin</p>
          <p className="mt-2 text-xs">
            Certificate ID: {proof.id} | Generated on {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
