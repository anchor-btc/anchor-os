"use client";

import Link from "next/link";
import { ArrowLeft, Copy, Check, BookOpen, Code, Layers, Palette, Zap, Terminal } from "lucide-react";
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
              <span>Back to Canvas</span>
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
            AnchorCanvas <span className="text-primary">Protocol</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Build your own AnchorCanvas-compatible wallet or tool. This documentation covers the complete
            schema for encoding and decoding pixel data on Bitcoin.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <a href="#message-format" className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-4 text-center transition-colors">
            <Layers size={24} className="text-primary mx-auto mb-2" />
            <span className="text-white text-sm">Message Format</span>
          </a>
          <a href="#pixel-format" className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-4 text-center transition-colors">
            <Palette size={24} className="text-accent mx-auto mb-2" />
            <span className="text-white text-sm">Pixel Format</span>
          </a>
          <a href="#carriers" className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-4 text-center transition-colors">
            <Zap size={24} className="text-bitcoin mx-auto mb-2" />
            <span className="text-white text-sm">Carriers</span>
          </a>
          <a href="#examples" className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-4 text-center transition-colors">
            <Code size={24} className="text-green-400 mx-auto mb-2" />
            <span className="text-white text-sm">Code Examples</span>
          </a>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {/* Canvas Specs */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Palette size={24} className="text-primary" />
              Canvas Specifications
            </h2>
            <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <tbody className="divide-y divide-gray-700">
                  <tr>
                    <td className="px-4 py-3 text-gray-400">Canvas Size</td>
                    <td className="px-4 py-3 text-white font-mono">4580 × 4580 pixels</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-400">Total Pixels</td>
                    <td className="px-4 py-3 text-white font-mono">20,976,400 (~21 million)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-400">Coordinate Range</td>
                    <td className="px-4 py-3 text-white font-mono">X: 0-4579, Y: 0-4579</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-400">Origin</td>
                    <td className="px-4 py-3 text-white font-mono">(0, 0) = Top-left</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-400">Color Space</td>
                    <td className="px-4 py-3 text-white font-mono">RGB 24-bit (0-255 per channel)</td>
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
              AnchorCanvas uses the <strong className="text-white">Anchor Protocol</strong> to embed data in Bitcoin transactions.
              Each message has the following structure:
            </p>
            <CodeBlock code={`┌─────────────────────────────────────────────────────────────────────────┐
│                       ANCHOR MESSAGE FORMAT                             │
├──────────────┬──────────┬────────────────┬────────────────┬─────────────┤
│ Magic (4B)   │ Kind (1B)│ Anchor Count   │ Anchors        │ Body        │
│              │          │ (1B)           │ (9B × N)       │ (variable)  │
├──────────────┼──────────┼────────────────┼────────────────┼─────────────┤
│ 0xA11C0001   │ 0x02     │ 0x00           │ (optional)     │ pixel data  │
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
                    <td className="px-4 py-3 text-accent font-mono">0x02</td>
                    <td className="px-4 py-3 text-gray-400">State message (for pixel data)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">Anchor Count</td>
                    <td className="px-4 py-3 text-gray-300">1 byte</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">0x00-0xFF</td>
                    <td className="px-4 py-3 text-gray-400">Number of parent references (usually 0)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">Anchors</td>
                    <td className="px-4 py-3 text-gray-300">9 × N bytes</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">—</td>
                    <td className="px-4 py-3 text-gray-400">Optional parent txid prefixes</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">Body</td>
                    <td className="px-4 py-3 text-gray-300">variable</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">—</td>
                    <td className="px-4 py-3 text-gray-400">Pixel payload (see below)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Pixel Format */}
          <section id="pixel-format">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Palette size={24} className="text-accent" />
              Pixel Payload Format
            </h2>
            <p className="text-gray-400 mb-4">
              The body of the Anchor message contains the pixel data with the following structure:
            </p>
            <CodeBlock code={`┌────────────────────────────────────────────────────────────────────────┐
│                       PIXEL PAYLOAD FORMAT                              │
├────────────────┬───────────────────────────────────────────────────────┤
│ Pixel Count    │ Pixels Array                                          │
│ (4 bytes)      │ (7 bytes × N)                                         │
├────────────────┼───────────────────────────────────────────────────────┤
│ BE uint32      │ [pixel_0][pixel_1]...[pixel_N-1]                      │
└────────────────┴───────────────────────────────────────────────────────┘

Each Pixel (7 bytes):
┌────────────┬────────────┬─────────┬─────────┬─────────┐
│ X (2B)     │ Y (2B)     │ R (1B)  │ G (1B)  │ B (1B)  │
├────────────┼────────────┼─────────┼─────────┼─────────┤
│ BE uint16  │ BE uint16  │ uint8   │ uint8   │ uint8   │
└────────────┴────────────┴─────────┴─────────┴─────────┘`} />

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
                    <td className="px-4 py-3 text-white font-mono">Pixel Count</td>
                    <td className="px-4 py-3 text-gray-300">4 bytes</td>
                    <td className="px-4 py-3 text-gray-300">Big-Endian uint32</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">1 - 557,142</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">X</td>
                    <td className="px-4 py-3 text-gray-300">2 bytes</td>
                    <td className="px-4 py-3 text-gray-300">Big-Endian uint16</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">0 - 4579</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">Y</td>
                    <td className="px-4 py-3 text-gray-300">2 bytes</td>
                    <td className="px-4 py-3 text-gray-300">Big-Endian uint16</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">0 - 4579</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">R (Red)</td>
                    <td className="px-4 py-3 text-gray-300">1 byte</td>
                    <td className="px-4 py-3 text-gray-300">uint8</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">0 - 255</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">G (Green)</td>
                    <td className="px-4 py-3 text-gray-300">1 byte</td>
                    <td className="px-4 py-3 text-gray-300">uint8</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">0 - 255</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">B (Blue)</td>
                    <td className="px-4 py-3 text-gray-300">1 byte</td>
                    <td className="px-4 py-3 text-gray-300">uint8</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">0 - 255</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mt-4">
              <p className="text-blue-300 text-sm">
                <strong>Payload Size Formula:</strong>{" "}
                <code className="bg-blue-900/50 px-2 py-1 rounded">payload_size = 6 + (4 + num_pixels × 7) = 10 + num_pixels × 7</code>
              </p>
            </div>
          </section>

          {/* Carriers */}
          <section id="carriers">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Zap size={24} className="text-bitcoin" />
              Carrier Selection
            </h2>
            <p className="text-gray-400 mb-4">
              AnchorCanvas supports multiple Bitcoin transaction carriers. Choose based on your payload size and fee preferences:
            </p>
            <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Carrier</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">ID</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Max Payload</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">~Max Pixels</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Fee Discount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  <tr>
                    <td className="px-4 py-3 text-white font-medium">OP_RETURN</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">0</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">80 bytes</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">~10</td>
                    <td className="px-4 py-3 text-gray-400">None</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-medium">Inscription</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">1</td>
                    <td className="px-4 py-3 text-primary font-mono">~3.9 MB</td>
                    <td className="px-4 py-3 text-primary font-mono">~557K</td>
                    <td className="px-4 py-3 text-green-400">75%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-medium">Witness Data</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">4</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">~520 KB</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">~74K</td>
                    <td className="px-4 py-3 text-green-400">75%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">OP_RETURN</h4>
                <p className="text-gray-400 text-sm">Best for quick single-pixel edits. Cheapest for small payloads.</p>
              </div>
              <div className="bg-gray-800 border border-primary/50 rounded-lg p-4">
                <h4 className="text-primary font-medium mb-2">Inscription ⭐</h4>
                <p className="text-gray-400 text-sm">Best for large images. Can fit almost a full block (~746×746 px image)!</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">Witness Data</h4>
                <p className="text-gray-400 text-sm">Good balance of size and fees. Great for medium batches.</p>
              </div>
            </div>
          </section>

          {/* Example */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Example: Single Red Pixel</h2>
            <p className="text-gray-400 mb-4">
              Paint a red pixel at coordinates (100, 200):
            </p>
            <CodeBlock code={`Full Anchor message (hex):
A11C0001 02 00 00000001 0064 00C8 FF 00 00
│        │  │  │        │    │    │  │  └─ B = 0
│        │  │  │        │    │    │  └──── G = 0
│        │  │  │        │    │    └─────── R = 255 (red)
│        │  │  │        │    └───────────── Y = 200 (0x00C8)
│        │  │  │        └────────────────── X = 100 (0x0064)
│        │  │  └─────────────────────────── Count = 1
│        │  └────────────────────────────── Anchor count = 0
│        └───────────────────────────────── Kind = 2 (State)
└────────────────────────────────────────── Magic = ANCHOR v1`} />
          </section>

          {/* Code Examples */}
          <section id="examples">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Code size={24} className="text-green-400" />
              Code Examples
            </h2>

            {/* TypeScript */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-white mb-2 flex items-center gap-2">
                <span className="text-blue-400">TypeScript</span>
                <span className="text-gray-500 text-sm font-normal">— Encode pixels</span>
              </h3>
              <CodeBlock language="typescript" code={`function encodePixelPayload(pixels: {x: number, y: number, r: number, g: number, b: number}[]): Uint8Array {
  const buffer = new ArrayBuffer(4 + pixels.length * 7);
  const view = new DataView(buffer);
  
  // Pixel count (big-endian u32)
  view.setUint32(0, pixels.length, false);
  
  // Each pixel
  let offset = 4;
  for (const p of pixels) {
    view.setUint16(offset, p.x, false);      // X
    view.setUint16(offset + 2, p.y, false);  // Y
    view.setUint8(offset + 4, p.r);          // R
    view.setUint8(offset + 5, p.g);          // G
    view.setUint8(offset + 6, p.b);          // B
    offset += 7;
  }
  
  return new Uint8Array(buffer);
}

// Usage
const pixels = [{ x: 100, y: 200, r: 255, g: 0, b: 0 }];
const payload = encodePixelPayload(pixels);
console.log(Buffer.from(payload).toString('hex'));
// Output: 00000001006400c8ff0000`} />
            </div>

            {/* Python */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-white mb-2 flex items-center gap-2">
                <span className="text-yellow-400">Python</span>
                <span className="text-gray-500 text-sm font-normal">— Encode pixels</span>
              </h3>
              <CodeBlock language="python" code={`import struct

def encode_pixel_payload(pixels):
    """Encode pixels to bytes for AnchorCanvas protocol."""
    data = struct.pack('>I', len(pixels))  # Big-endian u32
    for p in pixels:
        data += struct.pack('>HH', p['x'], p['y'])  # Big-endian u16
        data += struct.pack('BBB', p['r'], p['g'], p['b'])  # u8
    return data

# Usage
pixels = [{'x': 100, 'y': 200, 'r': 255, 'g': 0, 'b': 0}]
payload = encode_pixel_payload(pixels)
print(payload.hex())
# Output: 00000001006400c8ff0000`} />
            </div>

            {/* Rust */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-white mb-2 flex items-center gap-2">
                <span className="text-orange-400">Rust</span>
                <span className="text-gray-500 text-sm font-normal">— Decode pixels</span>
              </h3>
              <CodeBlock language="rust" code={`fn parse_pixel_payload(body: &[u8]) -> Vec<Pixel> {
    let num_pixels = u32::from_be_bytes([body[0], body[1], body[2], body[3]]) as usize;
    let mut pixels = Vec::with_capacity(num_pixels);
    
    for i in 0..num_pixels {
        let offset = 4 + i * 7;
        let x = u16::from_be_bytes([body[offset], body[offset + 1]]);
        let y = u16::from_be_bytes([body[offset + 2], body[offset + 3]]);
        let r = body[offset + 4];
        let g = body[offset + 5];
        let b = body[offset + 6];
        pixels.push(Pixel { x, y, r, g, b });
    }
    
    pixels
}`} />
            </div>
          </section>

          {/* API */}
          <section id="api">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Terminal size={24} className="text-purple-400" />
              API Integration
            </h2>
            <p className="text-gray-400 mb-4">
              Create an AnchorCanvas transaction via the Wallet API:
            </p>
            <CodeBlock language="bash" code={`curl -X POST http://localhost:3001/wallet/create-message \\
  -H "Content-Type: application/json" \\
  -d '{
    "kind": 2,
    "body": "00000001006400c8ff0000",
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
                    <td className="px-4 py-3 text-gray-300">number</td>
                    <td className="px-4 py-3 text-gray-400">Must be <code className="text-primary">2</code> (State) for AnchorCanvas</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">body</td>
                    <td className="px-4 py-3 text-gray-300">string</td>
                    <td className="px-4 py-3 text-gray-400">Hex-encoded pixel payload</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">body_is_hex</td>
                    <td className="px-4 py-3 text-gray-300">boolean</td>
                    <td className="px-4 py-3 text-gray-400">Must be <code className="text-primary">true</code></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">carrier</td>
                    <td className="px-4 py-3 text-gray-300">number</td>
                    <td className="px-4 py-3 text-gray-400">0=OP_RETURN, 1=Inscription, 4=WitnessData</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white font-mono">fee_rate</td>
                    <td className="px-4 py-3 text-gray-300">number</td>
                    <td className="px-4 py-3 text-gray-400">Fee rate in sat/vB (default: 1)</td>
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
                <li>Coordinates: <code className="bg-yellow-900/50 px-1 rounded">0 ≤ x &lt; 4580</code> and <code className="bg-yellow-900/50 px-1 rounded">0 ≤ y &lt; 4580</code></li>
                <li>Colors: <code className="bg-yellow-900/50 px-1 rounded">0 ≤ r, g, b ≤ 255</code></li>
                <li>Payload size matches carrier limits</li>
                <li>Transaction has sufficient fee</li>
              </ul>
              <p className="text-yellow-300 mt-3 text-sm">
                <strong>Note:</strong> Invalid pixels are silently ignored by the indexer.
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-500">
            AnchorCanvas is part of the{" "}
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

