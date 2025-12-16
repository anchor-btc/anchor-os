"use client";

import { Header } from "@/components";
import { Globe, Code, Shield, Zap, FileText, ExternalLink } from "lucide-react";

export default function DocsPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Documentation</h1>
        <p className="text-slate-400 mb-8">
          Learn how BitDNS works and how to integrate it into your applications.
        </p>

        {/* Overview */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-bitcoin-orange" />
            Overview
          </h2>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <p className="text-slate-300 mb-4">
              BitDNS is a decentralized Domain Name System built on Bitcoin using the
              Anchor protocol. It allows users to register <code className="px-1 py-0.5 bg-slate-700 rounded">.bit</code> domains
              and store DNS records permanently on the blockchain.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <Shield className="h-6 w-6 text-green-400 mb-2" />
                <h3 className="font-medium text-white mb-1">Censorship Resistant</h3>
                <p className="text-sm text-slate-400">No central authority can remove or modify your domain</p>
              </div>
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <Zap className="h-6 w-6 text-yellow-400 mb-2" />
                <h3 className="font-medium text-white mb-1">Permanent Storage</h3>
                <p className="text-sm text-slate-400">Records stored forever on the Bitcoin blockchain</p>
              </div>
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <Code className="h-6 w-6 text-blue-400 mb-2" />
                <h3 className="font-medium text-white mb-1">Open Protocol</h3>
                <p className="text-sm text-slate-400">Built on the open Anchor protocol</p>
              </div>
            </div>
          </div>
        </section>

        {/* Record Types */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-bitcoin-orange" />
            Supported Record Types
          </h2>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Example</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr>
                  <td className="px-4 py-3"><code className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded">A</code></td>
                  <td className="px-4 py-3 text-slate-300">IPv4 address</td>
                  <td className="px-4 py-3 font-mono text-slate-400">93.184.216.34</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">AAAA</code></td>
                  <td className="px-4 py-3 text-slate-300">IPv6 address</td>
                  <td className="px-4 py-3 font-mono text-slate-400">2001:db8::1</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">CNAME</code></td>
                  <td className="px-4 py-3 text-slate-300">Canonical name</td>
                  <td className="px-4 py-3 font-mono text-slate-400">www.example.com</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">TXT</code></td>
                  <td className="px-4 py-3 text-slate-300">Text record</td>
                  <td className="px-4 py-3 font-mono text-slate-400">v=spf1 include:_spf.google.com</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded">MX</code></td>
                  <td className="px-4 py-3 text-slate-300">Mail exchange</td>
                  <td className="px-4 py-3 font-mono text-slate-400">10 mail.example.com</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded">NS</code></td>
                  <td className="px-4 py-3 text-slate-300">Name server</td>
                  <td className="px-4 py-3 font-mono text-slate-400">ns1.example.com</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="px-2 py-0.5 bg-pink-500/20 text-pink-400 rounded">SRV</code></td>
                  <td className="px-4 py-3 text-slate-300">Service record</td>
                  <td className="px-4 py-3 font-mono text-slate-400">0 5 443 server.example.com</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* API */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Code className="h-5 w-5 text-bitcoin-orange" />
            API Endpoints
          </h2>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 space-y-4">
            <div className="p-4 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">GET</span>
                <code className="text-white">/resolve/:name</code>
              </div>
              <p className="text-sm text-slate-400">Resolve a domain by name (e.g., mysite.bit)</p>
            </div>

            <div className="p-4 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">GET</span>
                <code className="text-white">/resolve/txid/:prefix</code>
              </div>
              <p className="text-sm text-slate-400">Resolve by txid prefix (16 hex chars)</p>
            </div>

            <div className="p-4 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">GET</span>
                <code className="text-white">/available/:name</code>
              </div>
              <p className="text-sm text-slate-400">Check if a domain is available</p>
            </div>

            <div className="p-4 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">POST</span>
                <code className="text-white">/register</code>
              </div>
              <p className="text-sm text-slate-400">Register a new domain with DNS records</p>
            </div>

            <div className="p-4 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">POST</span>
                <code className="text-white">/update/:name</code>
              </div>
              <p className="text-sm text-slate-400">Update domain records (requires ownership)</p>
            </div>

            <a
              href="http://localhost:3006/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-bitcoin-orange hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              View full API documentation (Swagger)
            </a>
          </div>
        </section>

        {/* Chrome Extension */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Chrome Extension</h2>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <p className="text-slate-300 mb-4">
              Install the BitDNS Chrome extension to resolve .bit domains directly in your browser.
              The extension intercepts requests to .bit domains and redirects them to the resolved IP address.
            </p>
            <div className="p-4 bg-slate-700/30 rounded-lg">
              <h3 className="font-medium text-white mb-2">Installation</h3>
              <ol className="list-decimal list-inside text-slate-300 space-y-1 text-sm">
                <li>Clone the BitDNS repository</li>
                <li>Build the extension: <code className="px-1 py-0.5 bg-slate-700 rounded">cd apps/bitdns/extension && npm run build</code></li>
                <li>Open Chrome and go to <code className="px-1 py-0.5 bg-slate-700 rounded">chrome://extensions</code></li>
                <li>Enable &quot;Developer mode&quot;</li>
                <li>Click &quot;Load unpacked&quot; and select the <code className="px-1 py-0.5 bg-slate-700 rounded">dist</code> folder</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Example */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Quick Example</h2>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <p className="text-slate-300 mb-4">Register a domain using the API:</p>
            <pre className="p-4 bg-slate-900 rounded-lg overflow-x-auto text-sm">
              <code className="text-slate-300">{`curl -X POST http://localhost:3006/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "mysite.bit",
    "records": [
      {
        "record_type": "A",
        "value": "93.184.216.34",
        "ttl": 300
      }
    ]
  }'`}</code>
            </pre>
            <p className="text-slate-400 mt-4 text-sm">
              The domain will be registered on the next mined block.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
