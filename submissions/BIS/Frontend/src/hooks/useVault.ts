/**
 * Vault contract read hooks
 * These hooks fetch data from the YieldOptimizer contract
 */

import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { CONTRACTS, YieldOptimizerABI, ERC20ABI } from '@/contracts';

/**
 * Get user's vault share balance
 */
export function useUserShares() {
  const { address } = useAccount();

  return useReadContract({
    address: CONTRACTS.YIELD_OPTIMIZER,
    abi: YieldOptimizerABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });
}

/**
 * Get user's pending deposit request amount
 */
export function useUserPendingDeposit() {
  const { address } = useAccount();

  return useReadContract({
    address: CONTRACTS.YIELD_OPTIMIZER,
    abi: YieldOptimizerABI,
    functionName: 'pendingDepositRequests',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    },
  });
}

/**
 * Get user's pending redeem request amount
 */
export function useUserPendingRedeem() {
  const { address } = useAccount();

  return useReadContract({
    address: CONTRACTS.YIELD_OPTIMIZER,
    abi: YieldOptimizerABI,
    functionName: 'pendingRedeemRequests',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    },
  });
}

/**
 * Get total assets under management in the vault
 */
export function useVaultTotalAssets() {
  return useReadContract({
    address: CONTRACTS.YIELD_OPTIMIZER,
    abi: YieldOptimizerABI,
    functionName: 'totalAssets',
    query: {
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });
}

/**
 * Get vault total supply (total shares)
 */
export function useVaultTotalSupply() {
  return useReadContract({
    address: CONTRACTS.YIELD_OPTIMIZER,
    abi: YieldOptimizerABI,
    functionName: 'totalSupply',
    query: {
      refetchInterval: 30000,
    },
  });
}

/**
 * Get current epoch
 */
export function useVaultEpoch() {
  return useReadContract({
    address: CONTRACTS.YIELD_OPTIMIZER,
    abi: YieldOptimizerABI,
    functionName: 'currentEpoch',
    query: {
      refetchInterval: 60000, // Refetch every minute
    },
  });
}

/**
 * Convert assets (USDC) to vault shares
 */
export function useConvertToShares(assets: bigint | undefined) {
  return useReadContract({
    address: CONTRACTS.YIELD_OPTIMIZER,
    abi: YieldOptimizerABI,
    functionName: 'convertToShares',
    args: assets ? [assets] : undefined,
    query: {
      enabled: !!assets && assets > 0n,
    },
  });
}

/**
 * Convert vault shares to assets (USDC)
 */
export function useConvertToAssets(shares: bigint | undefined) {
  return useReadContract({
    address: CONTRACTS.YIELD_OPTIMIZER,
    abi: YieldOptimizerABI,
    functionName: 'convertToAssets',
    args: shares ? [shares] : undefined,
    query: {
      enabled: !!shares && shares > 0n,
    },
  });
}

/**
 * Get user's USDC balance
 */
export function useUSDCBalance() {
  const { address } = useAccount();

  return useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    },
  });
}

/**
 * Get user's USDC allowance for the vault
 */
export function useUSDCAllowance() {
  const { address } = useAccount();

  return useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.YIELD_OPTIMIZER] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    },
  });
}

/**
 * Get comprehensive vault statistics
 */
export function useVaultStats() {
  const { data, isLoading, error } = useReadContracts({
    contracts: [
      {
        address: CONTRACTS.YIELD_OPTIMIZER,
        abi: YieldOptimizerABI,
        functionName: 'totalAssets',
      },
      {
        address: CONTRACTS.YIELD_OPTIMIZER,
        abi: YieldOptimizerABI,
        functionName: 'totalSupply',
      },
      {
        address: CONTRACTS.YIELD_OPTIMIZER,
        abi: YieldOptimizerABI,
        functionName: 'performanceFee',
      },
      {
        address: CONTRACTS.YIELD_OPTIMIZER,
        abi: YieldOptimizerABI,
        functionName: 'currentEpoch',
      },
    ],
    query: {
      refetchInterval: 30000,
    },
  });

  const stats = data
    ? {
        totalAssets: data[0].result as bigint,
        totalSupply: data[1].result as bigint,
        performanceFee: data[2].result as bigint,
        currentEpoch: data[3].result as bigint,
        sharePrice:
          (data[1].result as bigint) > 0n
            ? ((data[0].result as bigint) * 10n ** 18n) /
              (data[1].result as bigint)
            : 10n ** 18n,
      }
    : null;

  return { data: stats, isLoading, error };
}

/**
 * Get user's complete vault position
 * @param enabled - Whether to enable the query (default: true when address exists)
 */
export function useUserVaultPosition(enabled: boolean = true) {
  const { address } = useAccount();

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      {
        address: CONTRACTS.YIELD_OPTIMIZER,
        abi: YieldOptimizerABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACTS.YIELD_OPTIMIZER,
        abi: YieldOptimizerABI,
        functionName: 'pendingDepositRequests',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACTS.YIELD_OPTIMIZER,
        abi: YieldOptimizerABI,
        functionName: 'pendingRedeemRequests',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACTS.USDC,
        abi: ERC20ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
      },
      {
        address: CONTRACTS.USDC,
        abi: ERC20ABI,
        functionName: 'allowance',
        args: address ? [address, CONTRACTS.YIELD_OPTIMIZER] : undefined,
      },
    ],
    query: {
      enabled: !!address && enabled && !!CONTRACTS.YIELD_OPTIMIZER && !!CONTRACTS.USDC,
      refetchInterval: 10000,
      retry: 3,
      retryDelay: 1000,
    },
  });

  const position = data
    ? {
        shares: data[0].result as bigint,
        pendingDeposit: data[1].result as bigint,
        pendingRedeem: data[2].result as bigint,
        usdcBalance: data[3].result as bigint,
        usdcAllowance: data[4].result as bigint,
      }
    : null;

  return { data: position, isLoading, error, refetch };
}
