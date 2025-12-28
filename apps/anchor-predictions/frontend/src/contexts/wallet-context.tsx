'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { schnorr } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils';

const WALLET_URL = process.env.NEXT_PUBLIC_WALLET_URL || 'http://localhost:8001';

export interface WalletBalance {
  confirmed: number;
  pending: number;
  total: number;
}

export interface WalletState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  address: string | null;
  addresses: string[] | null;
  balance: WalletBalance | null;
  pubkey: string | null;
  privateKey: string | null;
}

export interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  refreshAddresses: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
}

const defaultState: WalletState = {
  connected: false,
  connecting: false,
  error: null,
  address: null,
  addresses: null,
  balance: null,
  pubkey: null,
  privateKey: null,
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const STORAGE_KEY = 'anchor-predictions-wallet-address';
const SESSION_PRIVKEY_KEY = 'anchor-predictions-session-key';

/**
 * Generate or retrieve a session-only key pair for signing claim messages.
 *
 * SECURITY NOTES:
 * - Keys are stored in sessionStorage (cleared when browser tab closes)
 * - This is for DEMO/TESTNET use only - NOT production ready
 * - These keys are used to sign claim messages, not to control Bitcoin funds directly
 * - The actual Bitcoin wallet (core-wallet) manages real funds separately
 *
 * For production, consider:
 * - Hardware wallet integration (Ledger, Trezor)
 * - Browser extension wallets (like Alby for Lightning/Nostr)
 * - Server-side signing with proper authentication
 * - WebAuthn/passkeys for key derivation
 *
 * Returns { privateKey: hex, pubkey: hex (x-only, 32 bytes) }
 */
function getOrCreateSessionKeyPair(): { privateKey: string; pubkey: string } {
  if (typeof window === 'undefined') {
    // Server-side: generate temporary key (won't be used)
    const privateKey = randomBytes(32);
    const pubkey = schnorr.getPublicKey(privateKey);
    return {
      privateKey: bytesToHex(privateKey),
      pubkey: bytesToHex(pubkey),
    };
  }

  // Check if we have a session key (ephemeral, cleared on tab close)
  const savedPrivateKey = sessionStorage.getItem(SESSION_PRIVKEY_KEY);
  if (savedPrivateKey) {
    try {
      const privateKeyBytes = hexToBytes(savedPrivateKey);
      const pubkey = schnorr.getPublicKey(privateKeyBytes);
      return {
        privateKey: savedPrivateKey,
        pubkey: bytesToHex(pubkey),
      };
    } catch {
      // Invalid saved key, generate new one
      sessionStorage.removeItem(SESSION_PRIVKEY_KEY);
    }
  }

  // Generate new ephemeral key pair for this session
  const privateKey = randomBytes(32);
  const pubkey = schnorr.getPublicKey(privateKey);
  const privateKeyHex = bytesToHex(privateKey);

  // Store in sessionStorage (cleared when browser tab closes)
  // WARNING: Still vulnerable to XSS within the same session
  // For production, use hardware wallets or secure key management
  sessionStorage.setItem(SESSION_PRIVKEY_KEY, privateKeyHex);

  return {
    privateKey: privateKeyHex,
    pubkey: bytesToHex(pubkey),
  };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>(defaultState);

  // Fetch wallet addresses
  const fetchAddresses = useCallback(async (): Promise<string[]> => {
    const res = await fetch(`${WALLET_URL}/wallet/addresses`);
    if (!res.ok) throw new Error('Failed to fetch addresses');
    const data = await res.json();
    return data.addresses || [];
  }, []);

  // Fetch wallet balance
  const fetchBalance = useCallback(async (): Promise<WalletBalance> => {
    const res = await fetch(`${WALLET_URL}/wallet/balance`);
    if (!res.ok) throw new Error('Failed to fetch balance');
    return res.json();
  }, []);

  // Get or set persistent address
  const getPersistentAddress = useCallback((addresses: string[]): string => {
    if (typeof window === 'undefined') return addresses[0] || '';

    // Check if we have a saved address
    const savedAddress = localStorage.getItem(STORAGE_KEY);
    if (savedAddress && addresses.includes(savedAddress)) {
      return savedAddress;
    }

    // Use first address and save it
    const address = addresses[0] || '';
    if (address) {
      localStorage.setItem(STORAGE_KEY, address);
    }
    return address;
  }, []);

  // Connect to wallet
  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, connecting: true, error: null }));

    try {
      // Fetch wallet data
      const addresses = await fetchAddresses();
      const balance = await fetchBalance();

      // Use persistent address to ensure consistency
      const address = getPersistentAddress(addresses);

      // Get or create signing key pair
      const keyPair = getOrCreateSessionKeyPair();

      setState({
        connected: true,
        connecting: false,
        error: null,
        address,
        addresses,
        balance,
        pubkey: keyPair.pubkey,
        privateKey: keyPair.privateKey,
      });
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : 'Failed to connect to wallet';
      setState((prev) => ({
        ...prev,
        connected: false,
        connecting: false,
        error,
      }));
    }
  }, [fetchAddresses, fetchBalance, getPersistentAddress]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setState(defaultState);
  }, []);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!state.connected) return;

    try {
      const balance = await fetchBalance();
      setState((prev) => ({ ...prev, balance }));
    } catch (e: unknown) {
      console.error('Failed to refresh balance:', e);
    }
  }, [state.connected, fetchBalance]);

  // Refresh addresses
  const refreshAddresses = useCallback(async () => {
    if (!state.connected) return;

    try {
      const addresses = await fetchAddresses();
      setState((prev) => ({ ...prev, addresses }));
    } catch (e: unknown) {
      console.error('Failed to refresh addresses:', e);
    }
  }, [state.connected, fetchAddresses]);

  // Sign a message with the user's private key (Schnorr signature)
  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!state.privateKey) {
        throw new Error('No private key available. Please connect wallet first.');
      }

      try {
        // Convert message to bytes and hash with SHA256
        // IMPORTANT: The backend verifies against SHA256(message), so we must
        // pre-hash the message before signing. The schnorr.sign() function
        // expects a 32-byte message hash for BIP340 compatibility.
        const messageBytes = new TextEncoder().encode(message);
        const messageHash = sha256(messageBytes);

        // Sign the message hash with Schnorr (BIP340)
        const privateKeyBytes = hexToBytes(state.privateKey);
        const signature = await schnorr.sign(messageHash, privateKeyBytes);

        return bytesToHex(signature);
      } catch (e) {
        console.error('Failed to sign message:', e);
        throw new Error('Failed to sign message');
      }
    },
    [state.privateKey]
  );

  // Auto-connect on mount
  useEffect(() => {
    connect();
  }, [connect]);

  // Auto-refresh balance every 30 seconds
  useEffect(() => {
    if (!state.connected) return;

    const interval = setInterval(refreshBalance, 30000);
    return () => clearInterval(interval);
  }, [state.connected, refreshBalance]);

  const value: WalletContextType = {
    ...state,
    connect,
    disconnect,
    refreshBalance,
    refreshAddresses,
    signMessage,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

// Helper hook to get just the pubkey (commonly needed)
export function useWalletPubkey(): string | null {
  const { pubkey, address, addresses } = useWallet();
  // Return pubkey if available, otherwise return first address as fallback
  return pubkey || address || (addresses?.[0] ?? null);
}

// Format balance for display
export function formatWalletBalance(sats: number): string {
  if (sats >= 100_000_000) {
    return `${(sats / 100_000_000).toFixed(4)} BTC`;
  }
  if (sats >= 1_000_000) {
    return `${(sats / 1_000_000).toFixed(2)}M sats`;
  }
  if (sats >= 1_000) {
    return `${(sats / 1_000).toFixed(1)}k sats`;
  }
  return `${sats} sats`;
}
