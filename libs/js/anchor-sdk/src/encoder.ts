/**
 * ANCHOR Protocol Encoder
 *
 * Functions for encoding ANCHOR messages into binary payloads.
 */

import {
  ANCHOR_MAGIC,
  TXID_PREFIX_SIZE,
  MAX_OP_RETURN_SIZE,
  AnchorKind,
  AnchorError,
  AnchorErrorCode,
  type Anchor,
  type AnchorMessage,
  type CreateMessageOptions,
} from './types.js';

/**
 * Convert a hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Extract the 8-byte prefix from a txid
 *
 * Note: Bitcoin txids are displayed in reverse byte order,
 * so we reverse before taking the prefix.
 */
export function txidToPrefix(txid: string): Uint8Array {
  const txidBytes = hexToBytes(txid);
  if (txidBytes.length !== 32) {
    throw new AnchorError(
      AnchorErrorCode.InvalidTxid,
      `Invalid txid length: expected 32 bytes, got ${txidBytes.length}`
    );
  }
  // Reverse and take first 8 bytes
  const reversed = txidBytes.slice().reverse();
  return reversed.slice(0, TXID_PREFIX_SIZE);
}

/**
 * Create an Anchor from a txid and vout
 */
export function createAnchor(txid: string, vout: number): Anchor {
  if (vout < 0 || vout > 255) {
    throw new Error('vout must be between 0 and 255');
  }
  return {
    txidPrefix: txidToPrefix(txid),
    vout,
  };
}

/**
 * Encode an ANCHOR message to binary payload
 */
export function encodeAnchorPayload(message: AnchorMessage): Uint8Array {
  const payloadSize =
    4 + // magic
    1 + // kind
    1 + // anchor count
    message.anchors.length * 9 + // anchors
    message.body.length; // body

  if (payloadSize > MAX_OP_RETURN_SIZE) {
    throw new AnchorError(
      AnchorErrorCode.MessageTooLarge,
      `Payload too large: ${payloadSize} bytes (max ${MAX_OP_RETURN_SIZE})`
    );
  }

  const payload = new Uint8Array(payloadSize);
  let offset = 0;

  // Magic bytes
  payload.set(ANCHOR_MAGIC, offset);
  offset += 4;

  // Kind
  payload[offset++] = message.kind;

  // Anchor count
  payload[offset++] = message.anchors.length;

  // Anchors
  for (const anchor of message.anchors) {
    payload.set(anchor.txidPrefix, offset);
    offset += 8;
    payload[offset++] = anchor.vout;
  }

  // Body
  payload.set(message.body, offset);

  return payload;
}

/**
 * Create an ANCHOR message from options
 */
export function createMessage(options: CreateMessageOptions): AnchorMessage {
  const kind = options.kind ?? AnchorKind.Text;

  let body: Uint8Array;
  if (options.bodyBytes) {
    body = options.bodyBytes;
  } else if (options.body) {
    body = new TextEncoder().encode(options.body);
  } else {
    body = new Uint8Array(0);
  }

  const anchors: Anchor[] = (options.anchors ?? []).map((a) => createAnchor(a.txid, a.vout));

  return { kind, anchors, body };
}

/**
 * Encode a text message
 */
export function encodeTextMessage(
  text: string,
  anchors?: Array<{ txid: string; vout: number }>
): Uint8Array {
  return encodeAnchorPayload(
    createMessage({
      kind: AnchorKind.Text,
      body: text,
      anchors,
    })
  );
}

/**
 * Encode a root message (no anchors)
 */
export function encodeRootMessage(text: string, kind: AnchorKind = AnchorKind.Text): Uint8Array {
  return encodeAnchorPayload(
    createMessage({
      kind,
      body: text,
      anchors: [],
    })
  );
}

/**
 * Encode a reply message
 */
export function encodeReplyMessage(
  text: string,
  parentTxid: string,
  parentVout: number = 0
): Uint8Array {
  return encodeAnchorPayload(
    createMessage({
      kind: AnchorKind.Text,
      body: text,
      anchors: [{ txid: parentTxid, vout: parentVout }],
    })
  );
}

/**
 * Calculate the maximum body size given anchor count
 */
export function maxBodySize(anchorCount: number): number {
  const overhead = 4 + 1 + 1 + anchorCount * 9;
  return MAX_OP_RETURN_SIZE - overhead;
}
