/**
 * Anchor Places Marker Encoder
 * 
 * Encodes/decodes geo marker payloads for the Anchor Protocol.
 * 
 * Payload format:
 * [category: u8]           - 1 byte  (0-255 category ID)
 * [latitude: f32]          - 4 bytes (float32)
 * [longitude: f32]         - 4 bytes (float32)
 * [message_len: u8]        - 1 byte  (max 255 chars)
 * [message: utf8 bytes]    - variable
 */

export interface GeoMarkerPayload {
  category: number;
  latitude: number;
  longitude: number;
  message: string;
}

/**
 * Encode a geo marker to binary payload
 */
export function encodeGeoMarker(payload: GeoMarkerPayload): Uint8Array {
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(payload.message);
  const messageLen = Math.min(messageBytes.length, 255);
  
  // Total: 1 + 4 + 4 + 1 + messageLen = 10 + messageLen
  const buffer = new ArrayBuffer(10 + messageLen);
  const view = new DataView(buffer);
  
  let offset = 0;
  
  // Category (u8)
  view.setUint8(offset, payload.category);
  offset += 1;
  
  // Latitude (f32 big-endian)
  view.setFloat32(offset, payload.latitude, false);
  offset += 4;
  
  // Longitude (f32 big-endian)
  view.setFloat32(offset, payload.longitude, false);
  offset += 4;
  
  // Message length (u8)
  view.setUint8(offset, messageLen);
  offset += 1;
  
  // Message bytes
  const result = new Uint8Array(buffer);
  result.set(messageBytes.slice(0, messageLen), offset);
  
  return result;
}

/**
 * Decode a geo marker from binary payload
 */
export function decodeGeoMarker(data: Uint8Array): GeoMarkerPayload | null {
  if (data.length < 10) {
    return null;
  }
  
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  
  let offset = 0;
  
  // Category
  const category = view.getUint8(offset);
  offset += 1;
  
  // Latitude
  const latitude = view.getFloat32(offset, false);
  offset += 4;
  
  // Longitude
  const longitude = view.getFloat32(offset, false);
  offset += 4;
  
  // Message length
  const messageLen = view.getUint8(offset);
  offset += 1;
  
  if (data.length < 10 + messageLen) {
    return null;
  }
  
  // Message
  const decoder = new TextDecoder();
  const message = decoder.decode(data.slice(offset, offset + messageLen));
  
  // Validate coordinates
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }
  
  return { category, latitude, longitude, message };
}

/**
 * Encode geo marker to hex string
 */
export function encodeGeoMarkerHex(payload: GeoMarkerPayload): string {
  const bytes = encodeGeoMarker(payload);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Calculate the size of a geo marker payload in bytes
 */
export function calculatePayloadSize(messageLength: number): number {
  return 10 + Math.min(messageLength, 255);
}

/**
 * Check if a marker fits in OP_RETURN (80 bytes max, ~70 usable after overhead)
 */
export function fitsInOpReturn(messageLength: number): boolean {
  // Protocol overhead: 4 (magic) + 1 (kind) + 1 (anchor_count) = 6 bytes
  // Marker payload overhead: 10 bytes
  // Total overhead: 16 bytes
  // Available for message: 80 - 16 = 64 bytes
  return calculatePayloadSize(messageLength) + 6 <= 80;
}

/**
 * Get the maximum message length that fits in OP_RETURN
 */
export function maxOpReturnMessageLength(): number {
  return 64; // 80 - 6 (protocol) - 10 (marker overhead)
}

