/**
 * Varint (LEB128) Encoding/Decoding
 *
 * Compact variable-length integer encoding used by Bitcoin protocols like Runes.
 * - Values 0-127: 1 byte
 * - Values 128-16383: 2 bytes
 * - Values 16384-2097151: 3 bytes
 * - And so on...
 */

/**
 * Encode a bigint to LEB128 varint
 */
export function encodeVarint(n: bigint): Uint8Array {
  if (n < 0n) {
    throw new Error('Cannot encode negative numbers as varint');
  }

  const bytes: number[] = [];

  while (n >= 0x80n) {
    bytes.push(Number(n & 0x7fn) | 0x80);
    n >>= 7n;
  }
  bytes.push(Number(n));

  return new Uint8Array(bytes);
}

/**
 * Decode a LEB128 varint from bytes
 * @returns [value, bytesRead]
 */
export function decodeVarint(bytes: Uint8Array, offset: number = 0): [bigint, number] {
  let result = 0n;
  let shift = 0n;
  let bytesRead = 0;

  while (offset + bytesRead < bytes.length) {
    const byte = bytes[offset + bytesRead];
    bytesRead++;

    result |= BigInt(byte & 0x7f) << shift;

    if ((byte & 0x80) === 0) {
      return [result, bytesRead];
    }

    shift += 7n;

    // Prevent infinite loops on malformed data
    if (shift > 128n) {
      throw new Error('Varint too long');
    }
  }

  throw new Error('Unexpected end of varint data');
}

/**
 * Encode a number to LEB128 varint
 */
export function encodeVarintNumber(n: number): Uint8Array {
  return encodeVarint(BigInt(n));
}

/**
 * Calculate the byte length needed for a varint
 */
export function varintLength(n: bigint): number {
  if (n < 0n) return 0;
  if (n < 0x80n) return 1;
  if (n < 0x4000n) return 2;
  if (n < 0x200000n) return 3;
  if (n < 0x10000000n) return 4;
  if (n < 0x800000000n) return 5;
  if (n < 0x40000000000n) return 6;
  if (n < 0x2000000000000n) return 7;
  if (n < 0x100000000000000n) return 8;
  if (n < 0x8000000000000000n) return 9;
  return 10;
}

/**
 * Encode multiple varints and concatenate them
 */
export function encodeVarints(...values: bigint[]): Uint8Array {
  const encoded = values.map(encodeVarint);
  const totalLength = encoded.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);

  let offset = 0;
  for (const arr of encoded) {
    result.set(arr, offset);
    offset += arr.length;
  }

  return result;
}

/**
 * Decode multiple varints from bytes
 */
export function decodeVarints(
  bytes: Uint8Array,
  count: number,
  offset: number = 0
): [bigint[], number] {
  const values: bigint[] = [];
  let totalBytesRead = 0;

  for (let i = 0; i < count; i++) {
    const [value, bytesRead] = decodeVarint(bytes, offset + totalBytesRead);
    values.push(value);
    totalBytesRead += bytesRead;
  }

  return [values, totalBytesRead];
}
