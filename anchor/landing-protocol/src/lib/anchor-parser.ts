// Anchor Protocol message parser

export const ANCHOR_MAGIC = [0xa1, 0x1c, 0x00, 0x01];

export interface ParsedMessage {
  isValid: boolean;
  magic: { bytes: number[]; hex: string; valid: boolean };
  kind: { value: number; name: string; hex: string } | null;
  anchorCount: { value: number; hex: string } | null;
  anchors: { txidPrefix: string; vout: number; hex: string }[];
  body: { bytes: number[]; hex: string; text: string } | null;
  error?: string;
}

export const KIND_NAMES: Record<number, string> = {
  0: "Generic",
  1: "Text",
  2: "State",
  3: "Image",
  4: "DNS",
  5: "Geomarker",
  6: "Token",
  7: "Vote",
  8: "Proof",
};

export function hexToBytes(hex: string): number[] {
  const cleanHex = hex.replace(/\s/g, "").toLowerCase();
  const bytes: number[] = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    const byte = parseInt(cleanHex.substr(i, 2), 16);
    if (!isNaN(byte)) {
      bytes.push(byte);
    }
  }
  return bytes;
}

export function bytesToHex(bytes: number[]): string {
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function parseAnchorMessage(hex: string): ParsedMessage {
  const bytes = hexToBytes(hex);

  // Check minimum length
  if (bytes.length < 6) {
    return {
      isValid: false,
      magic: { bytes: bytes.slice(0, 4), hex: bytesToHex(bytes.slice(0, 4)), valid: false },
      kind: null,
      anchorCount: null,
      anchors: [],
      body: null,
      error: "Message too short (minimum 6 bytes)",
    };
  }

  // Check magic bytes
  const magicBytes = bytes.slice(0, 4);
  const magicValid = magicBytes.every((b, i) => b === ANCHOR_MAGIC[i]);

  if (!magicValid) {
    return {
      isValid: false,
      magic: { bytes: magicBytes, hex: bytesToHex(magicBytes), valid: false },
      kind: null,
      anchorCount: null,
      anchors: [],
      body: null,
      error: "Invalid magic bytes (expected A11C0001)",
    };
  }

  // Parse kind
  const kindValue = bytes[4];
  const kindName = KIND_NAMES[kindValue] || `Custom (${kindValue})`;

  // Parse anchor count
  const anchorCount = bytes[5];

  // Check if we have enough bytes for anchors
  const expectedMinLength = 6 + anchorCount * 9;
  if (bytes.length < expectedMinLength) {
    return {
      isValid: false,
      magic: { bytes: magicBytes, hex: bytesToHex(magicBytes), valid: true },
      kind: { value: kindValue, name: kindName, hex: bytesToHex([kindValue]) },
      anchorCount: { value: anchorCount, hex: bytesToHex([anchorCount]) },
      anchors: [],
      body: null,
      error: `Not enough bytes for ${anchorCount} anchors`,
    };
  }

  // Parse anchors
  const anchors: { txidPrefix: string; vout: number; hex: string }[] = [];
  let offset = 6;
  for (let i = 0; i < anchorCount; i++) {
    const anchorBytes = bytes.slice(offset, offset + 9);
    const txidPrefix = bytesToHex(anchorBytes.slice(0, 8));
    const vout = anchorBytes[8];
    anchors.push({
      txidPrefix,
      vout,
      hex: bytesToHex(anchorBytes),
    });
    offset += 9;
  }

  // Parse body
  const bodyBytes = bytes.slice(offset);
  let bodyText = "";
  try {
    bodyText = new TextDecoder("utf-8", { fatal: false }).decode(
      new Uint8Array(bodyBytes)
    );
  } catch {
    bodyText = "[Binary data]";
  }

  return {
    isValid: true,
    magic: { bytes: magicBytes, hex: bytesToHex(magicBytes), valid: true },
    kind: { value: kindValue, name: kindName, hex: bytesToHex([kindValue]) },
    anchorCount: { value: anchorCount, hex: bytesToHex([anchorCount]) },
    anchors,
    body: { bytes: bodyBytes, hex: bytesToHex(bodyBytes), text: bodyText },
  };
}

// Example message: "Hello!" with no anchors
export const EXAMPLE_HEX = "A11C00010100" + bytesToHex(
  Array.from(new TextEncoder().encode("Hello, Bitcoin! ⚡"))
);

export function createTextMessage(text: string, anchors: { txidPrefix: string; vout: number }[] = []): string {
  const textBytes = Array.from(new TextEncoder().encode(text));
  const anchorBytes: number[] = [];
  
  for (const anchor of anchors) {
    const txidBytes = hexToBytes(anchor.txidPrefix);
    anchorBytes.push(...txidBytes.slice(0, 8), anchor.vout);
  }
  
  const message = [
    ...ANCHOR_MAGIC,
    1, // Kind: Text
    anchors.length,
    ...anchorBytes,
    ...textBytes,
  ];
  
  return bytesToHex(message);
}

