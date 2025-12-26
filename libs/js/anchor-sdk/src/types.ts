/**
 * ANCHOR Protocol Types
 *
 * Core type definitions for the ANCHOR protocol v1.
 */

/**
 * ANCHOR v1 magic bytes: 0xA11C0001
 * - 0xA11C = "ANCH" in leetspeak
 * - 0x0001 = version 1
 */
export const ANCHOR_MAGIC = new Uint8Array([0xa1, 0x1c, 0x00, 0x01]);

/**
 * Size of the txid prefix in bytes (64 bits)
 */
export const TXID_PREFIX_SIZE = 8;

/**
 * Size of each anchor in bytes (8 bytes prefix + 1 byte vout)
 */
export const ANCHOR_SIZE = 9;

/**
 * Minimum payload size (magic + kind + anchor_count)
 */
export const MIN_PAYLOAD_SIZE = 6;

/**
 * Maximum OP_RETURN payload size (legacy)
 */
export const MAX_OP_RETURN_SIZE = 80;

/**
 * Maximum OP_RETURN payload size (v30+)
 */
export const MAX_OP_RETURN_SIZE_V30 = 100_000;

/**
 * Maximum witness data size (~4MB)
 */
export const MAX_WITNESS_SIZE = 4_000_000;

/**
 * Carrier status
 */
export enum CarrierStatus {
  /** Fully functional and actively used */
  Active = 'active',
  /** Reserved for future use, may not relay by default */
  Reserved = 'reserved',
  /** Proposed but not yet implemented in Bitcoin */
  Proposed = 'proposed',
  /** Legacy, not recommended for new use */
  Deprecated = 'deprecated',
}

/**
 * Carrier type for embedding ANCHOR data
 */
export enum CarrierType {
  /** OP_RETURN output (default, simplest) */
  OpReturn = 0,
  /** Ordinals-style inscription in witness */
  Inscription = 1,
  /** Stamps bare multisig (permanent, unprunable) */
  Stamps = 2,
  /** Taproot annex field */
  TaprootAnnex = 3,
  /** Raw witness data in Tapscript */
  WitnessData = 4,
}

/**
 * Carrier information and capabilities
 */
export interface CarrierInfo {
  /** Carrier type */
  type: CarrierType;
  /** Human-readable name */
  name: string;
  /** Maximum payload size in bytes */
  maxSize: number;
  /** Whether data can be pruned by nodes */
  isPrunable: boolean;
  /** Whether carrier impacts UTXO set size */
  utxoImpact: boolean;
  /** Whether carrier benefits from witness discount (75%) */
  witnessDiscount: boolean;
  /** Current status of this carrier */
  status: CarrierStatus;
}

/**
 * Get carrier info by type
 */
export function getCarrierInfo(type: CarrierType): CarrierInfo {
  switch (type) {
    case CarrierType.OpReturn:
      return {
        type: CarrierType.OpReturn,
        name: 'op_return',
        maxSize: MAX_OP_RETURN_SIZE,
        isPrunable: true,
        utxoImpact: false,
        witnessDiscount: false,
        status: CarrierStatus.Active,
      };
    case CarrierType.Inscription:
      return {
        type: CarrierType.Inscription,
        name: 'inscription',
        maxSize: MAX_WITNESS_SIZE,
        isPrunable: true,
        utxoImpact: false,
        witnessDiscount: true,
        status: CarrierStatus.Active,
      };
    case CarrierType.Stamps:
      return {
        type: CarrierType.Stamps,
        name: 'stamps',
        maxSize: 8000,
        isPrunable: false,
        utxoImpact: true,
        witnessDiscount: false,
        status: CarrierStatus.Active,
      };
    case CarrierType.TaprootAnnex:
      return {
        type: CarrierType.TaprootAnnex,
        name: 'taproot_annex',
        maxSize: 10000,
        isPrunable: true,
        utxoImpact: false,
        witnessDiscount: true,
        status: CarrierStatus.Reserved,
      };
    case CarrierType.WitnessData:
      return {
        type: CarrierType.WitnessData,
        name: 'witness_data',
        maxSize: MAX_WITNESS_SIZE,
        isPrunable: true,
        utxoImpact: false,
        witnessDiscount: true,
        status: CarrierStatus.Active,
      };
    default:
      throw new Error(`Unknown carrier type: ${type}`);
  }
}

/**
 * Get carrier name from type
 */
export function getCarrierName(type: CarrierType): string {
  return getCarrierInfo(type).name;
}

/**
 * Get all active carrier types
 */
export function getActiveCarriers(): CarrierType[] {
  return [
    CarrierType.OpReturn,
    CarrierType.Inscription,
    CarrierType.Stamps,
    CarrierType.WitnessData,
  ];
}

/**
 * Message kind/type
 */
export enum AnchorKind {
  /** Generic binary message */
  Generic = 0,
  /** UTF-8 text message */
  Text = 1,
  /** State update */
  State = 2,
  /** Vote/governance */
  Vote = 3,
}

/**
 * An anchor reference to a parent message
 */
export interface Anchor {
  /** First 8 bytes of the parent transaction's txid */
  txidPrefix: Uint8Array;
  /** Output index of the parent message */
  vout: number;
}

/**
 * A parsed ANCHOR message
 */
export interface AnchorMessage {
  /** Message type */
  kind: AnchorKind;
  /** References to parent messages */
  anchors: Anchor[];
  /** Message body */
  body: Uint8Array;
}

/**
 * A parsed ANCHOR message with text body
 */
export interface TextMessage extends AnchorMessage {
  kind: AnchorKind.Text;
  /** Decoded text body */
  text: string;
}

/**
 * Result of anchor resolution
 */
export type AnchorResolution =
  | { status: 'resolved'; txid: string }
  | { status: 'orphan' }
  | { status: 'ambiguous'; candidates: string[] };

/**
 * Options for creating a message
 */
export interface CreateMessageOptions {
  /** Message kind (default: Text) */
  kind?: AnchorKind;
  /** Message body as string (for Text messages) */
  body?: string;
  /** Message body as bytes (for binary messages) */
  bodyBytes?: Uint8Array;
  /** Parent references (txid:vout pairs) */
  anchors?: Array<{ txid: string; vout: number }>;
  /** Carrier type to use (default: auto-select) */
  carrier?: CarrierType;
}

/**
 * Carrier selection preferences
 */
export interface CarrierPreferences {
  /** Require permanent (non-prunable) storage */
  requirePermanent?: boolean;
  /** Maximum acceptable fee in satoshis */
  maxFee?: number;
  /** Preferred carriers in order of preference */
  preferred?: CarrierType[];
  /** Carriers to exclude from selection */
  exclude?: CarrierType[];
  /** Fee rate in sat/vB */
  feeRate?: number;
}

/**
 * UTXO for spending
 */
export interface Utxo {
  /** Transaction ID */
  txid: string;
  /** Output index */
  vout: number;
  /** Value in satoshis */
  value: number;
  /** Script pubkey as hex */
  scriptPubKey: string;
}

/**
 * Wallet balance
 */
export interface Balance {
  /** Confirmed balance in satoshis */
  confirmed: number;
  /** Unconfirmed balance in satoshis */
  unconfirmed: number;
  /** Total balance in satoshis */
  total: number;
}

/**
 * Bitcoin network type
 */
export type Network = 'mainnet' | 'testnet' | 'signet' | 'regtest';

/**
 * Wallet configuration
 */
export interface WalletConfig {
  /** Bitcoin Core RPC URL */
  rpcUrl: string;
  /** RPC username */
  rpcUser: string;
  /** RPC password */
  rpcPassword: string;
  /** Network type */
  network: Network;
  /** Wallet name (for multi-wallet) */
  walletName?: string;
  /** Fee rate in sat/vB */
  feeRate?: number;
}

/**
 * Transaction result
 */
export interface TransactionResult {
  /** Transaction ID */
  txid: string;
  /** Raw transaction hex */
  hex: string;
  /** Output index of the ANCHOR message */
  vout: number;
  /** Carrier type used */
  carrier: CarrierType;
}

/**
 * Error codes
 */
export enum AnchorErrorCode {
  InvalidMagic = 'INVALID_MAGIC',
  PayloadTooShort = 'PAYLOAD_TOO_SHORT',
  TruncatedAnchors = 'TRUNCATED_ANCHORS',
  MessageTooLarge = 'MESSAGE_TOO_LARGE',
  InvalidTxid = 'INVALID_TXID',
  InsufficientFunds = 'INSUFFICIENT_FUNDS',
  NoUtxos = 'NO_UTXOS',
  RpcError = 'RPC_ERROR',
  SigningError = 'SIGNING_ERROR',
}

/**
 * Custom error class for ANCHOR operations
 */
export class AnchorError extends Error {
  constructor(
    public code: AnchorErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'AnchorError';
  }
}
