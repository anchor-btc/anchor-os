"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchMessage, fetchReplies, truncateTxid, formatBlockHeight, hexToImageDataUrl, CARRIER_INFO, BTC_EXPLORER_URL } from "@/lib/api";
import { MessageCard } from "@/components/message-card";
import {
  Loader2,
  MessageSquare,
  Box,
  Clock,
  Link2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Code,
  Binary,
  Hash,
  Layers,
  FileCode,
  Fingerprint,
  Database,
  Zap,
  Image as ImageIcon,
  Download,
  Package,
  HardDrive,
  Trash2,
  Coins,
  Percent,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import { TxStructure } from "@/components/tx-structure";

export default function MessagePage() {
  const params = useParams();
  const txid = params.txid as string;
  const vout = parseInt(params.vout as string);
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "payload" | "carrier" | "structure" | "anchors">("overview");

  const { data: message, isLoading, error } = useQuery({
    queryKey: ["message", txid, vout],
    queryFn: () => fetchMessage(txid, vout),
  });

  const { data: replies } = useQuery({
    queryKey: ["replies", txid, vout],
    queryFn: () => fetchReplies(txid, vout),
    enabled: !!message,
    refetchInterval: 5000,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(`${txid}:${vout}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyField = (field: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !message) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Message Not Found</h1>
        <p className="text-muted-foreground">
          The requested message could not be found.
        </p>
      </div>
    );
  }

  const hasText = message.body_text && message.body_text.trim().length > 0;
  const parentAnchor = message.anchors.find((a) => a.index === 0);
  
  // Check if this is an image message
  const isImage = message.kind === 4 || message.kind_name === "Image";
  const imageDataUrl = isImage ? hexToImageDataUrl(message.body_hex) : null;
  
  // Calculate technical details
  const bodySize = message.body_hex ? message.body_hex.length / 2 : 0;
  const anchorsSize = message.anchors.length * 9;
  const payloadSize = 4 + 1 + 1 + anchorsSize + bodySize;
  
  // Build ANCHOR payload hex
  const magicHex = "a11c0001";
  const kindHex = message.kind.toString(16).padStart(2, "0");
  const anchorCountHex = message.anchors.length.toString(16).padStart(2, "0");
  const anchorsHex = message.anchors
    .map((a) => a.txid_prefix + a.vout.toString(16).padStart(2, "0"))
    .join("");
  const fullPayloadHex = magicHex + kindHex + anchorCountHex + anchorsHex + message.body_hex;

  // Build OP_RETURN script
  const pushSize = payloadSize <= 75 
    ? payloadSize.toString(16).padStart(2, "0")
    : payloadSize <= 255 
      ? "4c" + payloadSize.toString(16).padStart(2, "0")
      : "4d" + (payloadSize & 0xff).toString(16).padStart(2, "0") + ((payloadSize >> 8) & 0xff).toString(16).padStart(2, "0");
  const opReturnScript = "6a" + pushSize + fullPayloadHex;

  return (
    <div className="space-y-8">
      {/* Message Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Message Details</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-mono text-sm">{truncateTxid(txid, 12)}</span>
            <button
              onClick={handleCopy}
              className="p-1 hover:text-primary transition-colors"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`${BTC_EXPLORER_URL}/tx/${txid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            title="View in local BTC Explorer"
          >
            <ExternalLink className="h-4 w-4" />
            BTC Explorer
          </a>
          <a
            href={`https://mempool.space/tx/${txid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            mempool.space
          </a>
          <Link
            href={`/thread/${txid}/${vout}`}
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <MessageSquare className="h-4 w-4" />
            View Thread
          </Link>
        </div>
      </div>

      {/* Message Content */}
      <article className="bg-card border border-border rounded-lg p-6">
        <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-muted-foreground">
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">
            {message.kind_name}
          </span>
          {message.carrier !== undefined && CARRIER_INFO[message.carrier] && (
            <span
              className={`px-3 py-1 rounded-full font-medium ${CARRIER_INFO[message.carrier].bgColor} ${CARRIER_INFO[message.carrier].textColor}`}
            >
              {CARRIER_INFO[message.carrier].icon} {CARRIER_INFO[message.carrier].label}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Box className="h-4 w-4" />
            {formatBlockHeight(message.block_height)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
          <span className="flex items-center gap-1">
            <Hash className="h-4 w-4" />
            vout: {vout}
          </span>
        </div>

        {parentAnchor && (
          <div className="mb-4 p-3 bg-secondary/50 rounded-lg">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              {parentAnchor.is_orphan ? (
                <span className="text-yellow-500">Parent not found</span>
              ) : parentAnchor.is_ambiguous ? (
                <span className="text-yellow-500">Ambiguous reference</span>
              ) : parentAnchor.resolved_txid ? (
                <Link
                  href={`/message/${parentAnchor.resolved_txid}/${parentAnchor.vout}`}
                  className="text-primary hover:underline font-mono"
                >
                  {truncateTxid(parentAnchor.resolved_txid)}:{parentAnchor.vout}
                </Link>
              ) : null}
            </span>
          </div>
        )}

        <div className="mb-6">
          {isImage && imageDataUrl ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
                <span>Image ({Math.floor(message.body_hex.length / 2)} bytes)</span>
              </div>
              <div className="flex flex-col items-start gap-4">
                <div className="relative border border-border rounded-xl overflow-hidden bg-secondary/50 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageDataUrl}
                    alt="ANCHOR Image"
                    className="max-w-full max-h-96 object-contain"
                    style={{ imageRendering: message.body_hex.length < 1000 ? "pixelated" : "auto" }}
                  />
                </div>
                <a
                  href={imageDataUrl}
                  download={`anchor-${message.txid.slice(0, 8)}.png`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Download className="h-4 w-4" />
                  Download Image
                </a>
              </div>
            </div>
          ) : hasText ? (
            <p className="text-lg whitespace-pre-wrap break-words">{message.body_text}</p>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Binary Data:</p>
              <pre className="bg-secondary p-4 rounded-lg overflow-x-auto font-mono text-sm">
                {message.body_hex}
              </pre>
            </div>
          )}
        </div>
      </article>

      {/* Technical Details */}
      <section className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowTechnical(!showTechnical)}
          className="w-full flex items-center justify-between p-5 hover:bg-secondary/50 transition-colors"
        >
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Code className="h-5 w-5 text-orange-500" />
            Technical Details
          </h2>
          {showTechnical ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        {showTechnical && (
          <div className="border-t border-border">
            {/* Tabs */}
            <div className="flex border-b border-border bg-gray-50 overflow-x-auto">
              <TabButton
                active={activeTab === "overview"}
                onClick={() => setActiveTab("overview")}
                icon={<Database className="h-4 w-4" />}
                label="Overview"
              />
              <TabButton
                active={activeTab === "payload"}
                onClick={() => setActiveTab("payload")}
                icon={<FileCode className="h-4 w-4" />}
                label="Payload"
              />
              {message.carrier !== undefined && CARRIER_INFO[message.carrier] && (
                <TabButton
                  active={activeTab === "carrier"}
                  onClick={() => setActiveTab("carrier")}
                  icon={<Package className="h-4 w-4" />}
                  label="Carrier"
                />
              )}
              <TabButton
                active={activeTab === "structure"}
                onClick={() => setActiveTab("structure")}
                icon={<Layers className="h-4 w-4" />}
                label="TX Anatomy"
              />
              {message.anchors.length > 0 && (
                <TabButton
                  active={activeTab === "anchors"}
                  onClick={() => setActiveTab("anchors")}
                  icon={<Link2 className="h-4 w-4" />}
                  label={`Anchors (${message.anchors.length})`}
                />
              )}
            </div>

            {/* Tab Content */}
            <div className="p-5">
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                      icon={<Zap className="h-5 w-5" />}
                      value={`${payloadSize}`}
                      unit="bytes"
                      label="Payload Size"
                      color="orange"
                    />
                    <StatCard
                      icon={<Binary className="h-5 w-5" />}
                      value={`${bodySize}`}
                      unit="bytes"
                      label="Body Size"
                      color="blue"
                    />
                    <StatCard
                      icon={<Link2 className="h-5 w-5" />}
                      value={message.anchors.length.toString()}
                      label="Anchors"
                      color="green"
                    />
                    <StatCard
                      icon={<Fingerprint className="h-5 w-5" />}
                      value={message.kind.toString()}
                      unit={message.kind_name}
                      label="Kind"
                      color="purple"
                    />
                  </div>

                  {/* Info Grid */}
                  <div className="grid gap-3">
                    <InfoRow
                      icon={<Hash className="h-4 w-4" />}
                      label="Transaction ID"
                      value={txid}
                      mono
                      copyable
                      onCopy={() => handleCopyField("txid", txid)}
                      copied={copiedField === "txid"}
                    />
                    <InfoRow
                      icon={<Layers className="h-4 w-4" />}
                      label="Output Index"
                      value={vout.toString()}
                    />
                    <InfoRow
                      icon={<Box className="h-4 w-4" />}
                      label="Block Height"
                      value={message.block_height?.toLocaleString() ?? "Unconfirmed"}
                    />
                    <InfoRow
                      icon={<Fingerprint className="h-4 w-4" />}
                      label="Magic Bytes"
                      value="0xA11C0001"
                      mono
                      badge="ANCHOR v1"
                    />
                  </div>

                  {/* External Links */}
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm font-medium mb-3 text-muted-foreground">View on Block Explorer</p>
                    <div className="flex flex-wrap gap-2">
                      <ExplorerLink href={`http://localhost:3003/tx/${txid}`} label="BTC Explorer (local)" highlight />
                      <ExplorerLink href={`https://mempool.space/tx/${txid}`} label="mempool.space" />
                      <ExplorerLink href={`https://blockstream.info/tx/${txid}`} label="blockstream.info" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "payload" && (
                <div className="space-y-6">
                  {/* ANCHOR Payload - Always shown */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-orange-500" />
                        ANCHOR Payload
                      </h3>
                      <CopyButton
                        onCopy={() => handleCopyField("payload", fullPayloadHex)}
                        copied={copiedField === "payload"}
                      />
                    </div>
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 overflow-x-auto shadow-inner">
                      <code className="text-sm font-mono break-all leading-relaxed">
                        <span className="text-orange-400 bg-orange-400/20 px-1 rounded">{magicHex}</span>
                        <span className="text-blue-400 bg-blue-400/20 px-1 rounded">{kindHex}</span>
                        <span className="text-purple-400 bg-purple-400/20 px-1 rounded">{anchorCountHex}</span>
                        {anchorsHex && <span className="text-emerald-400 bg-emerald-400/20 px-1 rounded">{anchorsHex}</span>}
                        <span className="text-gray-400">{message.body_hex}</span>
                      </code>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-3">
                      <Legend color="orange" label="Magic (4B)" />
                      <Legend color="blue" label="Kind (1B)" />
                      <Legend color="purple" label="Count (1B)" />
                      {anchorsHex && <Legend color="emerald" label={`Anchors (${message.anchors.length * 9}B)`} />}
                      <Legend color="gray" label={`Body (${bodySize}B)`} />
                    </div>
                  </div>

                  {/* Carrier-specific Script Details */}
                  {message.carrier === 0 && (
                    /* OP_RETURN Script */
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium flex items-center gap-2">
                          <Code className="h-4 w-4 text-red-500" />
                          OP_RETURN Script
                        </h3>
                        <CopyButton
                          onCopy={() => handleCopyField("script", opReturnScript)}
                          copied={copiedField === "script"}
                        />
                      </div>
                      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 overflow-x-auto shadow-inner">
                        <code className="text-sm font-mono break-all leading-relaxed">
                          <span className="text-red-400 bg-red-400/20 px-1 rounded">6a</span>
                          <span className="text-yellow-400 bg-yellow-400/20 px-1 rounded">{pushSize}</span>
                          <span className="text-gray-400">{fullPayloadHex}</span>
                        </code>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-3">
                        <Legend color="red" label="OP_RETURN (6a)" />
                        <Legend color="yellow" label="Push Size" />
                        <Legend color="gray" label="Payload" />
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Data stored in a prunable OP_RETURN output. Nodes can discard this data after validation.
                      </p>
                    </div>
                  )}

                  {message.carrier === 1 && (
                    /* Inscription Witness Data */
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium flex items-center gap-2">
                          <Code className="h-4 w-4 text-green-500" />
                          Inscription Envelope (Witness)
                        </h3>
                      </div>
                      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 overflow-x-auto shadow-inner">
                        <code className="text-sm font-mono break-all leading-relaxed">
                          <span className="text-red-400 bg-red-400/20 px-1 rounded">00</span>
                          <span className="text-yellow-400 bg-yellow-400/20 px-1 rounded">63</span>
                          <span className="text-cyan-400 bg-cyan-400/20 px-1 rounded">06616e63686f72</span>
                          <span className="text-blue-400 bg-blue-400/20 px-1 rounded">51</span>
                          <span className="text-purple-400 bg-purple-400/20 px-1 rounded">[content-type]</span>
                          <span className="text-pink-400 bg-pink-400/20 px-1 rounded">00</span>
                          <span className="text-gray-400">[payload]</span>
                          <span className="text-orange-400 bg-orange-400/20 px-1 rounded">68</span>
                          <span className="text-green-400 bg-green-400/20 px-1 rounded">51</span>
                        </code>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-3">
                        <Legend color="red" label="OP_FALSE (00)" />
                        <Legend color="yellow" label="OP_IF (63)" />
                        <Legend color="cyan" label="Protocol ID (anchor)" />
                        <Legend color="blue" label="Content-Type Tag" />
                        <Legend color="purple" label="MIME Type" />
                        <Legend color="pink" label="Body Tag (00)" />
                        <Legend color="gray" label="ANCHOR Payload" />
                        <Legend color="orange" label="OP_ENDIF (68)" />
                        <Legend color="green" label="OP_TRUE (51)" />
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Ordinals-style inscription using Taproot witness data. The envelope (OP_FALSE OP_IF...OP_ENDIF) 
                        is skipped during execution, preserving the data while OP_TRUE makes the script succeed.
                      </p>
                      <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs font-medium text-green-700 mb-1">📝 Commit + Reveal Pattern</p>
                        <p className="text-xs text-green-600">
                          This inscription uses a 2-transaction pattern: a commit transaction creates a Taproot output, 
                          then a reveal transaction spends it while exposing the inscription in the witness.
                        </p>
                      </div>
                    </div>
                  )}

                  {message.carrier === 2 && (
                    /* Stamps Multisig Script */
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium flex items-center gap-2">
                          <Code className="h-4 w-4 text-pink-500" />
                          Stamps Multisig Script
                        </h3>
                      </div>
                      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 overflow-x-auto shadow-inner">
                        <code className="text-sm font-mono break-all leading-relaxed">
                          <span className="text-red-400 bg-red-400/20 px-1 rounded">51</span>
                          <span className="text-cyan-400 bg-cyan-400/20 px-1 rounded">21</span>
                          <span className="text-gray-400">[33-byte pubkey with embedded data]</span>
                          <span className="text-purple-400 bg-purple-400/20 px-1 rounded">51</span>
                          <span className="text-yellow-400 bg-yellow-400/20 px-1 rounded">ae</span>
                        </code>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-3">
                        <Legend color="red" label="OP_1 (51)" />
                        <Legend color="cyan" label="Push 33 bytes (21)" />
                        <Legend color="gray" label="Fake Public Key (data)" />
                        <Legend color="purple" label="OP_1 (51)" />
                        <Legend color="yellow" label="OP_CHECKMULTISIG (ae)" />
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Data embedded in bare 1-of-1 multisig outputs using fake public keys. 
                        The first byte (02/03) mimics a compressed pubkey, followed by 32 bytes of data.
                      </p>
                      <div className="mt-4 p-3 bg-pink-50 rounded-lg border border-pink-200">
                        <p className="text-xs font-medium text-pink-700 mb-1">⚠️ Permanent & Unprunable</p>
                        <p className="text-xs text-pink-600">
                          Stamps data is stored in UTXOs that cannot be spent or pruned. This makes the data 
                          permanently part of the UTXO set, increasing storage requirements for all nodes.
                        </p>
                      </div>
                    </div>
                  )}

                  {message.carrier === 3 && (
                    /* Taproot Annex */
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium flex items-center gap-2">
                          <Code className="h-4 w-4 text-blue-500" />
                          Taproot Annex
                        </h3>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <p className="text-sm text-blue-700">
                          Data stored in the Taproot annex field (witness item starting with 0x50).
                          Currently reserved for future protocol upgrades.
                        </p>
                      </div>
                    </div>
                  )}

                  {message.carrier === 4 && (
                    /* Raw Witness Data */
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium flex items-center gap-2">
                          <Code className="h-4 w-4 text-purple-500" />
                          Raw Witness Data
                        </h3>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <p className="text-sm text-purple-700">
                          Data stored directly in the SegWit witness section without a specific envelope format.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Body Hex - Always shown */}
                  {message.body_hex && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium flex items-center gap-2">
                          <Binary className="h-4 w-4 text-blue-500" />
                          Body Data ({bodySize} bytes)
                        </h3>
                        <CopyButton
                          onCopy={() => handleCopyField("body", message.body_hex)}
                          copied={copiedField === "body"}
                        />
                      </div>
                      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 overflow-x-auto shadow-inner">
                        <code className="text-sm font-mono text-gray-300 break-all">
                          {message.body_hex}
                        </code>
                      </div>
                      {hasText && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Decoded: <span className="text-foreground">{message.body_text}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "carrier" && message.carrier !== undefined && CARRIER_INFO[message.carrier] && (
                <div className="space-y-6">
                  {/* Carrier Header */}
                  <div className={`rounded-xl overflow-hidden border ${CARRIER_INFO[message.carrier].borderColor}`}>
                    <div className={`p-5 ${CARRIER_INFO[message.carrier].bgColor}`}>
                      <div className="flex items-start gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-xl ${CARRIER_INFO[message.carrier].color} flex items-center justify-center text-2xl text-white`}>
                          {CARRIER_INFO[message.carrier].icon}
                        </div>
                        <div>
                          <h3 className={`text-lg font-semibold ${CARRIER_INFO[message.carrier].textColor}`}>
                            {CARRIER_INFO[message.carrier].label} Carrier
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Data embedding method used for this message
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4">
                        {CARRIER_INFO[message.carrier].description}
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {CARRIER_INFO[message.carrier].properties.map((prop, i) => (
                          <div key={i} className="bg-white/80 rounded-lg p-3 border border-white">
                            <p className="text-xs text-muted-foreground mb-1">{prop.label}</p>
                            <p className={`text-sm font-medium ${CARRIER_INFO[message.carrier].textColor}`}>
                              {prop.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* How This Carrier Works */}
                  <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-5 space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      How {CARRIER_INFO[message.carrier].label} Works
                    </h4>
                    <CarrierExplanation carrier={message.carrier} />
                  </div>

                  {/* UTXO Model Explanation */}
                  <div className="bg-muted/50 border border-border rounded-xl p-5">
                    <h4 className="font-medium flex items-center gap-2 mb-3">
                      <Layers className="h-4 w-4 text-primary" />
                      Understanding UTXOs
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Bitcoin uses an <strong className="text-foreground">Unspent Transaction Output (UTXO)</strong> model.
                      Each transaction consumes previous outputs (inputs) and creates new ones.
                      ANCHOR messages are embedded in these outputs or the witness data.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-3 text-xs flex-wrap">
                      <div className="px-3 py-2 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded font-mono">
                        UTXO (input)
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="px-4 py-2 bg-primary/10 border border-primary/30 rounded font-medium">
                        Transaction
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col gap-1">
                        <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded font-mono text-xs">
                          New UTXO
                        </div>
                        <div className="px-3 py-1 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded font-mono text-xs">
                          ⚓ ANCHOR
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Carrier Comparison */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-gray-500" />
                      Carrier Comparison
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Carrier</th>
                            <th className="text-left py-2 px-4 font-medium text-muted-foreground">Max Size</th>
                            <th className="text-left py-2 px-4 font-medium text-muted-foreground">Prunable</th>
                            <th className="text-left py-2 px-4 font-medium text-muted-foreground">UTXO Impact</th>
                            <th className="text-left py-2 pl-4 font-medium text-muted-foreground">Fee Discount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(CARRIER_INFO).map(([key, info]) => (
                            <tr 
                              key={key} 
                              className={`border-b border-gray-100 dark:border-gray-800 ${Number(key) === message.carrier ? 'bg-orange-50 dark:bg-orange-900/20' : ''}`}
                            >
                              <td className="py-2 pr-4">
                                <span className={`inline-flex items-center gap-1 ${Number(key) === message.carrier ? 'font-medium' : ''}`}>
                                  {info.icon} {info.label}
                                  {Number(key) === message.carrier && (
                                    <span className="text-xs bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-200 px-1.5 py-0.5 rounded ml-1">current</span>
                                  )}
                                </span>
                              </td>
                              <td className="py-2 px-4 text-muted-foreground">{info.properties[0]?.value || '-'}</td>
                              <td className="py-2 px-4 text-muted-foreground">{info.properties[1]?.value || '-'}</td>
                              <td className="py-2 px-4 text-muted-foreground">{info.properties[2]?.value || '-'}</td>
                              <td className="py-2 pl-4 text-muted-foreground">{info.properties[3]?.value || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "structure" && (
                <TxStructure
                  txid={txid}
                  vout={vout}
                  carrier={message.carrier}
                  carrierName={message.carrier_name}
                  bodyHex={message.body_hex}
                  anchors={message.anchors.map((a) => ({
                    index: a.index,
                    txid_prefix: a.txid_prefix,
                    vout: a.vout,
                  }))}
                />
              )}

              {activeTab === "anchors" && message.anchors.length > 0 && (
                <div className="space-y-4">
                  {message.anchors.map((anchor, i) => (
                    <div
                      key={i}
                      className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            i === 0 ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-600"
                          }`}>
                            <span className="text-lg font-bold">#{i}</span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {i === 0 ? "Canonical Parent" : `Reference #${i}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              9 bytes per anchor
                            </p>
                          </div>
                        </div>
                        <StatusBadge
                          status={anchor.is_orphan ? "orphan" : anchor.is_ambiguous ? "ambiguous" : "resolved"}
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">TxID Prefix (8 bytes)</p>
                          <p className="font-mono text-sm text-cyan-600 font-medium">{anchor.txid_prefix}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Output Index</p>
                          <p className="font-mono text-sm text-pink-600 font-medium">{anchor.vout}</p>
                        </div>
                      </div>

                      {anchor.resolved_txid && (
                        <div className="mt-4 bg-green-50 rounded-lg p-3 border border-green-100">
                          <p className="text-xs text-green-600 mb-1 font-medium">✓ Resolved Transaction</p>
                          <Link
                            href={`/message/${anchor.resolved_txid}/${anchor.vout}`}
                            className="font-mono text-sm text-primary hover:underline break-all"
                          >
                            {anchor.resolved_txid}
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Replies */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Replies ({replies?.length || 0})
          </h2>
          <Link
            href={`/compose?parent=${txid}&vout=${vout}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <MessageSquare className="h-4 w-4" />
            Reply
          </Link>
        </div>

        {replies && replies.length > 0 ? (
          <div className="space-y-4">
            {replies.map((reply) => (
              <MessageCard key={`${reply.txid}-${reply.vout}`} message={reply} isReply />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-card rounded-lg border border-border">
            <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No replies yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to start the conversation!
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors relative ${
        active
          ? "text-orange-600 bg-white"
          : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
      }`}
    >
      {icon}
      {label}
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
      )}
    </button>
  );
}

// Stat Card Component
function StatCard({
  icon,
  value,
  unit,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  unit?: string;
  label: string;
  color: "orange" | "blue" | "green" | "purple";
}) {
  const colors = {
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
  };

  return (
    <div className={`rounded-xl p-4 border ${colors[color]} transition-transform hover:scale-105`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-2xl font-bold">{value}</span>
        {unit && <span className="text-sm opacity-70">{unit}</span>}
      </div>
      <p className="text-xs opacity-70">{label}</p>
    </div>
  );
}

// Info Row Component
function InfoRow({
  icon,
  label,
  value,
  mono,
  badge,
  copyable,
  onCopy,
  copied,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  badge?: string;
  copyable?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3 text-muted-foreground">
        {icon}
        <span className="text-sm font-medium text-foreground">{label}</span>
        {badge && (
          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm ${mono ? "font-mono" : ""} text-right truncate max-w-[200px] md:max-w-[400px]`}>
          {value}
        </span>
        {copyable && onCopy && (
          <button onClick={onCopy} className="p-1.5 hover:bg-gray-200 rounded transition-colors">
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 text-gray-400" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// Copy Button Component
function CopyButton({ onCopy, copied }: { onCopy: () => void; copied: boolean }) {
  return (
    <button
      onClick={onCopy}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
        copied
          ? "bg-green-100 text-green-600"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copy
        </>
      )}
    </button>
  );
}

// Legend Component
function Legend({ color, label }: { color: string; label: string }) {
  const colors: Record<string, string> = {
    orange: "bg-orange-400",
    blue: "bg-blue-400",
    purple: "bg-purple-400",
    emerald: "bg-emerald-400",
    gray: "bg-gray-400",
    red: "bg-red-400",
    yellow: "bg-yellow-400",
  };

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`w-3 h-3 rounded ${colors[color]}`}></span>
      {label}
    </span>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: "resolved" | "orphan" | "ambiguous" }) {
  const styles = {
    resolved: "bg-green-100 text-green-700 border-green-200",
    orphan: "bg-yellow-100 text-yellow-700 border-yellow-200",
    ambiguous: "bg-orange-100 text-orange-700 border-orange-200",
  };

  const labels = {
    resolved: "✓ Resolved",
    orphan: "⚠ Orphan",
    ambiguous: "⚠ Ambiguous",
  };

  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// Explorer Link Component
function ExplorerLink({ href, label, highlight }: { href: string; label: string; highlight?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${
        highlight
          ? "bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-200"
          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
      }`}
    >
      <ExternalLink className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

// Carrier Explanation Component
function CarrierExplanation({ carrier }: { carrier: number }) {
  const explanations: Record<number, React.ReactNode> = {
    0: (
      <>
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">OP_RETURN</strong> is Bitcoin&apos;s native data carrier. 
          It creates a provably unspendable output that can store up to 80 bytes of arbitrary data.
        </p>
        <ul className="list-none space-y-1 ml-2 text-sm text-muted-foreground">
          <li><span className="text-green-600 dark:text-green-400">✓</span> Prunable: Nodes can discard after validation</li>
          <li><span className="text-green-600 dark:text-green-400">✓</span> No UTXO bloat: Doesn&apos;t create spendable outputs</li>
          <li><span className="text-green-600 dark:text-green-400">✓</span> Standard: Relayed by all Bitcoin nodes</li>
        </ul>
      </>
    ),
    1: (
      <>
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Inscriptions</strong> (Ordinals-style) embed data in Taproot witness
          using an envelope pattern. The data is revealed in a script-path spend.
        </p>
        <ul className="list-none space-y-1 ml-2 text-sm text-muted-foreground">
          <li><span className="text-green-600 dark:text-green-400">✓</span> 75% fee discount (witness data)</li>
          <li><span className="text-green-600 dark:text-green-400">✓</span> Up to ~4MB of data per transaction</li>
          <li><span className="text-yellow-600 dark:text-yellow-400">!</span> Requires commit+reveal transaction pattern</li>
        </ul>
      </>
    ),
    2: (
      <>
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Stamps</strong> encode data in bare multisig scripts. 
          The &quot;public keys&quot; are actually data chunks, making the data permanent.
        </p>
        <ul className="list-none space-y-1 ml-2 text-sm text-muted-foreground">
          <li><span className="text-red-600 dark:text-red-400">⚠</span> Creates permanent UTXOs that cannot be pruned</li>
          <li><span className="text-red-600 dark:text-red-400">⚠</span> Increases node storage forever</li>
          <li><span className="text-yellow-600 dark:text-yellow-400">!</span> Most expensive, but truly permanent</li>
        </ul>
      </>
    ),
    3: (
      <>
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Taproot Annex</strong> is a reserved field in BIP-341. 
          It&apos;s the last element of the witness stack, prefixed with 0x50.
        </p>
        <ul className="list-none space-y-1 ml-2 text-sm text-muted-foreground">
          <li><span className="text-green-600 dark:text-green-400">✓</span> Part of the signature hash</li>
          <li><span className="text-yellow-600 dark:text-yellow-400">!</span> Not relayed by standard nodes</li>
          <li><span className="text-yellow-600 dark:text-yellow-400">!</span> Requires libre relay or direct miner</li>
        </ul>
      </>
    ),
    4: (
      <>
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Witness Data</strong> embeds data in a Tapscript that drops all
          pushed data and returns true, making it always spendable.
        </p>
        <ul className="list-none space-y-1 ml-2 text-sm text-muted-foreground">
          <li><span className="text-green-600 dark:text-green-400">✓</span> 75% fee discount (witness data)</li>
          <li><span className="text-green-600 dark:text-green-400">✓</span> Up to ~4MB of data per transaction</li>
          <li><span className="text-green-600 dark:text-green-400">✓</span> Prunable after validation</li>
        </ul>
      </>
    ),
  };

  return (
    <div className="space-y-3">
      {explanations[carrier] || <p className="text-sm text-muted-foreground">Unknown carrier type.</p>}
    </div>
  );
}
