/**
 * Smart Contract Addresses on HyperLiquid Mainnet
 */

export const CONTRACTS = {
  USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`,
  YIELD_OPTIMIZER: process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}`,
} as const;

// Validate addresses are set
if (!CONTRACTS.USDC || !CONTRACTS.YIELD_OPTIMIZER) {
  throw new Error(
    'Missing contract addresses. Please set NEXT_PUBLIC_USDC_ADDRESS and NEXT_PUBLIC_VAULT_ADDRESS in .env.local'
  );
}

export default CONTRACTS;
