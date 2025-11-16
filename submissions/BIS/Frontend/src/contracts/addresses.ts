/**
 * Smart Contract Addresses on HyperLiquid Mainnet
 */

export const CONTRACTS = {
  USDC: (process.env.NEXT_PUBLIC_USDC_ADDRESS || '') as `0x${string}`,
  YIELD_OPTIMIZER: (process.env.NEXT_PUBLIC_VAULT_ADDRESS || '') as `0x${string}`,
} as const;

// Validate addresses are set (only warn, don't throw)
if (typeof window !== 'undefined') {
  if (!CONTRACTS.USDC || !CONTRACTS.YIELD_OPTIMIZER) {
    console.warn(
      'Missing contract addresses. Please set NEXT_PUBLIC_USDC_ADDRESS and NEXT_PUBLIC_VAULT_ADDRESS in .env.local'
    );
  }
}

export default CONTRACTS;
