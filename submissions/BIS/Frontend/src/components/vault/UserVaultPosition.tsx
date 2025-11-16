'use client';

import { useAccount } from 'wagmi';
import { Wallet, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { useUserVaultPosition, useConvertToAssets } from '@/hooks/useVault';
import { formatUSDC, formatShares } from '@/hooks/useVaultTransactions';

export function UserVaultPosition() {
  const { address, isConnected } = useAccount();
  const { data: position, isLoading } = useUserVaultPosition();

  // Convert shares to USDC value
  const { data: shareValue } = useConvertToAssets(position?.shares);
  const { data: pendingDepositValue } = useConvertToAssets(
    position?.pendingDeposit ? position.pendingDeposit / 1000000n : undefined // Convert USDC to shares estimate
  );

  if (!isConnected) {
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

  if (isLoading) {
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
                <p className="text-lg font-bold text-white">
                  {formatUSDC(position.pendingDeposit)} USDC
                </p>
                <p className="text-xs text-yellow-500 mt-1">
                  Ready to claim after next rebalance
                </p>
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
                <p className="text-lg font-bold text-white">
                  {formatShares(position.pendingRedeem)} Shares
                </p>
                <p className="text-xs text-orange-500 mt-1">
                  Ready to claim after next rebalance
                </p>
              </div>
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
