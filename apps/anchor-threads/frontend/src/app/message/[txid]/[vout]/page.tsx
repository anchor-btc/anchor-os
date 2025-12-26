'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import {
  fetchMessage,
  fetchReplies,
  truncateTxid,
  formatBlockHeight,
  hexToImageDataUrl,
  CARRIER_INFO,
  getExplorerTxUrl,
  BTC_EXPLORER_URL,
} from '@/lib/api';
import { MessageCard } from '@/components/message-card';
import { Button, Card, Container } from '@AnchorProtocol/ui';
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
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useState } from 'react';
import { TxStructure } from '@/components/tx-structure';

export default function MessagePage() {
  const params = useParams();
  const txid = params.txid as string;
  const vout = parseInt(params.vout as string);
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'payload' | 'carrier' | 'structure' | 'anchors'
  >('overview');

  const {
    data: message,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['message', txid, vout],
    queryFn: () => fetchMessage(txid, vout),
  });

  const { data: replies } = useQuery({
    queryKey: ['replies', txid, vout],
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
      <Container className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Container>
    );
  }

  if (error || !message) {
    return (
      <Container className="text-center py-20">
        <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2 text-foreground">Message Not Found</h1>
        <p className="text-muted-foreground">The requested message could not be found.</p>
      </Container>
    );
  }

  const hasText = message.body_text && message.body_text.trim().length > 0;
  const parentAnchor = message.anchors.find((a) => a.index === 0);

  // Check if this is an image message
  const isImage = message.kind === 4 || message.kind_name === 'Image';
  const imageDataUrl = isImage ? hexToImageDataUrl(message.body_hex) : null;

  // Calculate technical details
  const bodySize = message.body_hex ? message.body_hex.length / 2 : 0;
  const anchorsSize = message.anchors.length * 9;
  const payloadSize = 4 + 1 + 1 + anchorsSize + bodySize;

  // Build ANCHOR payload hex
  const magicHex = 'a11c0001';
  const kindHex = message.kind.toString(16).padStart(2, '0');
  const anchorCountHex = message.anchors.length.toString(16).padStart(2, '0');
  const anchorsHex = message.anchors
    .map((a) => a.txid_prefix + a.vout.toString(16).padStart(2, '0'))
    .join('');
  const fullPayloadHex = magicHex + kindHex + anchorCountHex + anchorsHex + message.body_hex;

  // Build OP_RETURN script
  const pushSize =
    payloadSize <= 75
      ? payloadSize.toString(16).padStart(2, '0')
      : payloadSize <= 255
        ? '4c' + payloadSize.toString(16).padStart(2, '0')
        : '4d' +
          (payloadSize & 0xff).toString(16).padStart(2, '0') +
          ((payloadSize >> 8) & 0xff).toString(16).padStart(2, '0');
  const opReturnScript = '6a' + pushSize + fullPayloadHex;

  return (
    <Container className="space-y-8">
      {/* Message Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2 text-foreground">Message Details</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-mono text-sm">{truncateTxid(txid, 12)}</span>
            <button onClick={handleCopy} className="p-1 hover:text-primary transition-colors">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <a
              href={`${BTC_EXPLORER_URL}/tx/${txid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              BTC Explorer
            </a>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a
              href={getExplorerTxUrl(txid)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Explorer
            </a>
          </Button>
          <Button asChild variant="link">
            <Link href={`/thread/${txid}/${vout}`} className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              View Thread
            </Link>
          </Button>
        </div>
      </div>

      {/* Message Content */}
      <Card className="p-6">
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
                <span className="text-warning">Parent not found</span>
              ) : parentAnchor.is_ambiguous ? (
                <span className="text-warning">Ambiguous reference</span>
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
                    style={{
                      imageRendering: message.body_hex.length < 1000 ? 'pixelated' : 'auto',
                    }}
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
            <p className="text-lg whitespace-pre-wrap break-words text-foreground">
              {message.body_text}
            </p>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Binary Data:</p>
              <pre className="bg-secondary p-4 rounded-lg overflow-x-auto font-mono text-sm">
                {message.body_hex}
              </pre>
            </div>
          )}
        </div>
      </Card>

      {/* Technical Details */}
      <Card className="overflow-hidden">
        <button
          onClick={() => setShowTechnical(!showTechnical)}
          className="w-full flex items-center justify-between p-5 hover:bg-secondary/50 transition-colors"
        >
          <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <Code className="h-5 w-5 text-primary" />
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
            <div className="flex border-b border-border bg-secondary/50 overflow-x-auto">
              <TabButton
                active={activeTab === 'overview'}
                onClick={() => setActiveTab('overview')}
                icon={<Database className="h-4 w-4" />}
                label="Overview"
              />
              <TabButton
                active={activeTab === 'payload'}
                onClick={() => setActiveTab('payload')}
                icon={<FileCode className="h-4 w-4" />}
                label="Payload"
              />
              {message.carrier !== undefined && CARRIER_INFO[message.carrier] && (
                <TabButton
                  active={activeTab === 'carrier'}
                  onClick={() => setActiveTab('carrier')}
                  icon={<Package className="h-4 w-4" />}
                  label="Carrier"
                />
              )}
              <TabButton
                active={activeTab === 'structure'}
                onClick={() => setActiveTab('structure')}
                icon={<Layers className="h-4 w-4" />}
                label="TX Anatomy"
              />
              {message.anchors.length > 0 && (
                <TabButton
                  active={activeTab === 'anchors'}
                  onClick={() => setActiveTab('anchors')}
                  icon={<Link2 className="h-4 w-4" />}
                  label={`Anchors (${message.anchors.length})`}
                />
              )}
            </div>

            {/* Tab Content */}
            <div className="p-5">
              {activeTab === 'overview' && (
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
                      onCopy={() => handleCopyField('txid', txid)}
                      copied={copiedField === 'txid'}
                    />
                    <InfoRow
                      icon={<Layers className="h-4 w-4" />}
                      label="Output Index"
                      value={vout.toString()}
                    />
                    <InfoRow
                      icon={<Box className="h-4 w-4" />}
                      label="Block Height"
                      value={message.block_height?.toLocaleString() ?? 'Unconfirmed'}
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
                    <p className="text-sm font-medium mb-3 text-muted-foreground">
                      View on Block Explorer
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <ExplorerLink
                        href={getExplorerTxUrl(txid)}
                        label="Default Explorer"
                        highlight
                      />
                      <ExplorerLink
                        href={`https://mempool.space/tx/${txid}`}
                        label="mempool.space"
                      />
                      <ExplorerLink
                        href={`https://blockstream.info/tx/${txid}`}
                        label="blockstream.info"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'payload' && (
                <div className="space-y-6">
                  {/* ANCHOR Payload */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium flex items-center gap-2 text-foreground">
                        <FileCode className="h-4 w-4 text-primary" />
                        ANCHOR Payload
                      </h3>
                      <CopyButton
                        onCopy={() => handleCopyField('payload', fullPayloadHex)}
                        copied={copiedField === 'payload'}
                      />
                    </div>
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 overflow-x-auto shadow-inner">
                      <code className="text-sm font-mono break-all leading-relaxed">
                        <span className="text-orange-400 bg-orange-400/20 px-1 rounded">
                          {magicHex}
                        </span>
                        <span className="text-blue-400 bg-blue-400/20 px-1 rounded">{kindHex}</span>
                        <span className="text-purple-400 bg-purple-400/20 px-1 rounded">
                          {anchorCountHex}
                        </span>
                        {anchorsHex && (
                          <span className="text-emerald-400 bg-emerald-400/20 px-1 rounded">
                            {anchorsHex}
                          </span>
                        )}
                        <span className="text-gray-400">{message.body_hex}</span>
                      </code>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-3">
                      <Legend color="orange" label="Magic (4B)" />
                      <Legend color="blue" label="Kind (1B)" />
                      <Legend color="purple" label="Count (1B)" />
                      {anchorsHex && (
                        <Legend
                          color="emerald"
                          label={`Anchors (${message.anchors.length * 9}B)`}
                        />
                      )}
                      <Legend color="gray" label={`Body (${bodySize}B)`} />
                    </div>
                  </div>

                  {/* Carrier-specific Script Details */}
                  {message.carrier === 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium flex items-center gap-2 text-foreground">
                          <Code className="h-4 w-4 text-destructive" />
                          OP_RETURN Script
                        </h3>
                        <CopyButton
                          onCopy={() => handleCopyField('script', opReturnScript)}
                          copied={copiedField === 'script'}
                        />
                      </div>
                      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 overflow-x-auto shadow-inner">
                        <code className="text-sm font-mono break-all leading-relaxed">
                          <span className="text-red-400 bg-red-400/20 px-1 rounded">6a</span>
                          <span className="text-yellow-400 bg-yellow-400/20 px-1 rounded">
                            {pushSize}
                          </span>
                          <span className="text-gray-400">{fullPayloadHex}</span>
                        </code>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-3">
                        <Legend color="red" label="OP_RETURN (6a)" />
                        <Legend color="yellow" label="Push Size" />
                        <Legend color="gray" label="Payload" />
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Data stored in a prunable OP_RETURN output. Nodes can discard this data
                        after validation.
                      </p>
                    </div>
                  )}

                  {message.carrier === 1 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium flex items-center gap-2 text-foreground">
                          <Code className="h-4 w-4 text-success" />
                          Inscription Envelope (Witness)
                        </h3>
                      </div>
                      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 overflow-x-auto shadow-inner">
                        <code className="text-sm font-mono break-all leading-relaxed">
                          <span className="text-red-400 bg-red-400/20 px-1 rounded">00</span>
                          <span className="text-yellow-400 bg-yellow-400/20 px-1 rounded">63</span>
                          <span className="text-cyan-400 bg-cyan-400/20 px-1 rounded">
                            06616e63686f72
                          </span>
                          <span className="text-blue-400 bg-blue-400/20 px-1 rounded">51</span>
                          <span className="text-purple-400 bg-purple-400/20 px-1 rounded">
                            [content-type]
                          </span>
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
                        Ordinals-style inscription using Taproot witness data.
                      </p>
                    </div>
                  )}

                  {/* Body Hex */}
                  {message.body_hex && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium flex items-center gap-2 text-foreground">
                          <Binary className="h-4 w-4 text-blue-500" />
                          Body Data ({bodySize} bytes)
                        </h3>
                        <CopyButton
                          onCopy={() => handleCopyField('body', message.body_hex)}
                          copied={copiedField === 'body'}
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

              {activeTab === 'carrier' &&
                message.carrier !== undefined &&
                CARRIER_INFO[message.carrier] && (
                  <div className="space-y-6">
                    {/* Carrier Header */}
                    <div
                      className={`rounded-xl overflow-hidden border ${CARRIER_INFO[message.carrier].borderColor}`}
                    >
                      <div className={`p-5 ${CARRIER_INFO[message.carrier].bgColor}`}>
                        <div className="flex items-start gap-3 mb-4">
                          <div
                            className={`w-12 h-12 rounded-xl ${CARRIER_INFO[message.carrier].color} flex items-center justify-center text-2xl text-white`}
                          >
                            {CARRIER_INFO[message.carrier].icon}
                          </div>
                          <div>
                            <h3
                              className={`text-lg font-semibold ${CARRIER_INFO[message.carrier].textColor}`}
                            >
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
                            <div
                              key={i}
                              className="bg-background/80 rounded-lg p-3 border border-border"
                            >
                              <p className="text-xs text-muted-foreground mb-1">{prop.label}</p>
                              <p
                                className={`text-sm font-medium ${CARRIER_INFO[message.carrier].textColor}`}
                              >
                                {prop.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* How This Carrier Works */}
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-4">
                      <h4 className="font-medium flex items-center gap-2 text-foreground">
                        <BookOpen className="h-4 w-4 text-primary" />
                        How {CARRIER_INFO[message.carrier].label} Works
                      </h4>
                      <CarrierExplanation carrier={message.carrier} />
                    </div>

                    {/* UTXO Model Explanation */}
                    <div className="bg-secondary/50 border border-border rounded-xl p-5">
                      <h4 className="font-medium flex items-center gap-2 mb-3 text-foreground">
                        <Layers className="h-4 w-4 text-primary" />
                        Understanding UTXOs
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Bitcoin uses an{' '}
                        <strong className="text-foreground">
                          Unspent Transaction Output (UTXO)
                        </strong>{' '}
                        model. Each transaction consumes previous outputs (inputs) and creates new
                        ones. ANCHOR messages are embedded in these outputs or the witness data.
                      </p>
                      <div className="mt-4 flex items-center justify-center gap-3 text-xs flex-wrap">
                        <div className="px-3 py-2 bg-success/10 border border-success/30 rounded font-mono">
                          UTXO (input)
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="px-4 py-2 bg-primary/10 border border-primary/30 rounded font-medium">
                          Transaction
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col gap-1">
                          <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded font-mono text-xs">
                            New UTXO
                          </div>
                          <div className="px-3 py-1 bg-destructive/10 border border-destructive/30 rounded font-mono text-xs">
                            ⚓ ANCHOR
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {activeTab === 'structure' && (
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

              {activeTab === 'anchors' && message.anchors.length > 0 && (
                <div className="space-y-4">
                  {message.anchors.map((anchor, i) => (
                    <div
                      key={i}
                      className="bg-gradient-to-br from-secondary/50 to-background border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              i === 0
                                ? 'bg-primary/10 text-primary'
                                : 'bg-secondary text-muted-foreground'
                            }`}
                          >
                            <span className="text-lg font-bold">#{i}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {i === 0 ? 'Canonical Parent' : `Reference #${i}`}
                            </p>
                            <p className="text-xs text-muted-foreground">9 bytes per anchor</p>
                          </div>
                        </div>
                        <StatusBadge
                          status={
                            anchor.is_orphan
                              ? 'orphan'
                              : anchor.is_ambiguous
                                ? 'ambiguous'
                                : 'resolved'
                          }
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-secondary/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">
                            TxID Prefix (8 bytes)
                          </p>
                          <p className="font-mono text-sm text-cyan-600 font-medium">
                            {anchor.txid_prefix}
                          </p>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Output Index</p>
                          <p className="font-mono text-sm text-pink-600 font-medium">
                            {anchor.vout}
                          </p>
                        </div>
                      </div>

                      {anchor.resolved_txid && (
                        <div className="mt-4 bg-success/10 rounded-lg p-3 border border-success/20">
                          <p className="text-xs text-success mb-1 font-medium">
                            ✓ Resolved Transaction
                          </p>
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
      </Card>

      {/* Replies */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
            <MessageSquare className="h-5 w-5 text-primary" />
            Replies ({replies?.length || 0})
          </h2>
          <Button asChild variant="accent">
            <Link href={`/compose?parent=${txid}&vout=${vout}`} className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Reply
            </Link>
          </Button>
        </div>

        {replies && replies.length > 0 ? (
          <div className="space-y-4">
            {replies.map((reply) => (
              <MessageCard key={`${reply.txid}-${reply.vout}`} message={reply} isReply />
            ))}
          </div>
        ) : (
          <Card className="text-center py-8">
            <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No replies yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to start the conversation!
            </p>
          </Card>
        )}
      </section>
    </Container>
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
          ? 'text-primary bg-background'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      }`}
    >
      {icon}
      {label}
      {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
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
  color: 'orange' | 'blue' | 'green' | 'purple';
}) {
  const colors = {
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
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
    <div className="flex items-center justify-between py-3 px-4 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors">
      <div className="flex items-center gap-3 text-muted-foreground">
        {icon}
        <span className="text-sm font-medium text-foreground">{label}</span>
        {badge && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-sm ${mono ? 'font-mono' : ''} text-right truncate max-w-[200px] md:max-w-[400px]`}
        >
          {value}
        </span>
        {copyable && onCopy && (
          <button onClick={onCopy} className="p-1.5 hover:bg-secondary rounded transition-colors">
            {copied ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
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
          ? 'bg-success/10 text-success'
          : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
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
    orange: 'bg-orange-400',
    blue: 'bg-blue-400',
    purple: 'bg-purple-400',
    emerald: 'bg-emerald-400',
    gray: 'bg-gray-400',
    red: 'bg-red-400',
    yellow: 'bg-yellow-400',
    cyan: 'bg-cyan-400',
    pink: 'bg-pink-400',
    green: 'bg-green-400',
  };

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`w-3 h-3 rounded ${colors[color]}`}></span>
      {label}
    </span>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: 'resolved' | 'orphan' | 'ambiguous' }) {
  const styles = {
    resolved: 'bg-success/10 text-success border-success/20',
    orphan: 'bg-warning/10 text-warning border-warning/20',
    ambiguous: 'bg-primary/10 text-primary border-primary/20',
  };

  const labels = {
    resolved: '✓ Resolved',
    orphan: '⚠ Orphan',
    ambiguous: '⚠ Ambiguous',
  };

  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// Explorer Link Component
function ExplorerLink({
  href,
  label,
  highlight,
}: {
  href: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${
        highlight
          ? 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20'
          : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
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
          <strong className="text-foreground">OP_RETURN</strong> is Bitcoin&apos;s native data
          carrier. It creates a provably unspendable output that can store up to 80 bytes of
          arbitrary data.
        </p>
        <ul className="list-none space-y-1 ml-2 text-sm text-muted-foreground">
          <li>
            <span className="text-success">✓</span> Prunable: Nodes can discard after validation
          </li>
          <li>
            <span className="text-success">✓</span> No UTXO bloat: Doesn&apos;t create spendable
            outputs
          </li>
          <li>
            <span className="text-success">✓</span> Standard: Relayed by all Bitcoin nodes
          </li>
        </ul>
      </>
    ),
    1: (
      <>
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Inscriptions</strong> (Ordinals-style) embed data in
          Taproot witness using an envelope pattern. The data is revealed in a script-path spend.
        </p>
        <ul className="list-none space-y-1 ml-2 text-sm text-muted-foreground">
          <li>
            <span className="text-success">✓</span> 75% fee discount (witness data)
          </li>
          <li>
            <span className="text-success">✓</span> Up to ~4MB of data per transaction
          </li>
          <li>
            <span className="text-warning">!</span> Requires commit+reveal transaction pattern
          </li>
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
          <li>
            <span className="text-destructive">⚠</span> Creates permanent UTXOs that cannot be
            pruned
          </li>
          <li>
            <span className="text-destructive">⚠</span> Increases node storage forever
          </li>
          <li>
            <span className="text-warning">!</span> Most expensive, but truly permanent
          </li>
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
          <li>
            <span className="text-success">✓</span> Part of the signature hash
          </li>
          <li>
            <span className="text-warning">!</span> Not relayed by standard nodes
          </li>
          <li>
            <span className="text-warning">!</span> Requires libre relay or direct miner
          </li>
        </ul>
      </>
    ),
    4: (
      <>
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Witness Data</strong> embeds data in a Tapscript that
          drops all pushed data and returns true, making it always spendable.
        </p>
        <ul className="list-none space-y-1 ml-2 text-sm text-muted-foreground">
          <li>
            <span className="text-success">✓</span> 75% fee discount (witness data)
          </li>
          <li>
            <span className="text-success">✓</span> Up to ~4MB of data per transaction
          </li>
          <li>
            <span className="text-success">✓</span> Prunable after validation
          </li>
        </ul>
      </>
    ),
  };

  return (
    <div className="space-y-3">
      {explanations[carrier] || (
        <p className="text-sm text-muted-foreground">Unknown carrier type.</p>
      )}
    </div>
  );
}
