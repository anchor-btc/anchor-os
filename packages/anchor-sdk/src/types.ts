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
 * Maximum OP_RETURN payload size
 */
export const MAX_OP_RETURN_SIZE = 80;

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
  | { status: "resolved"; txid: string }
  | { status: "orphan" }
  | { status: "ambiguous"; candidates: string[] };

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
export type Network = "mainnet" | "testnet" | "signet" | "regtest";

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
}

/**
 * Error codes
 */
export enum AnchorErrorCode {
  InvalidMagic = "INVALID_MAGIC",
  PayloadTooShort = "PAYLOAD_TOO_SHORT",
  TruncatedAnchors = "TRUNCATED_ANCHORS",
  MessageTooLarge = "MESSAGE_TOO_LARGE",
  InvalidTxid = "INVALID_TXID",
  InsufficientFunds = "INSUFFICIENT_FUNDS",
  NoUtxos = "NO_UTXOS",
  RpcError = "RPC_ERROR",
  SigningError = "SIGNING_ERROR",
}

/**
 * Custom error class for ANCHOR operations
 */
export class AnchorError extends Error {
  constructor(
    public code: AnchorErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AnchorError";
  }
}

