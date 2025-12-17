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

// Create a custom connector that detects Farcaster wallet provider
// This connector will work in Farcaster/Warpcast environments
export const farcasterMiniApp: CreateConnectorFn = (config: any) => {
  return createConnector((connectorConfig) => ({
    id: 'farcaster',
    name: 'Farcaster Wallet',
    type: 'injected',
    async connect(parameters: any) {
      // Try to get Farcaster provider
      const provider = await getFarcasterProvider();
      if (!provider) {
        throw new Error('Farcaster wallet not available');
      }

      // Request account access
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
      });

      return {
        accounts: accounts.map((account: string) => account as `0x${string}`),
        chainId: await provider.request({ method: 'eth_chainId' }).then((id: string) => Number(id)),
      };
    },
    async disconnect() {
      // Farcaster wallet doesn't support disconnect
    },
    async getAccounts() {
      const provider = await getFarcasterProvider();
      if (provider && provider.selectedAddress) {
        return [provider.selectedAddress as `0x${string}`];
      }
      return [];
    },
    async getChainId() {
      const provider = await getFarcasterProvider();
      if (provider) {
        const chainId = await provider.request({ method: 'eth_chainId' });
        return Number(chainId);
      }
      return connectorConfig.chains[0]?.id || 8453;
    },
    async isAuthorized() {
      const provider = await getFarcasterProvider();
      return !!(provider && provider.selectedAddress);
    },
    onAccountsChanged(accounts) {
      // Handle account changes
    },
    onChainChanged(chainId) {
      // Handle chain changes
    },
  }))(config);
};

