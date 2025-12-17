'use client';

import * as React from 'react';
import {
  RainbowKitProvider,
  getDefaultWallets,
  connectorsForWallets,
} from '@rainbow-me/rainbowkit';
import {
  trustWallet,
  ledgerWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http, createConfig } from 'wagmi';
import { farcasterMiniApp } from '@/lib/farcaster-connector';
import '@rainbow-me/rainbowkit/styles.css';

// WalletConnect / Reown Project ID (public)
// Prefer env in production, but keep a fallback to avoid breaking embeds/preview environments.
const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || '217245ec2cae6778a51d6168f3e098ea';

// IMPORTANT:
// If WalletConnect/Reown blocks the origin (403 allowlist), it can break the embedded Base.dev/Base App experience.
// Fix via Reown Cloud Domain allowlist (not code).

// Create config with connectors prioritized for different environments
// Priority: Farcaster > Injected (Base App/standard wallets) > Other wallets
// 
// Note: 
// - Farcaster connector will auto-connect in Farcaster/Warpcast if wallet is connected
// - Base App typically injects wallet into window.ethereum, so injected() will work
// - If Farcaster connector doesn't work (not in Farcaster env), it will gracefully fail
//   and fallback to other connectors
// Get default wallets from RainbowKit (includes MetaMask, WalletConnect, Coinbase, etc.)
const { wallets: defaultWalletGroups } = getDefaultWallets({
  appName: 'Base Piggy Bank',
  projectId: wcProjectId,
});

// Add extra wallets (optional)
const walletGroups = [
  ...defaultWalletGroups,
  {
    groupName: 'Other',
    wallets: [trustWallet, ledgerWallet],
  },
];

// Create connectors array with Farcaster connector first, then RainbowKit wallets
// RainbowKit wallets already include injected connector support
const rainbowKitConnectors = connectorsForWallets(walletGroups as any, {
  appName: 'Base Piggy Bank',
  projectId: wcProjectId,
});

const connectors = [
  // 1) Farcaster connector (auto-connect in Farcaster if wallet is already connected)
  farcasterMiniApp(),
  // 2) RainbowKit connectors (injected, WalletConnect, Coinbase, etc.)
  ...rainbowKitConnectors,
];

const config = createConfig({
  chains: [base] as const,
  transports: {
    [base.id]: http(),
  },
  connectors,
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
