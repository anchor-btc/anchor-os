/**
 * Pixel Encoder for Anchor Protocol
 *
 * Encodes pixel data into Anchor protocol messages.
 * Uses the State kind (2) for pixel updates.
 */

import type { Pixel } from './api';

// Anchor protocol constants
const ANCHOR_MAGIC = new Uint8Array([0xa1, 0x1c, 0x00, 0x01]);
const ANCHOR_KIND_STATE = 2;
// Bitcoin Core v30+ supports up to 100KB OP_RETURN
// (100000 - 14 header) / 7 bytes per pixel ≈ 14,283 pixels max
const MAX_PIXELS_PER_TX = 14000;

/**
 * Encode a single pixel to bytes
 * Format: [x: u16][y: u16][r: u8][g: u8][b: u8] = 7 bytes
 */
export function encodePixel(pixel: Pixel): Uint8Array {
  const buffer = new ArrayBuffer(7);
  const view = new DataView(buffer);
  view.setUint16(0, pixel.x, false); // big-endian
  view.setUint16(2, pixel.y, false);
  view.setUint8(4, pixel.r);
  view.setUint8(5, pixel.g);
  view.setUint8(6, pixel.b);
  return new Uint8Array(buffer);
}

/**
 * Decode a pixel from bytes
 */
export function decodePixel(bytes: Uint8Array, offset = 0): Pixel {
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset);
  return {
    x: view.getUint16(0, false),
    y: view.getUint16(2, false),
    r: view.getUint8(4),
    g: view.getUint8(5),
    b: view.getUint8(6),
  };
}

/**
 * Encode multiple pixels to a payload body
 * Format: [num_pixels: u32][pixels...]
 */
export function encodePixelPayload(pixels: Pixel[]): Uint8Array {
  if (pixels.length === 0) {
    throw new Error('No pixels to encode');
  }
  if (pixels.length > MAX_PIXELS_PER_TX) {
    throw new Error(`Too many pixels: ${pixels.length} (max ${MAX_PIXELS_PER_TX})`);
  }

  const buffer = new ArrayBuffer(4 + pixels.length * 7);
  const view = new DataView(buffer);

  // Number of pixels (big-endian u32)
  view.setUint32(0, pixels.length, false);

  // Encode each pixel
  const result = new Uint8Array(buffer);
  let offset = 4;
  for (const pixel of pixels) {
    result.set(encodePixel(pixel), offset);
    offset += 7;
  }

  return result;
}

/**
 * Decode pixels from a payload body
 */
export function decodePixelPayload(payload: Uint8Array): Pixel[] {
  if (payload.length < 4) {
    throw new Error('Payload too short');
  }

  const view = new DataView(payload.buffer, payload.byteOffset);
  const numPixels = view.getUint32(0, false);

  const expectedLength = 4 + numPixels * 7;
  if (payload.length < expectedLength) {
    throw new Error(`Payload too short: expected ${expectedLength}, got ${payload.length}`);
  }

  const pixels: Pixel[] = [];
  for (let i = 0; i < numPixels; i++) {
    pixels.push(decodePixel(payload, 4 + i * 7));
  }

  return pixels;
}

/**
 * Create a full Anchor protocol message for pixels
 * Format: [magic: 4][kind: 1][anchor_count: 1][body...]
 */
export function createAnchorPixelMessage(pixels: Pixel[]): Uint8Array {
  const body = encodePixelPayload(pixels);
  const message = new Uint8Array(4 + 1 + 1 + body.length);

  // Magic bytes
  message.set(ANCHOR_MAGIC, 0);
  // Kind (State = 2)
  message[4] = ANCHOR_KIND_STATE;
  // Anchor count (0 for root message)
  message[5] = 0;
  // Body
  message.set(body, 6);

  return message;
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
 * Convert hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Validate pixel coordinates
 */
export function validatePixel(pixel: Pixel, canvasWidth = 4580, canvasHeight = 4580): boolean {
  return (
    pixel.x >= 0 &&
    pixel.x < canvasWidth &&
    pixel.y >= 0 &&
    pixel.y < canvasHeight &&
    pixel.r >= 0 &&
    pixel.r <= 255 &&
    pixel.g >= 0 &&
    pixel.g <= 255 &&
    pixel.b >= 0 &&
    pixel.b <= 255
  );
}

/**
 * Split pixels into batches for multiple transactions
 */
export function batchPixels(pixels: Pixel[]): Pixel[][] {
  const batches: Pixel[][] = [];
  for (let i = 0; i < pixels.length; i += MAX_PIXELS_PER_TX) {
    batches.push(pixels.slice(i, i + MAX_PIXELS_PER_TX));
  }
  return batches;
}

/**
 * Calculate fee for pixel transaction
 * Rough estimate based on typical transaction size
 */
export function estimateFee(pixelCount: number, feeRate = 1): number {
  // Base transaction size + OP_RETURN output
  const baseTxSize = 150; // vbytes
  const pixelDataSize = 4 + pixelCount * 7; // payload
  const opReturnOverhead = 10; // OP_RETURN script overhead

  const totalSize = baseTxSize + opReturnOverhead + pixelDataSize;
  return totalSize * feeRate; // satoshis
}
