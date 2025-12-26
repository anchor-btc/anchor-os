/**
 * Anchor Tokens Protocol Encoder/Decoder
 *
 * Encodes/decodes token operations for the Anchor Protocol.
 * Uses AnchorKind::Custom(20) for token operations.
 *
 * Operations:
 * - 0x01: DEPLOY - Create a new token
 * - 0x02: MINT - Mint new tokens
 * - 0x03: TRANSFER - Transfer tokens to outputs
 * - 0x04: BURN - Destroy tokens
 * - 0x05: SPLIT - Split tokens across outputs
 */

import { encodeVarint, decodeVarint, varintLength } from './varint';

// Anchor protocol constants
const ANCHOR_MAGIC = new Uint8Array([0xa1, 0x1c, 0x00, 0x01]);
const ANCHOR_KIND_TOKEN = 20; // Custom kind for tokens

/**
 * Token Operations
 */
export enum TokenOperation {
  DEPLOY = 0x01,
  MINT = 0x02,
  TRANSFER = 0x03,
  BURN = 0x04,
  SPLIT = 0x05,
}

/**
 * Deploy flags
 */
export enum DeployFlags {
  NONE = 0x00,
  OPEN_MINT = 0x01, // Anyone can mint
  FIXED_SUPPLY = 0x02, // No minting after deploy
  BURNABLE = 0x04, // Tokens can be burned
}

/**
 * Token allocation for transfers
 */
export interface TokenAllocation {
  outputIndex: number;
  amount: bigint;
}

/**
 * Deploy payload data
 */
export interface DeployPayload {
  ticker: string;
  decimals: number;
  maxSupply: bigint;
  mintLimit?: bigint;
  flags: number;
}

/**
 * Mint payload data
 */
export interface MintPayload {
  tokenId: bigint;
  amount: bigint;
  outputIndex: number;
}

/**
 * Transfer/Split payload data
 */
export interface TransferPayload {
  tokenId: bigint;
  allocations: TokenAllocation[];
}

/**
 * Burn payload data
 */
export interface BurnPayload {
  tokenId: bigint;
  amount: bigint;
}

/**
 * Parsed token operation
 */
export type ParsedTokenOperation =
  | { operation: TokenOperation.DEPLOY; data: DeployPayload }
  | { operation: TokenOperation.MINT; data: MintPayload }
  | { operation: TokenOperation.TRANSFER; data: TransferPayload }
  | { operation: TokenOperation.BURN; data: BurnPayload }
  | { operation: TokenOperation.SPLIT; data: TransferPayload };

// ============================================================================
// Encoding Functions
// ============================================================================

/**
 * Encode a DEPLOY operation payload
 * Format: [op: u8][ticker_len: u8][ticker: utf8][decimals: u8][max_supply: varint][mint_limit: varint][flags: u8]
 */
export function encodeDeployPayload(payload: DeployPayload): Uint8Array {
  const encoder = new TextEncoder();
  const tickerBytes = encoder.encode(payload.ticker.toUpperCase());

  if (tickerBytes.length > 32) {
    throw new Error('Ticker too long (max 32 bytes)');
  }

  const maxSupplyVarint = encodeVarint(payload.maxSupply);
  const mintLimitVarint = encodeVarint(payload.mintLimit ?? 0n);

  // Calculate total size
  const size =
    1 + // operation
    1 + // ticker length
    tickerBytes.length +
    1 + // decimals
    maxSupplyVarint.length +
    mintLimitVarint.length +
    1; // flags

  const result = new Uint8Array(size);
  let offset = 0;

  result[offset++] = TokenOperation.DEPLOY;
  result[offset++] = tickerBytes.length;
  result.set(tickerBytes, offset);
  offset += tickerBytes.length;
  result[offset++] = payload.decimals;
  result.set(maxSupplyVarint, offset);
  offset += maxSupplyVarint.length;
  result.set(mintLimitVarint, offset);
  offset += mintLimitVarint.length;
  result[offset++] = payload.flags;

  return result;
}

/**
 * Encode a MINT operation payload
 * Format: [op: u8][token_id: varint][amount: varint][output_idx: u8]
 */
export function encodeMintPayload(payload: MintPayload): Uint8Array {
  const tokenIdVarint = encodeVarint(payload.tokenId);
  const amountVarint = encodeVarint(payload.amount);

  const size = 1 + tokenIdVarint.length + amountVarint.length + 1;
  const result = new Uint8Array(size);
  let offset = 0;

  result[offset++] = TokenOperation.MINT;
  result.set(tokenIdVarint, offset);
  offset += tokenIdVarint.length;
  result.set(amountVarint, offset);
  offset += amountVarint.length;
  result[offset++] = payload.outputIndex;

  return result;
}

/**
 * Encode a TRANSFER operation payload
 * Format: [op: u8][token_id: varint][count: u8][[output_idx: u8][amount: varint]...]
 */
export function encodeTransferPayload(payload: TransferPayload): Uint8Array {
  if (payload.allocations.length > 255) {
    throw new Error('Too many allocations (max 255)');
  }

  const tokenIdVarint = encodeVarint(payload.tokenId);

  // Calculate allocations size
  let allocationsSize = 0;
  const encodedAllocations: { outputIndex: number; amount: Uint8Array }[] = [];

  for (const alloc of payload.allocations) {
    const amountVarint = encodeVarint(alloc.amount);
    encodedAllocations.push({ outputIndex: alloc.outputIndex, amount: amountVarint });
    allocationsSize += 1 + amountVarint.length; // output_idx + amount
  }

  const size = 1 + tokenIdVarint.length + 1 + allocationsSize;
  const result = new Uint8Array(size);
  let offset = 0;

  result[offset++] = TokenOperation.TRANSFER;
  result.set(tokenIdVarint, offset);
  offset += tokenIdVarint.length;
  result[offset++] = payload.allocations.length;

  for (const alloc of encodedAllocations) {
    result[offset++] = alloc.outputIndex;
    result.set(alloc.amount, offset);
    offset += alloc.amount.length;
  }

  return result;
}

/**
 * Encode a BURN operation payload
 * Format: [op: u8][token_id: varint][amount: varint]
 */
export function encodeBurnPayload(payload: BurnPayload): Uint8Array {
  const tokenIdVarint = encodeVarint(payload.tokenId);
  const amountVarint = encodeVarint(payload.amount);

  const size = 1 + tokenIdVarint.length + amountVarint.length;
  const result = new Uint8Array(size);
  let offset = 0;

  result[offset++] = TokenOperation.BURN;
  result.set(tokenIdVarint, offset);
  offset += tokenIdVarint.length;
  result.set(amountVarint, offset);

  return result;
}

/**
 * Encode a SPLIT operation payload (same format as TRANSFER)
 */
export function encodeSplitPayload(payload: TransferPayload): Uint8Array {
  const encoded = encodeTransferPayload(payload);
  encoded[0] = TokenOperation.SPLIT;
  return encoded;
}

// ============================================================================
// Decoding Functions
// ============================================================================

/**
 * Decode a token operation from bytes
 */
export function decodeTokenPayload(bytes: Uint8Array): ParsedTokenOperation | null {
  if (bytes.length < 1) {
    return null;
  }

  const operation = bytes[0] as TokenOperation;

  switch (operation) {
    case TokenOperation.DEPLOY:
      return decodeDeployPayload(bytes);
    case TokenOperation.MINT:
      return decodeMintPayload(bytes);
    case TokenOperation.TRANSFER:
      return decodeTransferPayload(bytes);
    case TokenOperation.BURN:
      return decodeBurnPayload(bytes);
    case TokenOperation.SPLIT:
      return decodeSplitPayload(bytes);
    default:
      return null;
  }
}

function decodeDeployPayload(bytes: Uint8Array): ParsedTokenOperation | null {
  if (bytes.length < 5) return null;

  let offset = 1; // Skip operation byte

  const tickerLen = bytes[offset++];
  if (bytes.length < offset + tickerLen + 3) return null;

  const decoder = new TextDecoder();
  const ticker = decoder.decode(bytes.slice(offset, offset + tickerLen));
  offset += tickerLen;

  const decimals = bytes[offset++];

  const [maxSupply, maxSupplyBytes] = decodeVarint(bytes, offset);
  offset += maxSupplyBytes;

  const [mintLimit, mintLimitBytes] = decodeVarint(bytes, offset);
  offset += mintLimitBytes;

  const flags = bytes[offset++];

  return {
    operation: TokenOperation.DEPLOY,
    data: {
      ticker,
      decimals,
      maxSupply,
      mintLimit: mintLimit > 0n ? mintLimit : undefined,
      flags,
    },
  };
}

function decodeMintPayload(bytes: Uint8Array): ParsedTokenOperation | null {
  if (bytes.length < 4) return null;

  let offset = 1;

  const [tokenId, tokenIdBytes] = decodeVarint(bytes, offset);
  offset += tokenIdBytes;

  const [amount, amountBytes] = decodeVarint(bytes, offset);
  offset += amountBytes;

  const outputIndex = bytes[offset];

  return {
    operation: TokenOperation.MINT,
    data: { tokenId, amount, outputIndex },
  };
}

function decodeTransferPayload(bytes: Uint8Array): ParsedTokenOperation | null {
  if (bytes.length < 4) return null;

  let offset = 1;

  const [tokenId, tokenIdBytes] = decodeVarint(bytes, offset);
  offset += tokenIdBytes;

  const count = bytes[offset++];
  const allocations: TokenAllocation[] = [];

  for (let i = 0; i < count; i++) {
    const outputIndex = bytes[offset++];
    const [amount, amountBytes] = decodeVarint(bytes, offset);
    offset += amountBytes;
    allocations.push({ outputIndex, amount });
  }

  return {
    operation: TokenOperation.TRANSFER,
    data: { tokenId, allocations },
  };
}

function decodeBurnPayload(bytes: Uint8Array): ParsedTokenOperation | null {
  if (bytes.length < 3) return null;

  let offset = 1;

  const [tokenId, tokenIdBytes] = decodeVarint(bytes, offset);
  offset += tokenIdBytes;

  const [amount] = decodeVarint(bytes, offset);

  return {
    operation: TokenOperation.BURN,
    data: { tokenId, amount },
  };
}

function decodeSplitPayload(bytes: Uint8Array): ParsedTokenOperation | null {
  const result = decodeTransferPayload(bytes);
  if (!result) return null;

  return {
    operation: TokenOperation.SPLIT,
    data: result.data as TransferPayload,
  };
}

// ============================================================================
// Anchor Protocol Integration
// ============================================================================

/**
 * Create a full Anchor protocol message for token operations
 */
export function createAnchorTokenMessage(
  payload: Uint8Array,
  anchors: Array<{ txidPrefix: Uint8Array; vout: number }> = []
): Uint8Array {
  const anchorSize = anchors.length * 9; // 8 bytes prefix + 1 byte vout
  const totalSize = 4 + 1 + 1 + anchorSize + payload.length;
  const message = new Uint8Array(totalSize);

  let offset = 0;

  // Magic bytes
  message.set(ANCHOR_MAGIC, offset);
  offset += 4;

  // Kind (Token = 20)
  message[offset++] = ANCHOR_KIND_TOKEN;

  // Anchor count
  message[offset++] = anchors.length;

  // Anchors
  for (const anchor of anchors) {
    message.set(anchor.txidPrefix, offset);
    offset += 8;
    message[offset++] = anchor.vout;
  }

  // Body (token payload)
  message.set(payload, offset);

  return message;
}

/**
 * Parse an Anchor token message
 */
export function parseAnchorTokenMessage(bytes: Uint8Array): ParsedTokenOperation | null {
  // Verify magic
  if (bytes.length < 6) return null;
  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== ANCHOR_MAGIC[i]) return null;
  }

  // Verify kind
  if (bytes[4] !== ANCHOR_KIND_TOKEN) return null;

  // Get anchor count and skip anchors
  const anchorCount = bytes[5];
  const bodyOffset = 6 + anchorCount * 9;

  if (bytes.length <= bodyOffset) return null;

  const body = bytes.slice(bodyOffset);
  return decodeTokenPayload(body);
}

// ============================================================================
// Utility Functions
// ============================================================================

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
 * Validate ticker format
 */
export function isValidTicker(ticker: string): boolean {
  // 1-32 characters, alphanumeric only
  if (ticker.length < 1 || ticker.length > 32) return false;
  return /^[A-Za-z0-9]+$/.test(ticker);
}

/**
 * Calculate payload size for fee estimation
 */
export function calculatePayloadSize(operation: ParsedTokenOperation): number {
  switch (operation.operation) {
    case TokenOperation.DEPLOY: {
      const data = operation.data;
      const tickerLen = new TextEncoder().encode(data.ticker).length;
      return (
        1 +
        1 +
        tickerLen +
        1 +
        varintLength(data.maxSupply) +
        varintLength(data.mintLimit ?? 0n) +
        1
      );
    }
    case TokenOperation.MINT: {
      const data = operation.data;
      return 1 + varintLength(data.tokenId) + varintLength(data.amount) + 1;
    }
    case TokenOperation.TRANSFER:
    case TokenOperation.SPLIT: {
      const data = operation.data;
      let size = 1 + varintLength(data.tokenId) + 1;
      for (const alloc of data.allocations) {
        size += 1 + varintLength(alloc.amount);
      }
      return size;
    }
    case TokenOperation.BURN: {
      const data = operation.data;
      return 1 + varintLength(data.tokenId) + varintLength(data.amount);
    }
  }
}

/**
 * Estimate fee for token transaction
 * Uses witness discount for Witness Data carrier
 */
export function estimateFee(
  payloadSize: number,
  feeRate: number = 1,
  useWitness: boolean = true
): number {
  const baseTxSize = 150; // vbytes
  const protocolOverhead = 6; // magic + kind + anchor_count

  if (useWitness) {
    // Witness discount: 1/4 weight
    const witnessBytes = payloadSize + protocolOverhead;
    const witnessVbytes = Math.ceil(witnessBytes / 4);
    return (baseTxSize + witnessVbytes) * feeRate;
  } else {
    // OP_RETURN: no discount
    const opReturnOverhead = 10;
    return (baseTxSize + opReturnOverhead + payloadSize + protocolOverhead) * feeRate;
  }
}

/**
 * Carrier types for embedding ANCHOR data
 */
export enum CarrierType {
  OpReturn = 0,
  Inscription = 1,
  Stamps = 2,
  TaprootAnnex = 3,
  WitnessData = 4,
}

/**
 * Carrier information
 */
export const CARRIER_INFO = {
  [CarrierType.OpReturn]: {
    name: 'OP_RETURN',
    maxSize: 80,
    witnessDiscount: false,
    description: 'Standard OP_RETURN output (80 bytes max)',
  },
  [CarrierType.Inscription]: {
    name: 'Inscription',
    maxSize: 4_000_000,
    witnessDiscount: true,
    description: 'Ordinals-style inscription (~4MB max, 75% discount)',
  },
  [CarrierType.Stamps]: {
    name: 'Stamps',
    maxSize: 8000,
    witnessDiscount: false,
    description: 'Permanent bare multisig (~8KB max, unprunable)',
  },
  [CarrierType.TaprootAnnex]: {
    name: 'Taproot Annex',
    maxSize: 10000,
    witnessDiscount: true,
    description: 'Taproot annex field (reserved)',
  },
  [CarrierType.WitnessData]: {
    name: 'Witness Data',
    maxSize: 4_000_000,
    witnessDiscount: true,
    description: 'Raw witness data (~4MB max, 75% discount)',
  },
};

/**
 * Get the recommended carrier for a payload size
 */
export function getRecommendedCarrier(payloadSize: number): CarrierType {
  // Always prefer WitnessData for the 75% discount
  if (payloadSize <= CARRIER_INFO[CarrierType.WitnessData].maxSize) {
    return CarrierType.WitnessData;
  }
  // Fall back to Inscription for very large payloads
  return CarrierType.Inscription;
}

/**
 * Calculate fee savings from using Witness Data carrier
 */
export function calculateFeeSavings(
  payloadSize: number,
  feeRate: number = 1
): { opReturnFee: number; witnessFee: number; savings: number; savingsPercent: number } {
  const baseTxSize = 150; // vbytes
  const protocolOverhead = 6; // magic + kind + anchor_count
  const opReturnOverhead = 10;

  // OP_RETURN (no discount)
  const opReturnFee = (baseTxSize + opReturnOverhead + payloadSize + protocolOverhead) * feeRate;

  // Witness Data (75% discount on witness bytes)
  const witnessBytes = payloadSize + protocolOverhead;
  const witnessVbytes = Math.ceil(witnessBytes / 4);
  const witnessFee = (baseTxSize + witnessVbytes) * feeRate;

  const savings = opReturnFee - witnessFee;
  const savingsPercent = (savings / opReturnFee) * 100;

  return { opReturnFee, witnessFee, savings, savingsPercent };
}

/**
 * Format token amount with decimals
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const intPart = amount / divisor;
  const fracPart = amount % divisor;

  if (decimals === 0) {
    return intPart.toString();
  }

  const fracStr = fracPart.toString().padStart(decimals, '0').replace(/0+$/, '');
  return fracStr ? `${intPart}.${fracStr}` : intPart.toString();
}

/**
 * Parse token amount string to bigint
 */
export function parseTokenAmount(amountStr: string, decimals: number): bigint {
  const parts = amountStr.split('.');
  const intPart = BigInt(parts[0] || '0');
  const fracPart = parts[1] || '';

  const divisor = 10n ** BigInt(decimals);
  const fracValue = BigInt(fracPart.padEnd(decimals, '0').slice(0, decimals));

  return intPart * divisor + fracValue;
}
