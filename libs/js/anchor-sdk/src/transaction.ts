/**
 * ANCHOR Transaction Builder
 *
 * Build Bitcoin transactions with ANCHOR messages using bitcoinjs-lib.
 */

import * as bitcoin from 'bitcoinjs-lib';
import {
  AnchorKind,
  AnchorError,
  AnchorErrorCode,
  type Utxo,
  type CreateMessageOptions,
  type Network,
} from './types.js';
import { encodeAnchorPayload, createMessage } from './encoder.js';

/**
 * Get bitcoinjs-lib network from string
 */
export function getNetwork(network: Network): bitcoin.Network {
  switch (network) {
    case 'mainnet':
      return bitcoin.networks.bitcoin;
    case 'testnet':
      return bitcoin.networks.testnet;
    case 'regtest':
      return bitcoin.networks.regtest;
    case 'signet':
      // Signet uses testnet network params
      return bitcoin.networks.testnet;
    default:
      return bitcoin.networks.regtest;
  }
}

/**
 * Create an OP_RETURN script with ANCHOR payload
 */
export function createOpReturnScript(payload: Uint8Array): Buffer {
  return bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from(payload)]);
}

/**
 * Transaction builder options
 */
export interface TransactionBuilderOptions {
  /** Network */
  network?: Network;
  /** Fee rate in sat/vB */
  feeRate?: number;
  /** Inputs to spend */
  inputs: Utxo[];
  /** Change address */
  changeAddress: string;
  /** ANCHOR message options */
  message: CreateMessageOptions;
}

/**
 * Built transaction result
 */
export interface BuiltTransaction {
  /** PSBT (Partially Signed Bitcoin Transaction) */
  psbt: bitcoin.Psbt;
  /** Estimated fee in satoshis */
  fee: number;
  /** Change amount in satoshis */
  change: number;
  /** Index of OP_RETURN output */
  anchorVout: number;
  /** The ANCHOR payload */
  payload: Uint8Array;
}

/**
 * Build an ANCHOR transaction
 *
 * Creates a PSBT with:
 * - Output 0: OP_RETURN with ANCHOR payload
 * - Output 1: Change output
 */
export function buildTransaction(options: TransactionBuilderOptions): BuiltTransaction {
  const network = getNetwork(options.network ?? 'regtest');
  const feeRate = options.feeRate ?? 1;

  // Validate inputs
  if (options.inputs.length === 0) {
    throw new AnchorError(AnchorErrorCode.NoUtxos, 'No inputs provided');
  }

  // Create ANCHOR payload
  const anchorMessage = createMessage(options.message);
  const payload = encodeAnchorPayload(anchorMessage);
  const opReturnScript = createOpReturnScript(payload);

  // Calculate total input value
  const totalInput = options.inputs.reduce((sum, utxo) => sum + utxo.value, 0);

  // Estimate transaction size
  // Base: 10 bytes
  // Per input: ~68 bytes (P2WPKH)
  // Per output: ~34 bytes
  const estimatedVsize = 10 + options.inputs.length * 68 + 2 * 34;
  const fee = Math.ceil(estimatedVsize * feeRate);

  // Calculate change
  const change = totalInput - fee;

  if (change < 546) {
    throw new AnchorError(
      AnchorErrorCode.InsufficientFunds,
      `Insufficient funds: need ${fee + 546} sats, have ${totalInput} sats`
    );
  }

  // Create PSBT
  const psbt = new bitcoin.Psbt({ network });

  // Add inputs
  for (const utxo of options.inputs) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: Buffer.from(utxo.scriptPubKey, 'hex'),
        value: utxo.value,
      },
    });
  }

  // Add OP_RETURN output (index 0)
  psbt.addOutput({
    script: opReturnScript,
    value: 0,
  });

  // Add change output (index 1)
  psbt.addOutput({
    address: options.changeAddress,
    value: change,
  });

  return {
    psbt,
    fee,
    change,
    anchorVout: 0,
    payload,
  };
}

/**
 * Fluent builder for ANCHOR transactions
 */
export class AnchorTransactionBuilder {
  private network: Network = 'regtest';
  private feeRate: number = 1;
  private inputs: Utxo[] = [];
  private changeAddress: string = '';
  private kind: AnchorKind = AnchorKind.Text;
  private body: string = '';
  private bodyBytes?: Uint8Array;
  private anchors: Array<{ txid: string; vout: number }> = [];

  /**
   * Set network
   */
  setNetwork(network: Network): this {
    this.network = network;
    return this;
  }

  /**
   * Set fee rate in sat/vB
   */
  setFeeRate(rate: number): this {
    this.feeRate = rate;
    return this;
  }

  /**
   * Add an input UTXO
   */
  addInput(utxo: Utxo): this {
    this.inputs.push(utxo);
    return this;
  }

  /**
   * Add multiple input UTXOs
   */
  addInputs(utxos: Utxo[]): this {
    this.inputs.push(...utxos);
    return this;
  }

  /**
   * Set change address
   */
  setChangeAddress(address: string): this {
    this.changeAddress = address;
    return this;
  }

  /**
   * Set message kind
   */
  setKind(kind: AnchorKind): this {
    this.kind = kind;
    return this;
  }

  /**
   * Set text body
   */
  setBody(text: string): this {
    this.body = text;
    this.kind = AnchorKind.Text;
    return this;
  }

  /**
   * Set binary body
   */
  setBodyBytes(bytes: Uint8Array): this {
    this.bodyBytes = bytes;
    return this;
  }

  /**
   * Add parent anchor
   */
  addAnchor(txid: string, vout: number = 0): this {
    this.anchors.push({ txid, vout });
    return this;
  }

  /**
   * Set as reply to a message
   */
  replyTo(txid: string, vout: number = 0): this {
    // Insert at beginning (canonical parent)
    this.anchors.unshift({ txid, vout });
    return this;
  }

  /**
   * Build the transaction
   */
  build(): BuiltTransaction {
    return buildTransaction({
      network: this.network,
      feeRate: this.feeRate,
      inputs: this.inputs,
      changeAddress: this.changeAddress,
      message: {
        kind: this.kind,
        body: this.body,
        bodyBytes: this.bodyBytes,
        anchors: this.anchors,
      },
    });
  }
}

/**
 * Create a new transaction builder
 */
export function createTransactionBuilder(): AnchorTransactionBuilder {
  return new AnchorTransactionBuilder();
}
