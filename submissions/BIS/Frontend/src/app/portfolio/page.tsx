'use client';

import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PortfolioSummary from '@/components/portfolio/PortfolioSummary';
import { UserVaultPosition } from '@/components/vault/UserVaultPosition';
import { TransactionHistory } from '@/components/vault/TransactionHistory';
import { useUserVaultPosition, useVaultStats, useConvertToAssets } from '@/hooks/useVault';
import { formatUSDC } from '@/hooks/useVaultTransactions';
import { Wallet } from 'lucide-react';

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();

  // Fetch user's vault position and vault stats
  const { data: position, isLoading: positionLoading } = useUserVaultPosition();
  const { data: vaultStats, isLoading: statsLoading } = useVaultStats();

  // Convert shares to USDC value
  const { data: portfolioValue } = useConvertToAssets(position?.shares);

  // Calculate portfolio metrics
  const metrics = useMemo(() => {
    if (!position || !vaultStats || !portfolioValue) {
      return {
        totalValue: 0,
        averageAPY: 0,
        poolCount: 0,
      };
    }

    // For now, we show the vault as a single "pool"
    // In the future, this could show breakdown by underlying GlueX vaults
    return {
      totalValue: Number(portfolioValue) / 1e6, // Convert to USDC decimals
      averageAPY: 0, // This would need historical data to calculate
      poolCount: position.shares > 0n ? 1 : 0,
    };
  }, [position, vaultStats, portfolioValue]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Portfolio</h1>
          <p className="text-gray-400">
            Monitor your vault position and track your earnings
          </p>
        </div>

        {/* Not Connected State */}
        {!isConnected && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Wallet className="w-16 h-16 text-gray-600 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                Connect Your Wallet
              </h2>
              <p className="text-gray-400 max-w-md">
                Connect your wallet to view your portfolio, track your vault position, and see your transaction history.
              </p>
            </div>
          </div>
        )}

        {/* Connected - Show Portfolio */}
        {isConnected && (
          <>
            {/* Portfolio Summary */}
            <PortfolioSummary
              totalValue={metrics.totalValue}
              averageAPY={metrics.averageAPY}
              poolCount={metrics.poolCount}
            />

            {/* User Position */}
            <UserVaultPosition />

            {/* Vault Stats */}
            {vaultStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <p className="text-sm text-gray-400 mb-1">Vault TVL</p>
                  <p className="text-2xl font-bold text-white">
                    ${formatUSDC(vaultStats.totalAssets)}
                  </p>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <p className="text-sm text-gray-400 mb-1">Share Price</p>
                  <p className="text-2xl font-bold text-white">
                    ${formatUSDC((vaultStats.sharePrice * 1000000n) / 10n ** 18n)}
                  </p>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <p className="text-sm text-gray-400 mb-1">Performance Fee</p>
                  <p className="text-2xl font-bold text-white">
                    {Number(vaultStats.performanceFee) / 100}%
                  </p>
                </div>
              </div>
            )}

            {/* Transaction History */}
            <TransactionHistory />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
