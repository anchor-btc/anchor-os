/**
 * ANCHOR Wallet
 *
 * Node.js wallet implementation using Bitcoin Core RPC.
 */

import {
  AnchorKind,
  AnchorError,
  AnchorErrorCode,
  CarrierType,
  type WalletConfig as WalletConfigType,
  type Balance,
  type Utxo,
  type TransactionResult,
} from './types.js';
import { buildTransaction, getNetwork, type TransactionBuilderOptions } from './transaction.js';
import * as bitcoin from 'bitcoinjs-lib';

/**
 * Bitcoin Core RPC client
 */
class BitcoinRpc {
  private url: string;
  private auth: string;

  constructor(config: WalletConfigType) {
    const walletPath = config.walletName ? `/wallet/${config.walletName}` : '';
    this.url = `${config.rpcUrl}${walletPath}`;
    this.auth = Buffer.from(`${config.rpcUser}:${config.rpcPassword}`).toString('base64');
  }

  async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${this.auth}`,
      },
      body: JSON.stringify({
        jsonrpc: '1.0',
        id: Date.now(),
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new AnchorError(
        AnchorErrorCode.RpcError,
        `RPC error: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as { result: T; error: unknown };

    if (data.error) {
      throw new AnchorError(AnchorErrorCode.RpcError, `RPC error: ${JSON.stringify(data.error)}`);
    }

    return data.result;
  }
}

/**
 * ANCHOR Wallet for creating and broadcasting messages
 */
export class AnchorWallet {
  private rpc: BitcoinRpc;
  private config: WalletConfigType;
  private bitcoinNetwork: bitcoin.Network;

  constructor(config: WalletConfigType) {
    this.config = {
      feeRate: 1,
      ...config,
    };
    this.rpc = new BitcoinRpc(config);
    this.bitcoinNetwork = getNetwork(config.network);
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<Balance> {
    interface BalanceResult {
      mine: {
        trusted: number;
        untrusted_pending: number;
      };
    }

    const result = await this.rpc.call<BalanceResult>('getbalances');

    const confirmed = Math.round(result.mine.trusted * 1e8);
    const unconfirmed = Math.round(result.mine.untrusted_pending * 1e8);

    return {
      confirmed,
      unconfirmed,
      total: confirmed + unconfirmed,
    };
  }

  /**
   * Get a new receiving address
   */
  async getNewAddress(): Promise<string> {
    return this.rpc.call<string>('getnewaddress');
  }

  /**
   * List unspent outputs (UTXOs)
   */
  async listUtxos(minConfirmations: number = 1): Promise<Utxo[]> {
    interface UnspentResult {
      txid: string;
      vout: number;
      address: string;
      amount: number;
      confirmations: number;
      scriptPubKey: string;
    }

    const result = await this.rpc.call<UnspentResult[]>('listunspent', [minConfirmations]);

    return result.map((u) => ({
      txid: u.txid,
      vout: u.vout,
      value: Math.round(u.amount * 1e8),
      scriptPubKey: u.scriptPubKey,
    }));
  }

  /**
   * Create a root message (new thread)
   */
  async createRootMessage(text: string, carrier?: CarrierType): Promise<TransactionResult> {
    return this.createMessage({
      kind: AnchorKind.Text,
      body: text,
      carrier,
    });
  }

  /**
   * Create a reply to an existing message
   */
  async createReply(
    text: string,
    parentTxid: string,
    parentVout: number = 0,
    carrier?: CarrierType
  ): Promise<TransactionResult> {
    return this.createMessage({
      kind: AnchorKind.Text,
      body: text,
      anchors: [{ txid: parentTxid, vout: parentVout }],
      carrier,
    });
  }

  /**
   * Create a permanent root message using Stamps carrier
   */
  async createPermanentMessage(text: string): Promise<TransactionResult> {
    return this.createRootMessage(text, CarrierType.Stamps);
  }

  /**
   * Create a permanent reply using Stamps carrier
   */
  async createPermanentReply(
    text: string,
    parentTxid: string,
    parentVout: number = 0
  ): Promise<TransactionResult> {
    return this.createReply(text, parentTxid, parentVout, CarrierType.Stamps);
  }

  /**
   * Create a message with custom options
   */
  async createMessage(
    options: TransactionBuilderOptions['message'] & { carrier?: CarrierType }
  ): Promise<TransactionResult> {
    // Get UTXOs
    const utxos = await this.listUtxos(0);
    if (utxos.length === 0) {
      throw new AnchorError(AnchorErrorCode.NoUtxos, 'No UTXOs available');
    }

    // Get change address
    const changeAddress = await this.getNewAddress();

    // For Stamps, we need more UTXOs
    const inputCount = options.carrier === CarrierType.Stamps ? Math.min(2, utxos.length) : 1;
    const inputs = utxos.slice(0, inputCount);

    // Build transaction
    const { psbt, anchorVout } = buildTransaction({
      network: this.config.network,
      feeRate: this.config.feeRate,
      inputs,
      changeAddress,
      message: options,
    });

    // Sign and broadcast
    const result = await this.signAndBroadcast(psbt);

    // Determine carrier used
    const carrier = options.carrier ?? CarrierType.OpReturn;

    return {
      ...result,
      vout: anchorVout,
      carrier,
    };
  }

  /**
   * Sign a PSBT using Bitcoin Core wallet
   */
  async signPsbt(psbt: bitcoin.Psbt): Promise<bitcoin.Psbt> {
    const hex = psbt.toHex();

    interface SignResult {
      psbt: string;
      complete: boolean;
    }

    const result = await this.rpc.call<SignResult>('walletprocesspsbt', [hex]);

    if (!result.complete) {
      throw new AnchorError(AnchorErrorCode.SigningError, 'Failed to sign transaction');
    }

    return bitcoin.Psbt.fromBase64(result.psbt, {
      network: this.bitcoinNetwork,
    });
  }

  /**
   * Sign and broadcast a transaction
   */
  async signAndBroadcast(psbt: bitcoin.Psbt): Promise<{ txid: string; hex: string }> {
    // Sign
    const signedPsbt = await this.signPsbt(psbt);

    // Finalize
    signedPsbt.finalizeAllInputs();

    // Extract transaction
    const tx = signedPsbt.extractTransaction();
    const hex = tx.toHex();

    // Broadcast
    const txid = await this.rpc.call<string>('sendrawtransaction', [hex]);

    return { txid, hex };
  }

  /**
   * Broadcast a raw transaction
   */
  async broadcast(hex: string): Promise<string> {
    return this.rpc.call<string>('sendrawtransaction', [hex]);
  }

  /**
   * Mine blocks (regtest only)
   */
  async mineBlocks(count: number = 1): Promise<string[]> {
    const address = await this.getNewAddress();
    return this.rpc.call<string[]>('generatetoaddress', [count, address]);
  }

  /**
   * Get blockchain info
   */
  async getBlockchainInfo(): Promise<{
    chain: string;
    blocks: number;
    headers: number;
    bestblockhash: string;
  }> {
    return this.rpc.call('getblockchaininfo');
  }

  /**
   * Get raw transaction
   */
  async getRawTransaction(txid: string, verbose: boolean = true): Promise<unknown> {
    return this.rpc.call('getrawtransaction', [txid, verbose]);
  }
}

/**
 * Create a wallet instance
 */
export function createWallet(config: WalletConfigType): AnchorWallet {
  return new AnchorWallet(config);
}

/**
 * Create wallet config helpers
 */
export const WalletConfigHelper = {
  mainnet(rpcUrl: string, rpcUser: string, rpcPassword: string): WalletConfigType {
    return { rpcUrl, rpcUser, rpcPassword, network: 'mainnet' };
  },
  testnet(rpcUrl: string, rpcUser: string, rpcPassword: string): WalletConfigType {
    return { rpcUrl, rpcUser, rpcPassword, network: 'testnet' };
  },
  signet(rpcUrl: string, rpcUser: string, rpcPassword: string): WalletConfigType {
    return { rpcUrl, rpcUser, rpcPassword, network: 'signet' };
  },
  regtest(rpcUrl: string, rpcUser: string, rpcPassword: string): WalletConfigType {
    return { rpcUrl, rpcUser, rpcPassword, network: 'regtest' };
  },
};

// Re-export as WalletConfig for convenience
export { WalletConfigHelper as WalletConfig };
