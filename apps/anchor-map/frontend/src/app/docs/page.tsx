"use client";

import Link from "next/link";
import { ArrowLeft, Copy, Check, BookOpen, Code, MapPin, Zap, Terminal, Globe, MessageSquare, Layers } from "lucide-react";
import { useState } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-gray-400" />}
    </button>
  );
}

function CodeBlock({ code, language = "text" }: { code: string; language?: string }) {
  return (
    <div className="relative group">
      <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 overflow-x-auto text-sm">
        <code className={`language-${language} text-gray-300`}>{code}</code>
      </pre>
      <CopyButton text={code} />
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-secondary/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
              <span>Back to Map</span>
            </Link>
            <div className="flex items-center gap-3">
              <BookOpen size={24} className="text-primary" />
              <h1 className="text-xl font-bold text-white">Protocol Documentation</h1>
            </div>
            <div className="w-32" /> {/* Spacer */}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            AnchorMap <span className="text-primary">Protocol</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Build your own AnchorMap-compatible wallet or tool. This documentation covers the complete
            schema for encoding geo-markers on Bitcoin using the Anchor Protocol.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <a href="#message-format" className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-4 text-center transition-colors">
            <Layers size={24} className="text-primary mx-auto mb-2" />
            <span className="text-white text-sm">Message Format</span>
          </a>
          <a href="#payload-format" className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-4 text-center transition-colors">
            <MapPin size={24} className="text-accent mx-auto mb-2" />
            <span className="text-white text-sm">Payload Format</span>
          </a>
          <a href="#categories" className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-4 text-center transition-colors">
            <Globe size={24} className="text-green-400 mx-auto mb-2" />
            <span className="text-white text-sm">Categories</span>
          </a>
          <a href="#examples" className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-4 text-center transition-colors">
            <Code size={24} className="text-blue-400 mx-auto mb-2" />
            <span className="text-white text-sm">Code Examples</span>
          </a>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {/* Overview */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Globe size={24} className="text-primary" />
              Overview
            </h2>
            <p className="text-gray-400 mb-4">
              AnchorMap uses <strong className="text-white">Custom(5)</strong> Anchor messages to store geo-markers on the Bitcoin blockchain.
              Each marker contains a location (latitude/longitude), a category, and a message that is permanently stored on-chain.
            </p>
            <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <tbody className="divide-y divide-gray-700">
                  <tr>
                    <td className="px-4 py-3 text-gray-400">Anchor Kind</td>
                    <td className="px-4 py-3 text-white font-mono">Custom(5) = 0x85</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-400">Coordinate Range</td>
                    <td className="px-4 py-3 text-white font-mono">Lat: -90 to 90, Lng: -180 to 180</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-400">Precision</td>
                    <td className="px-4 py-3 text-white font-mono">32-bit float (~1 meter accuracy)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-400">Message Size</td>
                    <td className="px-4 py-3 text-white font-mono">Up to 255 bytes (UTF-8)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-400">Categories</td>
                    <td className="px-4 py-3 text-white font-mono">6 predefined (0-5)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Message Format */}
          <section id="message-format">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Layers size={24} className="text-primary" />
              Anchor Message Format
            </h2>
            <p className="text-gray-400 mb-4">
              AnchorMap uses the <strong className="text-white">Anchor Protocol</strong> to embed data in Bitcoin transactions.
              Each message has the following structure:
            </p>
            <CodeBlock code={`┌─────────────────────────────────────────────────────────────────────────┐
│                       ANCHOR MESSAGE FORMAT                             │
├──────────────┬──────────┬────────────────┬────────────────┬─────────────┤
│ Magic (4B)   │ Kind (1B)│ Anchor Count   │ Anchors        │ Body        │
│              │          │ (1B)           │ (9B × N)       │ (variable)  │
├──────────────┼──────────┼────────────────┼────────────────┼─────────────┤
│ 0xA11C0001   │ 0x85     │ 0x00           │ (optional)     │ geo marker  │
└──────────────┴──────────┴────────────────┴────────────────┴─────────────┘`} />
            
            <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden mt-4">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Field</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Size</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Value</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">Magic</td>
                    <td className="px-4 py-3 text-gray-300">4 bytes</td>
                    <td className="px-4 py-3 text-primary font-mono">0xA11C0001</td>
                    <td className="px-4 py-3 text-gray-400">Anchor Protocol v1 identifier</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">Kind</td>
                    <td className="px-4 py-3 text-gray-300">1 byte</td>
                    <td className="px-4 py-3 text-accent font-mono">0x85</td>
                    <td className="px-4 py-3 text-gray-400">Custom(5) - GeoMarker type</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">Anchor Count</td>
                    <td className="px-4 py-3 text-gray-300">1 byte</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">0x00</td>
                    <td className="px-4 py-3 text-gray-400">No parent references for markers</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">Body</td>
                    <td className="px-4 py-3 text-gray-300">variable</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">—</td>
                    <td className="px-4 py-3 text-gray-400">GeoMarker payload (see below)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mt-4">
              <p className="text-blue-300 text-sm">
                <strong>Note:</strong> Kind <code className="bg-blue-900/50 px-2 py-1 rounded">0x85</code> represents{" "}
                <code className="bg-blue-900/50 px-2 py-1 rounded">Custom(5)</code> in the Anchor Protocol.
                The high bit (0x80) indicates a custom kind, and the lower bits (0x05) are the custom ID.
              </p>
            </div>
          </section>

          {/* Payload Format */}
          <section id="payload-format">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <MapPin size={24} className="text-accent" />
              GeoMarker Payload Format
            </h2>
            <p className="text-gray-400 mb-4">
              The body of the Anchor message contains the geo-marker data with the following structure:
            </p>
            <CodeBlock code={`┌────────────────────────────────────────────────────────────────────────┐
│                    GEOMARKER PAYLOAD FORMAT                            │
├────────────┬────────────┬────────────┬─────────────────────────────────┤
│ Category   │ Latitude   │ Longitude  │ Message                         │
│ (1 byte)   │ (4 bytes)  │ (4 bytes)  │ (variable, UTF-8)               │
├────────────┼────────────┼────────────┼─────────────────────────────────┤
│ uint8      │ BE float32 │ BE float32 │ UTF-8 string (max 255 bytes)    │
└────────────┴────────────┴────────────┴─────────────────────────────────┘

Total minimum size: 9 bytes (1 + 4 + 4 + 0)
Total maximum size: 264 bytes (1 + 4 + 4 + 255)`} />

            <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden mt-4">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Field</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Size</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Type</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">Category</td>
                    <td className="px-4 py-3 text-gray-300">1 byte</td>
                    <td className="px-4 py-3 text-gray-300">uint8</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">0 - 5</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">Latitude</td>
                    <td className="px-4 py-3 text-gray-300">4 bytes</td>
                    <td className="px-4 py-3 text-gray-300">Big-Endian float32</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">-90.0 to 90.0</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">Longitude</td>
                    <td className="px-4 py-3 text-gray-300">4 bytes</td>
                    <td className="px-4 py-3 text-gray-300">Big-Endian float32</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">-180.0 to 180.0</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">Message</td>
                    <td className="px-4 py-3 text-gray-300">0-255 bytes</td>
                    <td className="px-4 py-3 text-gray-300">UTF-8 string</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">Any valid UTF-8</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mt-4">
              <p className="text-yellow-300 text-sm">
                <strong>Payload Size:</strong>{" "}
                <code className="bg-yellow-900/50 px-2 py-1 rounded">payload_size = 9 + message_length</code>
                <br />
                For OP_RETURN (80 bytes max), message can be up to ~64 characters.
              </p>
            </div>
          </section>

          {/* Categories */}
          <section id="categories">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Globe size={24} className="text-green-400" />
              Categories
            </h2>
            <p className="text-gray-400 mb-4">
              AnchorMap defines 6 predefined categories for organizing markers:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FF6B35] flex items-center justify-center text-white font-bold">0</div>
                <div>
                  <h4 className="text-white font-medium">General</h4>
                  <p className="text-gray-400 text-sm">Generic pins and notes</p>
                </div>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center text-white font-bold">1</div>
                <div>
                  <h4 className="text-white font-medium">Tourism</h4>
                  <p className="text-gray-400 text-sm">Travel spots, attractions</p>
                </div>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#22C55E] flex items-center justify-center text-white font-bold">2</div>
                <div>
                  <h4 className="text-white font-medium">Commerce</h4>
                  <p className="text-gray-400 text-sm">Shops, Bitcoin accepted</p>
                </div>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#A855F7] flex items-center justify-center text-white font-bold">3</div>
                <div>
                  <h4 className="text-white font-medium">Event</h4>
                  <p className="text-gray-400 text-sm">Meetups, conferences</p>
                </div>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EF4444] flex items-center justify-center text-white font-bold">4</div>
                <div>
                  <h4 className="text-white font-medium">Warning</h4>
                  <p className="text-gray-400 text-sm">Alerts, cautions</p>
                </div>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EAB308] flex items-center justify-center text-white font-bold">5</div>
                <div>
                  <h4 className="text-white font-medium">Historic</h4>
                  <p className="text-gray-400 text-sm">Historical places</p>
                </div>
              </div>
            </div>
          </section>

          {/* Carriers */}
          <section id="carriers">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Zap size={24} className="text-bitcoin" />
              Carrier Selection
            </h2>
            <p className="text-gray-400 mb-4">
              AnchorMap supports multiple Bitcoin transaction carriers. Choose based on your message size:
            </p>
            <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Carrier</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">ID</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Max Payload</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">~Max Message</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Best For</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  <tr>
                    <td className="px-4 py-3 text-white font-medium">OP_RETURN</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">0</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">80 bytes</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">~64 chars</td>
                    <td className="px-4 py-3 text-gray-400">Short messages</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-medium">Inscription</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">1</td>
                    <td className="px-4 py-3 text-primary font-mono">~400 KB</td>
                    <td className="px-4 py-3 text-primary font-mono">~400K chars</td>
                    <td className="px-4 py-3 text-green-400">Long messages</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-medium">Stamps</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">2</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">~10 KB</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">~10K chars</td>
                    <td className="px-4 py-3 text-gray-400">Medium messages</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Replies */}
          <section id="replies">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <MessageSquare size={24} className="text-purple-400" />
              Replies (Threading)
            </h2>
            <p className="text-gray-400 mb-4">
              Markers can have replies using the Anchor Protocol's threading mechanism. Replies use{" "}
              <code className="bg-gray-700 px-2 py-1 rounded">Kind = 1 (Text)</code> with a parent anchor.
            </p>
            <CodeBlock code={`┌─────────────────────────────────────────────────────────────────────────┐
│                       REPLY MESSAGE FORMAT                              │
├──────────────┬──────────┬────────────────┬────────────────┬─────────────┤
│ Magic (4B)   │ Kind (1B)│ Anchor Count   │ Parent Anchor  │ Body        │
│              │          │ (1B)           │ (9 bytes)      │ (message)   │
├──────────────┼──────────┼────────────────┼────────────────┼─────────────┤
│ 0xA11C0001   │ 0x01     │ 0x01           │ txid[0:8]+vout │ UTF-8 text  │
└──────────────┴──────────┴────────────────┴────────────────┴─────────────┘

Parent Anchor (9 bytes):
┌────────────────────────────┬─────────────┐
│ TXID Prefix (8 bytes)      │ Vout (1B)   │
├────────────────────────────┼─────────────┤
│ First 8 bytes of parent tx │ Output index│
└────────────────────────────┴─────────────┘`} />

            <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4 mt-4">
              <p className="text-purple-300 text-sm">
                <strong>TXID Prefix:</strong> The first 8 bytes of the parent marker's transaction ID
                in internal byte order (reversed from display order).
              </p>
            </div>
          </section>

          {/* Example */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Example: Create a Marker</h2>
            <p className="text-gray-400 mb-4">
              Create a marker at São Paulo, Brazil (General category):
            </p>
            <CodeBlock code={`Location: São Paulo, Brazil
Latitude:  -23.5505
Longitude: -46.6333
Category:  0 (General)
Message:   "Bitcoin meetup every Tuesday!"

Payload (hex):
00 C1BC8D40 C23A6E42 426974636F696E206D6565747570206576657279205475657364617921
│  │        │        └─ Message: "Bitcoin meetup every Tuesday!" (UTF-8)
│  │        └───────────── Longitude: -46.6333 (BE float32)
│  └────────────────────── Latitude: -23.5505 (BE float32)
└───────────────────────── Category: 0 (General)

Full Anchor message (hex):
A11C0001 85 00 00C1BC8D40C23A6E42426974636F696E206D6565747570206576657279205475657364617921
│        │  │  └─ Body (GeoMarker payload)
│        │  └───── Anchor count: 0
│        └──────── Kind: 0x85 (Custom(5))
└───────────────── Magic: Anchor v1`} />
          </section>

          {/* Code Examples */}
          <section id="examples">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Code size={24} className="text-blue-400" />
              Code Examples
            </h2>

            {/* TypeScript */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-white mb-2 flex items-center gap-2">
                <span className="text-blue-400">TypeScript</span>
                <span className="text-gray-500 text-sm font-normal">— Encode geo marker</span>
              </h3>
              <CodeBlock language="typescript" code={`function encodeGeoMarkerPayload(
  category: number,
  latitude: number,
  longitude: number,
  message: string
): Uint8Array {
  const messageBytes = new TextEncoder().encode(message);
  const buffer = new ArrayBuffer(9 + messageBytes.length);
  const view = new DataView(buffer);
  const arr = new Uint8Array(buffer);
  
  // Category (1 byte)
  view.setUint8(0, category);
  
  // Latitude (4 bytes, big-endian float32)
  view.setFloat32(1, latitude, false);
  
  // Longitude (4 bytes, big-endian float32)
  view.setFloat32(5, longitude, false);
  
  // Message (variable, UTF-8)
  arr.set(messageBytes, 9);
  
  return arr;
}

// Usage
const payload = encodeGeoMarkerPayload(
  0,           // General category
  -23.5505,    // São Paulo latitude
  -46.6333,    // São Paulo longitude
  "Bitcoin meetup every Tuesday!"
);
console.log(Buffer.from(payload).toString('hex'));`} />
            </div>

            {/* Python */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-white mb-2 flex items-center gap-2">
                <span className="text-yellow-400">Python</span>
                <span className="text-gray-500 text-sm font-normal">— Encode geo marker</span>
              </h3>
              <CodeBlock language="python" code={`import struct

def encode_geo_marker(category: int, lat: float, lng: float, message: str) -> bytes:
    """Encode a geo marker for AnchorMap protocol."""
    msg_bytes = message.encode('utf-8')
    
    data = struct.pack(
        '>Bff',           # Big-endian: 1 byte, 2 floats
        category,         # Category (uint8)
        lat,              # Latitude (float32)
        lng               # Longitude (float32)
    )
    data += msg_bytes     # Message (UTF-8)
    
    return data

# Usage
payload = encode_geo_marker(
    0,           # General category
    -23.5505,    # São Paulo latitude
    -46.6333,    # São Paulo longitude
    "Bitcoin meetup every Tuesday!"
)
print(payload.hex())`} />
            </div>

            {/* Rust */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-white mb-2 flex items-center gap-2">
                <span className="text-orange-400">Rust</span>
                <span className="text-gray-500 text-sm font-normal">— Decode geo marker</span>
              </h3>
              <CodeBlock language="rust" code={`pub struct GeoMarkerPayload {
    pub category: u8,
    pub latitude: f32,
    pub longitude: f32,
    pub message: String,
}

impl GeoMarkerPayload {
    pub fn parse(body: &[u8]) -> Option<Self> {
        if body.len() < 9 {
            return None;
        }
        
        let category = body[0];
        let latitude = f32::from_be_bytes([body[1], body[2], body[3], body[4]]);
        let longitude = f32::from_be_bytes([body[5], body[6], body[7], body[8]]);
        let message = String::from_utf8_lossy(&body[9..]).to_string();
        
        Some(Self { category, latitude, longitude, message })
    }
}`} />
            </div>
          </section>

          {/* API */}
          <section id="api">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Terminal size={24} className="text-green-400" />
              API Integration
            </h2>
            <p className="text-gray-400 mb-4">
              Create an AnchorMap marker via the Wallet API:
            </p>
            <CodeBlock language="bash" code={`curl -X POST http://localhost:3001/wallet/create-message \\
  -H "Content-Type: application/json" \\
  -d '{
    "kind": { "Custom": 5 },
    "body": "00c1bc8d40c23a6e42426974636f696e206d656574757021",
    "body_is_hex": true,
    "carrier": 0,
    "fee_rate": 1
  }'`} />

            <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden mt-4">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Field</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Type</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">kind</td>
                    <td className="px-4 py-3 text-gray-300">object</td>
                    <td className="px-4 py-3 text-gray-400">Must be <code className="text-primary">{`{ "Custom": 5 }`}</code> for AnchorMap</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">body</td>
                    <td className="px-4 py-3 text-gray-300">string</td>
                    <td className="px-4 py-3 text-gray-400">Hex-encoded GeoMarker payload</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">body_is_hex</td>
                    <td className="px-4 py-3 text-gray-300">boolean</td>
                    <td className="px-4 py-3 text-gray-400">Must be <code className="text-primary">true</code></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">carrier</td>
                    <td className="px-4 py-3 text-gray-300">number</td>
                    <td className="px-4 py-3 text-gray-400">0=OP_RETURN, 1=Inscription, 2=Stamps</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Validation */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Validation Rules</h2>
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
              <p className="text-yellow-300 mb-3">Your wallet should validate:</p>
              <ul className="text-yellow-200 space-y-1 text-sm list-disc list-inside">
                <li>Latitude: <code className="bg-yellow-900/50 px-1 rounded">-90.0 ≤ lat ≤ 90.0</code></li>
                <li>Longitude: <code className="bg-yellow-900/50 px-1 rounded">-180.0 ≤ lng ≤ 180.0</code></li>
                <li>Category: <code className="bg-yellow-900/50 px-1 rounded">0 ≤ category ≤ 5</code></li>
                <li>Message: Valid UTF-8, max 255 bytes</li>
                <li>Payload size fits carrier limits</li>
              </ul>
              <p className="text-yellow-300 mt-3 text-sm">
                <strong>Note:</strong> Invalid markers are silently ignored by the indexer.
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-500">
            AnchorMap is part of the{" "}
            <a href="https://github.com/AnchorProtocol" className="text-primary hover:underline">
              Anchor Protocol
            </a>{" "}
            ecosystem.
          </p>
          <p className="text-gray-600 text-sm mt-2">MIT License</p>
        </footer>
      </main>
    </div>
  );
}

