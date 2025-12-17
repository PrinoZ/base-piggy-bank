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
        
        if (!sdk) {
          console.log('Farcaster SDK not available');
          setAttempted(true);
          return;
        }

        // Check capabilities first (if available)
        let hasWalletCapability = false;
        if (sdk.getCapabilities) {
          try {
            const caps = await sdk.getCapabilities();
            hasWalletCapability = caps?.includes?.('wallet.getEthereumProvider') || 
                                  caps?.includes?.('wallet') ||
                                  false;
            console.log('Farcaster capabilities:', caps);
          } catch (e) {
            console.warn('Failed to get capabilities:', e);
          }
        }

        // Try multiple API paths for wallet provider
        let provider: any = null;
        
        // Path 1: sdk.wallet.getEthereumProvider()
        if (sdk?.wallet?.getEthereumProvider) {
          try {
            provider = await sdk.wallet.getEthereumProvider();
            console.log('Got provider via sdk.wallet.getEthereumProvider');
          } catch (e) {
            console.warn('sdk.wallet.getEthereumProvider failed:', e);
          }
        }
        
        // Path 2: sdk.actions.getEthereumProvider()
        if (!provider && sdk?.actions?.getEthereumProvider) {
          try {
            provider = await sdk.actions.getEthereumProvider();
            console.log('Got provider via sdk.actions.getEthereumProvider');
          } catch (e) {
            console.warn('sdk.actions.getEthereumProvider failed:', e);
          }
        }
        
        // Path 3: sdk.getEthereumProvider()
        if (!provider && sdk?.getEthereumProvider) {
          try {
            provider = await sdk.getEthereumProvider();
            console.log('Got provider via sdk.getEthereumProvider');
          } catch (e) {
            console.warn('sdk.getEthereumProvider failed:', e);
          }
        }

        if (provider) {
          console.log('Farcaster wallet provider detected:', {
            selectedAddress: provider.selectedAddress,
            isConnected: provider.selectedAddress ? true : false,
          });

          // CRITICAL: Inject provider into window.ethereum so Wagmi can detect it
          // @ts-ignore
          if (!window.ethereum) {
            // @ts-ignore
            window.ethereum = provider;
            console.log('Injected Farcaster provider into window.ethereum');
          }

          // Try to connect using injected connector
          // Wait a bit for window.ethereum to be recognized
          setTimeout(() => {
            const injectedConnector = connectors.find((c: any) => 
              c.id === 'injected' || 
              c.id === 'metaMask' ||
              c.name?.toLowerCase().includes('injected')
            );
            
            if (injectedConnector && provider.selectedAddress) {
              try {
                connect({ connector: injectedConnector });
                console.log('Attempting to connect via Farcaster wallet');
              } catch (e) {
                console.warn('Failed to auto-connect Farcaster wallet:', e);
              }
            } else {
              console.log('No suitable connector found or wallet not connected');
            }
          }, 500);
        } else {
          console.log('Farcaster wallet provider not available');
        }
        
        // Try Base App wallet (similar API)
        // @ts-ignore
        if (window?.base?.wallet?.getEthereumProvider) {
          try {
            // @ts-ignore
            const baseProvider = await window.base.wallet.getEthereumProvider();
            if (baseProvider && baseProvider.selectedAddress) {
              console.log('Base App wallet detected:', baseProvider.selectedAddress);
              
              // Inject Base provider if Farcaster provider not available
              // @ts-ignore
              if (!window.ethereum) {
                // @ts-ignore
                window.ethereum = baseProvider;
                console.log('Injected Base provider into window.ethereum');
              }
              
              setTimeout(() => {
                const injectedConnector = connectors.find((c: any) => 
                  c.id === 'injected' || 
                  c.id === 'metaMask'
                );
                if (injectedConnector) {
                  try {
                    connect({ connector: injectedConnector });
                  } catch (e) {
                    console.warn('Failed to auto-connect Base wallet:', e);
                  }
                }
              }, 500);
            }
          } catch (e) {
            console.warn('Base wallet detection failed:', e);
          }
        }
      } catch (e) {
        // Not in Farcaster/Base environment, use standard flow
        console.log('Standard wallet connection flow', e);
      } finally {
        setAttempted(true);
      }
    };

    // Increase delay to ensure SDK is fully loaded
    const timer = setTimeout(tryFarcasterWallet, 1500);
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
