/**
 * Anchor Domains Encoder/Decoder
 *
 * Encodes/decodes DNS records for the Anchor Protocol.
 * Uses AnchorKind::Custom(10) for DNS operations.
 * Supports TLDs: .btc, .sat, .anchor, .anc
 *
 * Payload format:
 * [operation: u8][name_len: u8][name: utf8][records...]
 *
 * Record format:
 * [type: u8][ttl: u16][data_len: u8][data: bytes]
 */

// Anchor protocol constants
const ANCHOR_MAGIC = new Uint8Array([0xa1, 0x1c, 0x00, 0x01]);
const ANCHOR_KIND_DNS = 10; // Custom kind for DNS

// Supported TLDs for Anchor Domains
export const SUPPORTED_TLDS = [".btc", ".sat", ".anchor", ".anc", ".bit"] as const;
export type SupportedTLD = (typeof SUPPORTED_TLDS)[number];

/**
 * DNS Operations
 */
export enum DnsOperation {
  REGISTER = 0x01,
  UPDATE = 0x02,
  TRANSFER = 0x03,
}

/**
 * DNS Record Types
 */
export enum RecordType {
  A = 1, // IPv4 address (4 bytes)
  AAAA = 2, // IPv6 address (16 bytes)
  CNAME = 3, // Canonical name (domain string)
  TXT = 4, // Text record (string)
  MX = 5, // Mail exchange (priority u16 + domain)
  NS = 6, // Name server (domain string)
  SRV = 7, // Service record (priority u16, weight u16, port u16, target)
}

/**
 * Get human-readable record type name
 */
export function getRecordTypeName(type: RecordType): string {
  switch (type) {
    case RecordType.A:
      return "A";
    case RecordType.AAAA:
      return "AAAA";
    case RecordType.CNAME:
      return "CNAME";
    case RecordType.TXT:
      return "TXT";
    case RecordType.MX:
      return "MX";
    case RecordType.NS:
      return "NS";
    case RecordType.SRV:
      return "SRV";
    default:
      return "UNKNOWN";
  }
}

/**
 * DNS Record interface
 */
export interface DnsRecord {
  type: RecordType;
  ttl: number;
  value: string;
  priority?: number; // For MX, SRV
  weight?: number; // For SRV
  port?: number; // For SRV
}

/**
 * DNS Payload interface
 */
export interface DnsPayload {
  operation: DnsOperation;
  name: string;
  records: DnsRecord[];
}

/**
 * Parse an IPv4 address string to bytes
 */
export function ipv4ToBytes(ip: string): Uint8Array {
  const parts = ip.split(".");
  if (parts.length !== 4) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }
  const bytes = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    const num = parseInt(parts[i], 10);
    if (isNaN(num) || num < 0 || num > 255) {
      throw new Error(`Invalid IPv4 octet: ${parts[i]}`);
    }
    bytes[i] = num;
  }
  return bytes;
}

/**
 * Convert bytes to IPv4 address string
 */
export function bytesToIpv4(bytes: Uint8Array): string {
  if (bytes.length !== 4) {
    throw new Error(`Invalid IPv4 bytes length: ${bytes.length}`);
  }
  return Array.from(bytes).join(".");
}

/**
 * Parse an IPv6 address string to bytes
 */
export function ipv6ToBytes(ip: string): Uint8Array {
  // Handle :: expansion
  const parts = ip.split("::");
  let groups: string[] = [];

  if (parts.length === 1) {
    groups = parts[0].split(":");
  } else if (parts.length === 2) {
    const left = parts[0] ? parts[0].split(":") : [];
    const right = parts[1] ? parts[1].split(":") : [];
    const missing = 8 - left.length - right.length;
    groups = [...left, ...Array(missing).fill("0"), ...right];
  } else {
    throw new Error(`Invalid IPv6 address: ${ip}`);
  }

  if (groups.length !== 8) {
    throw new Error(`Invalid IPv6 address: ${ip}`);
  }

  const bytes = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    const num = parseInt(groups[i] || "0", 16);
    if (isNaN(num) || num < 0 || num > 0xffff) {
      throw new Error(`Invalid IPv6 group: ${groups[i]}`);
    }
    bytes[i * 2] = (num >> 8) & 0xff;
    bytes[i * 2 + 1] = num & 0xff;
  }
  return bytes;
}

/**
 * Convert bytes to IPv6 address string
 */
export function bytesToIpv6(bytes: Uint8Array): string {
  if (bytes.length !== 16) {
    throw new Error(`Invalid IPv6 bytes length: ${bytes.length}`);
  }
  const groups: string[] = [];
  for (let i = 0; i < 16; i += 2) {
    const num = (bytes[i] << 8) | bytes[i + 1];
    groups.push(num.toString(16));
  }
  return groups.join(":");
}

/**
 * Encode a single DNS record to bytes
 */
export function encodeRecord(record: DnsRecord): Uint8Array {
  const encoder = new TextEncoder();
  let data: Uint8Array;

  switch (record.type) {
    case RecordType.A:
      data = ipv4ToBytes(record.value);
      break;
    case RecordType.AAAA:
      data = ipv6ToBytes(record.value);
      break;
    case RecordType.CNAME:
    case RecordType.NS:
    case RecordType.TXT:
      data = encoder.encode(record.value);
      break;
    case RecordType.MX: {
      const priority = record.priority ?? 10;
      const domain = encoder.encode(record.value);
      data = new Uint8Array(2 + domain.length);
      const view = new DataView(data.buffer);
      view.setUint16(0, priority, false); // big-endian
      data.set(domain, 2);
      break;
    }
    case RecordType.SRV: {
      const priority = record.priority ?? 0;
      const weight = record.weight ?? 0;
      const port = record.port ?? 0;
      const target = encoder.encode(record.value);
      data = new Uint8Array(6 + target.length);
      const view = new DataView(data.buffer);
      view.setUint16(0, priority, false);
      view.setUint16(2, weight, false);
      view.setUint16(4, port, false);
      data.set(target, 6);
      break;
    }
    default:
      throw new Error(`Unknown record type: ${record.type}`);
  }

  // Record format: [type: u8][ttl: u16][data_len: u8][data]
  const result = new Uint8Array(4 + data.length);
  const view = new DataView(result.buffer);
  result[0] = record.type;
  view.setUint16(1, record.ttl, false); // big-endian
  result[3] = data.length;
  result.set(data, 4);

  return result;
}

/**
 * Decode a single DNS record from bytes
 */
export function decodeRecord(
  bytes: Uint8Array,
  offset: number
): { record: DnsRecord; bytesRead: number } | null {
  if (bytes.length < offset + 4) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset + offset);
  const type = bytes[offset] as RecordType;
  const ttl = view.getUint16(1, false);
  const dataLen = bytes[offset + 3];

  if (bytes.length < offset + 4 + dataLen) {
    return null;
  }

  const data = bytes.slice(offset + 4, offset + 4 + dataLen);
  const decoder = new TextDecoder();
  let value: string;
  let priority: number | undefined;
  let weight: number | undefined;
  let port: number | undefined;

  switch (type) {
    case RecordType.A:
      value = bytesToIpv4(data);
      break;
    case RecordType.AAAA:
      value = bytesToIpv6(data);
      break;
    case RecordType.CNAME:
    case RecordType.NS:
    case RecordType.TXT:
      value = decoder.decode(data);
      break;
    case RecordType.MX: {
      const dataView = new DataView(data.buffer, data.byteOffset);
      priority = dataView.getUint16(0, false);
      value = decoder.decode(data.slice(2));
      break;
    }
    case RecordType.SRV: {
      const dataView = new DataView(data.buffer, data.byteOffset);
      priority = dataView.getUint16(0, false);
      weight = dataView.getUint16(2, false);
      port = dataView.getUint16(4, false);
      value = decoder.decode(data.slice(6));
      break;
    }
    default:
      value = bytesToHex(data);
  }

  return {
    record: { type, ttl, value, priority, weight, port },
    bytesRead: 4 + dataLen,
  };
}

/**
 * Encode a DNS payload to bytes
 */
export function encodeDnsPayload(payload: DnsPayload): Uint8Array {
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(payload.name);

  if (nameBytes.length > 255) {
    throw new Error(`Domain name too long: ${nameBytes.length} bytes (max 255)`);
  }

  // Encode all records
  const recordBuffers: Uint8Array[] = payload.records.map(encodeRecord);
  const totalRecordBytes = recordBuffers.reduce((sum, buf) => sum + buf.length, 0);

  // Total size: operation (1) + name_len (1) + name + records
  const totalSize = 2 + nameBytes.length + totalRecordBytes;
  const result = new Uint8Array(totalSize);

  let offset = 0;
  result[offset++] = payload.operation;
  result[offset++] = nameBytes.length;
  result.set(nameBytes, offset);
  offset += nameBytes.length;

  for (const recordBuf of recordBuffers) {
    result.set(recordBuf, offset);
    offset += recordBuf.length;
  }

  return result;
}

/**
 * Decode a DNS payload from bytes
 */
export function decodeDnsPayload(bytes: Uint8Array): DnsPayload | null {
  if (bytes.length < 3) {
    return null;
  }

  const operation = bytes[0] as DnsOperation;
  const nameLen = bytes[1];

  if (bytes.length < 2 + nameLen) {
    return null;
  }

  const decoder = new TextDecoder();
  const name = decoder.decode(bytes.slice(2, 2 + nameLen));

  // Parse records
  const records: DnsRecord[] = [];
  let offset = 2 + nameLen;

  while (offset < bytes.length) {
    const result = decodeRecord(bytes, offset);
    if (!result) break;
    records.push(result.record);
    offset += result.bytesRead;
  }

  return { operation, name, records };
}

/**
 * Create a full Anchor protocol message for DNS
 */
export function createAnchorDnsMessage(
  payload: DnsPayload,
  anchors: Array<{ txidPrefix: Uint8Array; vout: number }> = []
): Uint8Array {
  const body = encodeDnsPayload(payload);

  // Calculate total size
  const anchorSize = anchors.length * 9; // 8 bytes prefix + 1 byte vout
  const totalSize = 4 + 1 + 1 + anchorSize + body.length;
  const message = new Uint8Array(totalSize);

  let offset = 0;

  // Magic bytes
  message.set(ANCHOR_MAGIC, offset);
  offset += 4;

  // Kind (DNS = 10)
  message[offset++] = ANCHOR_KIND_DNS;

  // Anchor count
  message[offset++] = anchors.length;

  // Anchors
  for (const anchor of anchors) {
    message.set(anchor.txidPrefix, offset);
    offset += 8;
    message[offset++] = anchor.vout;
  }

  // Body
  message.set(body, offset);

  return message;
}

/**
 * Convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Get the TLD from a domain name if it's supported
 */
export function getTld(name: string): SupportedTLD | null {
  const lowerName = name.toLowerCase();
  for (const tld of SUPPORTED_TLDS) {
    if (lowerName.endsWith(tld)) {
      return tld;
    }
  }
  return null;
}

/**
 * Validate an Anchor Domains domain name (supports .btc, .sat, .anchor, .anc)
 */
export function isValidDomainName(name: string): boolean {
  // Must end with a supported TLD
  const tld = getTld(name);
  if (!tld) {
    return false;
  }

  // Get the name part (without TLD)
  const namePart = name.slice(0, -tld.length);

  // Must be at least 1 character
  if (namePart.length === 0) {
    return false;
  }

  // Max 255 bytes total
  if (new TextEncoder().encode(name).length > 255) {
    return false;
  }

  // Only allow alphanumeric, hyphens, and dots (for subdomains)
  // Cannot start or end with hyphen
  const validPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;
  return validPattern.test(namePart);
}

/**
 * Check if a string is a valid txid prefix (16 hex chars)
 */
export function isTxidPrefix(value: string): boolean {
  return /^[a-f0-9]{16}$/i.test(value);
}

/**
 * Calculate payload size for a domain registration
 */
export function calculatePayloadSize(name: string, records: DnsRecord[]): number {
  const nameBytes = new TextEncoder().encode(name).length;
  const recordsSize = records.reduce((sum, record) => {
    return sum + 4 + encodeRecord(record).length - 4; // 4 bytes header + data
  }, 0);
  return 2 + nameBytes + recordsSize;
}

/**
 * Check if payload fits in OP_RETURN (80 bytes max)
 */
export function fitsInOpReturn(name: string, records: DnsRecord[]): boolean {
  // Protocol overhead: 4 (magic) + 1 (kind) + 1 (anchor_count) = 6 bytes
  const payloadSize = calculatePayloadSize(name, records);
  return payloadSize + 6 <= 80;
}

/**
 * Estimate fee for DNS transaction
 */
export function estimateFee(name: string, records: DnsRecord[], feeRate = 1): number {
  const baseTxSize = 150; // vbytes
  const payloadSize = calculatePayloadSize(name, records);
  const opReturnOverhead = 10;
  const totalSize = baseTxSize + opReturnOverhead + payloadSize;
  return totalSize * feeRate;
}
