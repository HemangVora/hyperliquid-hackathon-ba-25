'use client';

import { ReactNode, useState, useMemo } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { supportedChains } from '@/lib/chains';

// Get WalletConnect Project ID from environment
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

if (!projectId) {
  console.warn(
    'Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID. Get one from https://cloud.walletconnect.com/'
  );
}

/**
 * Custom emerald theme for RainbowKit matching the BIS brand colors
 * Based on the app's emerald-500 primary color (#10b981)
 */
const bisTheme = darkTheme({
  accentColor: '#10b981', // emerald-500 (primary app color)
  accentColorForeground: 'white',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
});

// Further customize the theme to match app aesthetics
const customBisTheme = {
  ...bisTheme,
  colors: {
    ...bisTheme.colors,
    // Modal background matching app's dark theme
    modalBackground: '#111827', // gray-900
    modalBorder: '#1f2937', // gray-800

    // Buttons and accents
    accentColor: '#10b981', // emerald-500
    accentColorForeground: '#ffffff',

    // Action buttons
    actionButtonBorder: '#10b981',
    actionButtonBorderMobile: '#10b981',
    actionButtonSecondaryBackground: '#065f46', // emerald-900

    // Connect button
    connectButtonBackground: '#10b981',
    connectButtonBackgroundError: '#ef4444', // red-500
    connectButtonInnerBackground: '#059669', // emerald-600
    connectButtonText: '#ffffff',
    connectButtonTextError: '#ffffff',

    // General colors
    closeButton: '#9ca3af', // gray-400
    closeButtonBackground: '#1f2937', // gray-800

    // Connection indicator
    connectionIndicator: '#10b981',

    // Download options
    downloadBottomCardBackground: '#1f2937',
    downloadTopCardBackground: '#111827',

    // Error state
    error: '#ef4444', // red-500

    // General borders and backgrounds
    generalBorder: '#374151', // gray-700
    generalBorderDim: '#1f2937', // gray-800

    // Hover states
    menuItemBackground: '#1f2937',

    // Modal colors
    modalBackdrop: 'rgba(0, 0, 0, 0.7)',
    modalText: '#f3f4f6', // gray-100
    modalTextDim: '#9ca3af', // gray-400
    modalTextSecondary: '#d1d5db', // gray-300

    // Profile colors
    profileAction: '#10b981',
    profileActionHover: '#059669', // emerald-600
    profileForeground: '#1f2937',

    // Selected option
    selectedOptionBorder: '#10b981',

    // Standby
    standby: '#6b7280', // gray-500
  },
  fonts: {
    body: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  radii: {
    actionButton: '0.5rem', // Matching app's rounded-lg
    connectButton: '0.5rem',
    menuButton: '0.5rem',
    modal: '0.75rem', // Slightly larger for modals
    modalMobile: '0.75rem',
  },
  shadows: {
    connectButton: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    dialog: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    profileDetailsAction: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    selectedOption: '0 0 0 3px rgba(16, 185, 129, 0.1)', // emerald glow
    selectedWallet: '0 0 0 3px rgba(16, 185, 129, 0.15)',
    walletLogo: '0 0 0 1px rgba(255, 255, 255, 0.02)',
  },
};

interface Web3ProviderProps {
  children: ReactNode;
}

/**
 * Web3Provider wraps the app with necessary providers for wallet connections
 *
 * This includes:
 * - Wagmi: Core Web3 functionality and hooks
 * - RainbowKit: Beautiful wallet connection UI
 * - TanStack Query: Data fetching and caching for Wagmi
 *
 * Usage: Wrap your root layout with this provider
 */
export function Web3Provider({ children }: Web3ProviderProps) {
  // Create React Query client once per component instance
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 3,
            staleTime: 30000, // 30 seconds
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  // Create wagmi config once per component instance to prevent multiple WalletConnect initializations
  // Using useMemo with empty deps ensures config is created only once when component mounts
  const config = useMemo(
    () =>
      getDefaultConfig({
        appName: 'BIS Yield Optimizer',
        projectId,
        chains: supportedChains,
        ssr: true, // Enable server-side rendering support
      }),
    [] // Empty dependency array - config should never change
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={customBisTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
