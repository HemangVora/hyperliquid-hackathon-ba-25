import { Chain } from 'viem';

/**
 * HyperLiquid (HyperEVM) mainnet configuration
 *
 * Official network details:
 * - Chain ID: 999
 * - RPC URL: https://rpc.hyperliquid.xyz/evm
 * - Explorer: https://explorer.hyperliquid.xyz
 * - Native Currency: HYPE
 */
export const hyperLiquid: Chain = {
  id: 999,
  name: 'Hyperliquid',
  nativeCurrency: {
    decimals: 18,
    name: 'HYPE',
    symbol: 'HYPE',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.hyperliquid.xyz/evm'],
    },
    public: {
      http: ['https://rpc.hyperliquid.xyz/evm'],
    },
  },
  blockExplorers: {
    default: {
      name: 'HyperLiquid Explorer',
      url: 'https://explorer.hyperliquid.xyz',
    },
  },
  testnet: false,
};

/**
 * HyperLiquid (HyperEVM) testnet configuration
 *
 * Testnet details:
 * - Chain ID: 998
 * - For development and testing purposes
 */
export const hyperLiquidTestnet: Chain = {
  id: 998,
  name: 'Hyperliquid Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'HYPE',
    symbol: 'HYPE',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.hyperliquid-testnet.xyz/evm'],
    },
    public: {
      http: ['https://rpc.hyperliquid-testnet.xyz/evm'],
    },
  },
  blockExplorers: {
    default: {
      name: 'HyperLiquid Testnet Explorer',
      url: 'https://explorer.hyperliquid-testnet.xyz',
    },
  },
  testnet: true,
};

// Export the chains array for Wagmi configuration
export const supportedChains = [hyperLiquid] as const;
