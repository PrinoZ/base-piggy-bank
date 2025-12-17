/**
 * Custom Farcaster Mini App connector for Wagmi
 * 
 * This connector detects Farcaster SDK and automatically connects if a wallet is available.
 * Based on Farcaster docs: https://miniapps.farcaster.xyz/docs/guides/wallets
 * 
 * Since @farcaster/miniapp-wagmi-connector may not be published yet,
 * we create a custom connector that wraps injected() but checks Farcaster SDK first.
 */

import { createConnector } from 'wagmi';
import type { CreateConnectorFn } from 'wagmi';

// Helper to get Farcaster wallet provider
async function getFarcasterProvider(): Promise<any> {
  try {
    // Dynamic import to avoid SSR issues
    const mod: any = await import('@farcaster/frame-sdk');
    const sdk = mod?.sdk || mod?.default?.sdk || mod?.default || mod;
    
    if (sdk?.wallet?.getEthereumProvider) {
      const provider = await sdk.wallet.getEthereumProvider();
      if (provider) {
        // Inject provider into window.ethereum so injected connector can use it
        if (typeof window !== 'undefined' && !(window as any).ethereum) {
          (window as any).ethereum = provider;
        }
        return provider;
      }
    }
  } catch (e) {
    // Not in Farcaster environment
    return null;
  }
  return null;
}

/**
 * Farcaster Mini App connector factory (Wagmi v2 style).
 *
 * Usage:
 *   connectors: [ farcasterMiniApp(), injected(), ... ]
 */
export function farcasterMiniApp(): CreateConnectorFn {
  return (wagmiConfig: any) =>
    createConnector((connectorConfig: any) => ({
      id: 'farcaster',
      name: 'Farcaster Wallet',
      type: 'injected',
      async getProvider() {
        return await getFarcasterProvider();
      },
      async connect(_parameters: any) {
        const provider = await getFarcasterProvider();
        if (!provider) throw new Error('Farcaster wallet not available');

        // This will prompt ONLY if the user hasn't previously connected/authorized.
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        const chainIdHex = await provider.request({ method: 'eth_chainId' });

        return {
          accounts: (accounts || []).map((a: string) => a as `0x${string}`),
          chainId: typeof chainIdHex === 'string' ? Number(chainIdHex) : Number(chainIdHex),
        };
      },
      async disconnect() {
        // Farcaster wallet doesn't support disconnect
      },
      async getAccounts() {
        const provider = await getFarcasterProvider();
        if (!provider) return [];
        try {
          // Prefer EIP-1193 eth_accounts (does not prompt)
          const accounts = await provider.request({ method: 'eth_accounts' });
          if (Array.isArray(accounts) && accounts.length > 0) {
            return accounts.map((a: string) => a as `0x${string}`);
          }
        } catch {}
        // Fallback: some providers expose selectedAddress
        const selected = provider?.selectedAddress;
        return selected ? [selected as `0x${string}`] : [];
      },
      async getChainId() {
        const provider = await getFarcasterProvider();
        if (provider) {
          const chainIdHex = await provider.request({ method: 'eth_chainId' });
          return typeof chainIdHex === 'string' ? Number(chainIdHex) : Number(chainIdHex);
        }
        return connectorConfig?.chains?.[0]?.id || 8453;
      },
      async isAuthorized() {
        const provider = await getFarcasterProvider();
        if (!provider) return false;
        try {
          // EIP-1193 eth_accounts indicates whether the user already authorized this app.
          const accounts = await provider.request({ method: 'eth_accounts' });
          return Array.isArray(accounts) && accounts.length > 0;
        } catch {}
        return !!provider?.selectedAddress;
      },
      onAccountsChanged(_accounts: any) {},
      onChainChanged(_chainId: any) {},
      onDisconnect() {},
    }))(wagmiConfig);
}

