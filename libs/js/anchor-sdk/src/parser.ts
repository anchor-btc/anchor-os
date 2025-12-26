/**
 * ANCHOR Protocol Parser
 *
 * Functions for parsing ANCHOR messages from binary payloads.
 */

import {
  ANCHOR_MAGIC,
  TXID_PREFIX_SIZE,
  ANCHOR_SIZE,
  MIN_PAYLOAD_SIZE,
  AnchorKind,
  AnchorError,
  AnchorErrorCode,
  type Anchor,
  type AnchorMessage,
  type TextMessage,
} from './types.js';
import { bytesToHex } from './encoder.js';

/**
 * Check if bytes match ANCHOR magic
 */
export function isAnchorPayload(data: Uint8Array): boolean {
  if (data.length < MIN_PAYLOAD_SIZE) {
    return false;
  }
  return (
    data[0] === ANCHOR_MAGIC[0] &&
    data[1] === ANCHOR_MAGIC[1] &&
    data[2] === ANCHOR_MAGIC[2] &&
    data[3] === ANCHOR_MAGIC[3]
  );
}

/**
 * Parse an ANCHOR payload from binary data
 */
export function parseAnchorPayload(data: Uint8Array): AnchorMessage {
  if (data.length < MIN_PAYLOAD_SIZE) {
    throw new AnchorError(
      AnchorErrorCode.PayloadTooShort,
      `Payload too short: ${data.length} bytes (min ${MIN_PAYLOAD_SIZE})`
    );
  }

  // Check magic
  if (!isAnchorPayload(data)) {
    throw new AnchorError(
      AnchorErrorCode.InvalidMagic,
      `Invalid magic bytes: expected ${bytesToHex(ANCHOR_MAGIC)}, got ${bytesToHex(data.slice(0, 4))}`
    );
  }

  let offset = 4;

  // Kind
  const kindByte = data[offset++];
  const kind = kindByte as AnchorKind;

  // Anchor count
  const anchorCount = data[offset++];

  // Check we have enough bytes for anchors
  const expectedAnchorBytes = anchorCount * ANCHOR_SIZE;
  if (data.length < offset + expectedAnchorBytes) {
    throw new AnchorError(
      AnchorErrorCode.TruncatedAnchors,
      `Truncated anchors: expected ${expectedAnchorBytes} bytes, have ${data.length - offset}`
    );
  }

  // Parse anchors
  const anchors: Anchor[] = [];
  for (let i = 0; i < anchorCount; i++) {
    const txidPrefix = data.slice(offset, offset + TXID_PREFIX_SIZE);
    offset += TXID_PREFIX_SIZE;
    const vout = data[offset++];
    anchors.push({
      txidPrefix: new Uint8Array(txidPrefix),
      vout,
    });
  }

  // Body is the rest
  const body = new Uint8Array(data.slice(offset));

  return { kind, anchors, body };
}

/**
 * Parse as text message (decodes body as UTF-8)
 */
export function parseTextMessage(data: Uint8Array): TextMessage {
  const message = parseAnchorPayload(data);
  const text = new TextDecoder().decode(message.body);
  return {
    ...message,
    kind: AnchorKind.Text,
    text,
  };
}

/**
 * Get the body as text (if kind is Text)
 */
export function getMessageText(message: AnchorMessage): string | null {
  if (message.kind !== AnchorKind.Text) {
    return null;
  }
  try {
    return new TextDecoder().decode(message.body);
  } catch {
    return null;
  }
}

/**
 * Check if a txid matches an anchor prefix
 */
export function anchorMatchesTxid(anchor: Anchor, txid: string): boolean {
  const txidBytes = new Uint8Array(32);
  const hex = txid.startsWith('0x') ? txid.slice(2) : txid;

  for (let i = 0; i < 32; i++) {
    txidBytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  // Reverse (Bitcoin txids are displayed reversed)
  const reversed = txidBytes.slice().reverse();

  // Compare first 8 bytes
  for (let i = 0; i < TXID_PREFIX_SIZE; i++) {
    if (reversed[i] !== anchor.txidPrefix[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Get anchor as a display string (prefix:vout)
 */
export function anchorToString(anchor: Anchor): string {
  return `${bytesToHex(anchor.txidPrefix)}:${anchor.vout}`;
}

/**
 * Check if message is a root (no anchors)
 */
export function isRootMessage(message: AnchorMessage): boolean {
  return message.anchors.length === 0;
}

/**
 * Get the canonical parent (first anchor)
 */
export function getCanonicalParent(message: AnchorMessage): Anchor | null {
  return message.anchors[0] ?? null;
}

/**
 * Parse OP_RETURN script data
 * Handles the OP_RETURN prefix and extracts the payload
 */
export function parseOpReturnScript(script: Uint8Array): Uint8Array | null {
  // OP_RETURN = 0x6a
  if (script.length < 2 || script[0] !== 0x6a) {
    return null;
  }

  // Next byte(s) indicate push size
  let offset = 1;
  let dataLength: number;

  if (script[offset] <= 0x4b) {
    // Direct push (1-75 bytes)
    dataLength = script[offset++];
  } else if (script[offset] === 0x4c) {
    // OP_PUSHDATA1
    dataLength = script[++offset];
    offset++;
  } else if (script[offset] === 0x4d) {
    // OP_PUSHDATA2
    dataLength = script[offset + 1] | (script[offset + 2] << 8);
    offset += 3;
  } else {
    return null;
  }

  if (script.length < offset + dataLength) {
    return null;
  }

  return script.slice(offset, offset + dataLength);
}

/**
 * Try to parse ANCHOR message from an OP_RETURN script
 */
export function parseFromOpReturn(script: Uint8Array): AnchorMessage | null {
  const data = parseOpReturnScript(script);
  if (!data || !isAnchorPayload(data)) {
    return null;
  }
  try {
    return parseAnchorPayload(data);
  } catch {
    return null;
  }
}
