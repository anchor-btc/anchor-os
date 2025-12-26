'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

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
}

export interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  refreshAddresses: () => Promise<void>;
}

const defaultState: WalletState = {
  connected: false,
  connecting: false,
  error: null,
  address: null,
  addresses: null,
  balance: null,
  pubkey: null,
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const STORAGE_KEY = 'anchor-predictions-wallet-address';

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

      setState({
        connected: true,
        connecting: false,
        error: null,
        address,
        addresses,
        balance,
        pubkey: null,
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
