/**
 * ANCHOR SDK
 *
 * TypeScript SDK for the ANCHOR protocol.
 *
 * @example
 * ```typescript
 * import { AnchorWallet, WalletConfig } from "@AnchorProtocol/sdk";
 *
 * // Create wallet
 * const wallet = new AnchorWallet(
 *   WalletConfig.regtest("http://localhost:18443", "user", "pass")
 * );
 *
 * // Create a root message
 * const result = await wallet.createRootMessage("Hello, ANCHOR!");
 * console.log("Created:", result.txid);
 *
 * // Reply to a message
 * const reply = await wallet.createReply("This is a reply!", result.txid, 0);
 * ```
 *
 * @packageDocumentation
 */

// Re-export everything from browser bundle
export * from "./browser.js";

// Node.js specific exports (wallet with RPC)
export { AnchorWallet, createWallet, WalletConfig } from "./wallet.js";

// Re-export wallet types
export type {
  WalletConfig as WalletConfigType,
  Balance,
  Utxo,
  TransactionResult,
} from "./types.js";

