/**
 * Vault transaction hooks
 * These hooks handle write operations (transactions) with the YieldOptimizer contract
 */

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS, YieldOptimizerABI, ERC20ABI } from '@/contracts';
import { parseUnits, maxUint256 } from 'viem';

/**
 * Approve USDC spending for the vault
 * @param amount - Amount to approve (defaults to max uint256 for unlimited approval)
 */
export function useApproveUSDC() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const approve = async (amount?: bigint) => {
    return writeContract({
      address: CONTRACTS.USDC,
      abi: ERC20ABI,
      functionName: 'approve',
      args: [CONTRACTS.YIELD_OPTIMIZER, amount || maxUint256],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Request a deposit (step 1 of async deposit)
 */
export function useRequestDeposit() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const requestDeposit = async (assets: bigint) => {
    return writeContract({
      address: CONTRACTS.YIELD_OPTIMIZER,
      abi: YieldOptimizerABI,
      functionName: 'requestDeposit',
      args: [assets],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    requestDeposit,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Claim deposited shares (step 2 of async deposit)
 */
export function useClaimDeposit() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const claimDeposit = async () => {
    return writeContract({
      address: CONTRACTS.YIELD_OPTIMIZER,
      abi: YieldOptimizerABI,
      functionName: 'claimDeposit',
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    claimDeposit,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Request a redemption (step 1 of async withdraw)
 */
export function useRequestRedeem() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const requestRedeem = async (shares: bigint) => {
    return writeContract({
      address: CONTRACTS.YIELD_OPTIMIZER,
      abi: YieldOptimizerABI,
      functionName: 'requestRedeem',
      args: [shares],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    requestRedeem,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Claim redeemed USDC (step 2 of async withdraw)
 */
export function useClaimRedeem() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const claimRedeem = async () => {
    return writeContract({
      address: CONTRACTS.YIELD_OPTIMIZER,
      abi: YieldOptimizerABI,
      functionName: 'claimRedeem',
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    claimRedeem,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Helper to parse USDC amount (6 decimals) from string
 */
export function parseUSDC(amount: string): bigint {
  return parseUnits(amount, 6);
}

/**
 * Helper to format USDC amount (6 decimals) to string
 */
export function formatUSDC(amount: bigint): string {
  return (Number(amount) / 1e6).toFixed(2);
}

/**
 * Helper to format shares (18 decimals) to string
 */
export function formatShares(shares: bigint): string {
  return (Number(shares) / 1e18).toFixed(6);
}
