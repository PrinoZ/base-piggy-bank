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
import { injected } from '@wagmi/connectors';
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

// Create a custom connector that wraps injected connector but checks Farcaster first
export const farcasterMiniApp: CreateConnectorFn = (config: any) => {
  // Use injected connector as base, but check for Farcaster provider first
  const injectedConnector = injected()(config);
  
  return {
    ...injectedConnector,
    id: 'farcaster',
    name: 'Farcaster Wallet',
    async connect(parameters: any) {
      // Try to get Farcaster provider first
      const provider = await getFarcasterProvider();
      if (provider) {
        // Provider is available, use injected connector
        return injectedConnector.connect(parameters);
      }
      // Not in Farcaster environment, let injected connector handle it
      return injectedConnector.connect(parameters);
    },
    async getAccounts() {
      const provider = await getFarcasterProvider();
      if (provider && provider.selectedAddress) {
        return [provider.selectedAddress];
      }
      return injectedConnector.getAccounts();
    },
    async isAuthorized() {
      const provider = await getFarcasterProvider();
      if (provider && provider.selectedAddress) {
        return true;
      }
      return injectedConnector.isAuthorized();
    },
  };
};

