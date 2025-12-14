/**
 * ANCHOR SDK - Browser Bundle
 *
 * This export includes only browser-compatible features.
 * It excludes the wallet (which requires Node.js for RPC).
 */

// Types
export {
  ANCHOR_MAGIC,
  TXID_PREFIX_SIZE,
  ANCHOR_SIZE,
  MIN_PAYLOAD_SIZE,
  MAX_OP_RETURN_SIZE,
  AnchorKind,
  AnchorError,
  AnchorErrorCode,
  type Anchor,
  type AnchorMessage,
  type TextMessage,
  type AnchorResolution,
  type CreateMessageOptions,
  type Network,
} from "./types.js";

// Encoder
export {
  hexToBytes,
  bytesToHex,
  txidToPrefix,
  createAnchor,
  encodeAnchorPayload,
  createMessage,
  encodeTextMessage,
  encodeRootMessage,
  encodeReplyMessage,
  maxBodySize,
} from "./encoder.js";

// Parser
export {
  isAnchorPayload,
  parseAnchorPayload,
  parseTextMessage,
  getMessageText,
  anchorMatchesTxid,
  anchorToString,
  isRootMessage,
  getCanonicalParent,
  parseOpReturnScript,
  parseFromOpReturn,
} from "./parser.js";

// Transaction builder (works in browser with external signing)
export {
  getNetwork,
  createOpReturnScript,
  buildTransaction,
  AnchorTransactionBuilder,
  createTransactionBuilder,
  type TransactionBuilderOptions,
  type BuiltTransaction,
} from "./transaction.js";

