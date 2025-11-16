'use client';

import { useAccount } from 'wagmi';
import { Wallet, TrendingUp, Clock, DollarSign, CheckCircle, Loader2 } from 'lucide-react';
import { useUserVaultPosition, useConvertToAssets } from '@/hooks/useVault';
import { formatUSDC, formatShares, useClaimDeposit, useClaimRedeem, useActivateAll } from '@/hooks/useVaultTransactions';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function UserVaultPosition() {
  const { address, isConnected, isConnecting } = useAccount();
  const [isReady, setIsReady] = useState(false);

  // Claim hooks
  const claimDeposit = useClaimDeposit();
  const claimRedeem = useClaimRedeem();
  const activateAll = useActivateAll();

  // Wait for wallet to be fully connected before querying
  useEffect(() => {
    if (isConnected && address && !isConnecting) {
      // Small delay to ensure connection is stable
      const timer = setTimeout(() => setIsReady(true), 500);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [isConnected, address, isConnecting]);

  const { data: position, isLoading } = useUserVaultPosition(isReady);

  // Convert shares to USDC value (only when ready)
  const { data: shareValue } = useConvertToAssets(
    isReady && position?.shares ? position.shares : undefined
  );
  const { data: pendingDepositValue } = useConvertToAssets(
    isReady && position?.pendingDeposit ? position.pendingDeposit / 1000000n : undefined
  );

  // Handle claim deposit success
  useEffect(() => {
    if (claimDeposit.isSuccess) {
      toast.success('Deposit activated! Shares claimed successfully.');
    }
  }, [claimDeposit.isSuccess]);

  // Handle claim redeem success
  useEffect(() => {
    if (claimRedeem.isSuccess) {
      toast.success('Withdrawal activated! USDC claimed successfully.');
    }
  }, [claimRedeem.isSuccess]);

  // Handle activate all success
  useEffect(() => {
    if (activateAll.isSuccess) {
      toast.success('All claims activated successfully!');
    }
  }, [activateAll.isSuccess]);

  // Handle errors
  useEffect(() => {
    if (claimDeposit.error) {
      toast.error('Failed to activate deposit. Please try again.');
    }
    if (claimRedeem.error) {
      toast.error('Failed to activate withdrawal. Please try again.');
    }
    if (activateAll.error) {
      toast.error('Failed to activate all claims. Please try again.');
    }
  }, [claimDeposit.error, claimRedeem.error, activateAll.error]);

  // Handler functions
  const handleActivateDeposit = async () => {
    try {
      await claimDeposit.claimDeposit();
    } catch (error) {
      console.error('Error claiming deposit:', error);
    }
  };

  const handleActivateRedeem = async () => {
    try {
      await claimRedeem.claimRedeem();
    } catch (error) {
      console.error('Error claiming redeem:', error);
    }
  };

  const handleActivateAll = async () => {
    try {
      const hasPendingDeposit = position && position.pendingDeposit > 0n;
      const hasPendingRedeem = position && position.pendingRedeem > 0n;
      await activateAll.activateAll(!!hasPendingDeposit, !!hasPendingRedeem);
    } catch (error) {
      console.error('Error activating all:', error);
    }
  };

  if (!isConnected || isConnecting) {
    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Wallet className="w-6 h-6 text-emerald-500" />
          <h3 className="text-lg font-semibold text-white">Your Position</h3>
        </div>
        <p className="text-gray-400 text-center py-4">
          Connect your wallet to view your position
        </p>
      </div>
    );
  }

  if (isLoading || !isReady) {
    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Wallet className="w-6 h-6 text-emerald-500" />
          <h3 className="text-lg font-semibold text-white">Your Position</h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-gray-700/50 rounded"></div>
          <div className="h-16 bg-gray-700/50 rounded"></div>
        </div>
      </div>
    );
  }

  const hasPosition = position && (
    position.shares > 0n ||
    position.pendingDeposit > 0n ||
    position.pendingRedeem > 0n
  );

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Wallet className="w-6 h-6 text-emerald-500" />
        <h3 className="text-lg font-semibold text-white">Your Position</h3>
      </div>

      {!hasPosition ? (
        <p className="text-gray-400 text-center py-4">
          No active position. Deposit USDC to get started!
        </p>
      ) : (
        <div className="space-y-4">
          {/* Active Position */}
          {position.shares > 0n && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400 font-medium">Active Position</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Shares Owned</p>
                  <p className="text-lg font-bold text-white">
                    {formatShares(position.shares)}
                  </p>
                  <p className="text-xs text-gray-500">BIS-YO</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Current Value</p>
                  <p className="text-lg font-bold text-white">
                    ${shareValue ? formatUSDC(shareValue) : '0.00'}
                  </p>
                  <p className="text-xs text-gray-500">USDC</p>
                </div>
              </div>
            </div>
          )}

          {/* Pending Deposit */}
          {position.pendingDeposit > 0n && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-yellow-400 font-medium">Pending Deposit</span>
                </div>
              </div>
              <div>
                <p className="text-lg font-bold text-white mb-1">
                  {formatUSDC(position.pendingDeposit)} USDC
                </p>
                <p className="text-xs text-yellow-500 mb-3">
                  Ready to claim after next rebalance
                </p>
                <button
                  onClick={handleActivateDeposit}
                  disabled={claimDeposit.isPending || claimDeposit.isConfirming}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {claimDeposit.isPending || claimDeposit.isConfirming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Activating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Activate Deposit</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Pending Withdrawal */}
          {position.pendingRedeem > 0n && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-orange-400 font-medium">Pending Withdrawal</span>
                </div>
              </div>
              <div>
                <p className="text-lg font-bold text-white mb-1">
                  {formatShares(position.pendingRedeem)} Shares
                </p>
                <p className="text-xs text-orange-500 mb-3">
                  Ready to claim after next rebalance
                </p>
                <button
                  onClick={handleActivateRedeem}
                  disabled={claimRedeem.isPending || claimRedeem.isConfirming}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {claimRedeem.isPending || claimRedeem.isConfirming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Activating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Activate Withdrawal</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Activate All Button - Shows when both deposit and withdrawal are pending */}
          {position.pendingDeposit > 0n && position.pendingRedeem > 0n && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-sm text-emerald-400 font-medium">Quick Action</span>
              </div>
              <button
                onClick={handleActivateAll}
                disabled={activateAll.isPending || activateAll.isConfirming}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {activateAll.isPending || activateAll.isConfirming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Activating All...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Activate All Claims</span>
                  </>
                )}
              </button>
              <p className="text-xs text-emerald-400 mt-2 text-center">
                Claim both deposit and withdrawal in one transaction
              </p>
            </div>
          )}

          {/* USDC Balance */}
          <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Wallet Balance</span>
            </div>
            <p className="text-lg font-bold text-white">
              {position.usdcBalance ? formatUSDC(position.usdcBalance) : '0.00'} USDC
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
