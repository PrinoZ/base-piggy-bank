'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  RainbowKitProvider,
  getDefaultWallets,
  getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import {
  trustWallet,
  ledgerWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http, useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import '@rainbow-me/rainbowkit/styles.css';

const { wallets } = getDefaultWallets();

// WalletConnect / Reown Project ID (public)
// Prefer env in production, but keep a fallback to avoid breaking embeds/preview environments.
const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || '217245ec2cae6778a51d6168f3e098ea';

// IMPORTANT:
// If WalletConnect/Reown blocks the origin (403 allowlist), it can break the embedded Base.dev/Base App experience.
// Fix via Reown Cloud Domain allowlist (not code).

const config = getDefaultConfig({
  appName: 'Base Piggy Bank',
  projectId: wcProjectId || '217245ec2cae6778a51d6168f3e098ea',
  wallets: [
    ...wallets,
    {
      groupName: 'Other',
      wallets: [trustWallet, ledgerWallet],
    },
  ],
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

// Component to handle Farcaster wallet auto-connection
// Must be inside WagmiProvider to use hooks
function FarcasterWalletConnector() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (isConnected || attempted) return;

    const tryFarcasterWallet = async () => {
      try {
        // Try Farcaster Frame SDK
        const mod: any = await import('@farcaster/frame-sdk');
        const sdk = mod?.sdk || mod?.default?.sdk || mod?.default || mod;
        
        if (sdk?.wallet?.getEthereumProvider) {
          const provider = await sdk.wallet.getEthereumProvider();
          if (provider && provider.selectedAddress) {
            // Farcaster wallet is available and connected
            console.log('Farcaster wallet detected:', provider.selectedAddress);
            
            // Try to connect using injected connector if available
            const injectedConnector = connectors.find((c: any) => c.id === 'injected' || c.id === 'metaMask');
            if (injectedConnector) {
              try {
                connect({ connector: injectedConnector });
                console.log('Attempting to connect via Farcaster wallet');
              } catch (e) {
                console.warn('Failed to auto-connect Farcaster wallet:', e);
              }
            }
          }
        }
        
        // Try Base App wallet (similar API)
        // @ts-ignore
        if (window?.base?.wallet?.getEthereumProvider) {
          // @ts-ignore
          const provider = await window.base.wallet.getEthereumProvider();
          if (provider && provider.selectedAddress) {
            console.log('Base App wallet detected:', provider.selectedAddress);
            const injectedConnector = connectors.find((c: any) => c.id === 'injected' || c.id === 'metaMask');
            if (injectedConnector) {
              try {
                connect({ connector: injectedConnector });
              } catch (e) {
                console.warn('Failed to auto-connect Base wallet:', e);
              }
            }
          }
        }
      } catch (e) {
        // Not in Farcaster/Base environment, use standard flow
        console.log('Standard wallet connection flow');
      } finally {
        setAttempted(true);
      }
    };

    // Delay slightly to ensure SDK is loaded
    const timer = setTimeout(tryFarcasterWallet, 1000);
    return () => clearTimeout(timer);
  }, [isConnected, attempted, connect, connectors]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <FarcasterWalletConnector />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
