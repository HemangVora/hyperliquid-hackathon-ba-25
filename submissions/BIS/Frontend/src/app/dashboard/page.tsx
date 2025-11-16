'use client';

import { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PortfolioSummary from '@/components/portfolio/PortfolioSummary';
import PoolsTable from '@/components/portfolio/PoolsTable';
import { ChainSelector } from '@/components/ui/ChainSelector';
import { DepositModal } from '@/components/vault/DepositModal';
import { WithdrawModal } from '@/components/vault/WithdrawModal';
import { UserVaultPosition } from '@/components/vault/UserVaultPosition';
import ErrorBoundary from '@/components/ErrorBoundary';
import { usePoolData } from '@/hooks/usePoolData';
import { useAccount } from 'wagmi';
import { calculateTotalTVL, calculateWeightedAverageAPY } from '@/lib/api/pools';
import { LayoutGrid, Table, RefreshCw, Plus, Minus, CheckCircle, Loader2 } from 'lucide-react';
import { useUserVaultPosition } from '@/hooks/useVault';
import { useClaimDeposit, useClaimRedeem, useActivateAll } from '@/hooks/useVaultTransactions';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { isConnected, address, isConnecting } = useAccount();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Wait for wallet to be fully connected before querying
  useEffect(() => {
    if (isConnected && address && !isConnecting) {
      const timer = setTimeout(() => setIsReady(true), 500);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [isConnected, address, isConnecting]);

  // Fetch pool data with auto-refresh
  const { pools, loading, error, refetch, lastUpdated } = usePoolData(
    { chain: selectedChain || undefined, limit: 100 },
    { autoRefresh: true }
  );

  // Get user vault position for activation buttons
  const { data: position } = useUserVaultPosition(isReady);

  // Claim hooks
  const claimDeposit = useClaimDeposit();
  const claimRedeem = useClaimRedeem();
  const activateAll = useActivateAll();

  // Calculate aggregate statistics
  const stats = useMemo(() => {
    const totalTVL = calculateTotalTVL(pools);
    const averageAPY = calculateWeightedAverageAPY(pools);

    return {
      totalTVL,
      averageAPY,
      poolCount: pools.length,
    };
  }, [pools]);

  // Determine which activation button to show
  const hasPendingDeposit = position && position.pendingDeposit > 0n;
  const hasPendingRedeem = position && position.pendingRedeem > 0n;
  const showActivateAll = hasPendingDeposit && hasPendingRedeem;
  const showActivateDeposit = hasPendingDeposit && !hasPendingRedeem;
  const showActivateRedeem = hasPendingRedeem && !hasPendingDeposit;

  // Success handlers
  useEffect(() => {
    if (claimDeposit.isSuccess) {
      toast.success('Deposit activated! Shares claimed successfully.');
    }
  }, [claimDeposit.isSuccess]);

  useEffect(() => {
    if (claimRedeem.isSuccess) {
      toast.success('Withdrawal activated! USDC claimed successfully.');
    }
  }, [claimRedeem.isSuccess]);

  useEffect(() => {
    if (activateAll.isSuccess) {
      toast.success('All claims activated successfully!');
    }
  }, [activateAll.isSuccess]);

  // Error handlers
  useEffect(() => {
    if (claimDeposit.error) {
      toast.error('Failed to activate deposit');
    }
    if (claimRedeem.error) {
      toast.error('Failed to activate withdrawal');
    }
    if (activateAll.error) {
      toast.error('Failed to activate all claims');
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
      await activateAll.activateAll(!!hasPendingDeposit, !!hasPendingRedeem);
    } catch (error) {
      console.error('Error activating all:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">
              Pool Explorer
            </h1>
            <p className="text-sm sm:text-base text-gray-400">
              Discover high-yield liquidity pools across multiple chains
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDepositModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:shadow-lg hover:shadow-emerald-500/50 transition-all flex items-center gap-2 min-h-[44px] font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Deposit</span>
            </button>
            <button
              onClick={() => setIsWithdrawModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:shadow-lg hover:shadow-red-500/50 transition-all flex items-center gap-2 min-h-[44px] font-semibold"
            >
              <Minus className="w-4 h-4" />
              <span className="hidden sm:inline">Withdraw</span>
            </button>

            {/* Activate All Button */}
            {showActivateAll && (
              <button
                onClick={handleActivateAll}
                disabled={activateAll.isPending || activateAll.isConfirming}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:shadow-lg hover:shadow-emerald-500/50 transition-all flex items-center gap-2 min-h-[44px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {activateAll.isPending || activateAll.isConfirming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Activate All</span>
              </button>
            )}

            {/* Activate Deposit Button */}
            {showActivateDeposit && (
              <button
                onClick={handleActivateDeposit}
                disabled={claimDeposit.isPending || claimDeposit.isConfirming}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:shadow-lg hover:shadow-emerald-500/50 transition-all flex items-center gap-2 min-h-[44px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {claimDeposit.isPending || claimDeposit.isConfirming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Activate Deposit</span>
              </button>
            )}

            {/* Activate Withdrawal Button */}
            {showActivateRedeem && (
              <button
                onClick={handleActivateRedeem}
                disabled={claimRedeem.isPending || claimRedeem.isConfirming}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:shadow-lg hover:shadow-emerald-500/50 transition-all flex items-center gap-2 min-h-[44px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {claimRedeem.isPending || claimRedeem.isConfirming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Activate Withdrawal</span>
              </button>
            )}

            <button
              onClick={() => refetch()}
              disabled={loading}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-750 transition-colors flex items-center gap-2 min-h-[44px]"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* User Vault Position - Only show when connected */}
        {isConnected && (
          <ErrorBoundary
            fallback={
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-sm text-yellow-400">
                  Unable to load your vault position. Please refresh the page or try again later.
                </p>
              </div>
            }
          >
            <UserVaultPosition />
          </ErrorBoundary>
        )}

        {/* Portfolio Summary */}
        <PortfolioSummary
          totalValue={stats.totalTVL}
          averageAPY={stats.averageAPY}
          poolCount={stats.poolCount}
        />

        {/* Filters and View Controls */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="w-full lg:w-64">
            <ChainSelector
              selectedChain={selectedChain}
              onChainChange={setSelectedChain}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2.5 sm:p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center ${
                viewMode === 'table'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
              aria-label="Table view"
            >
              <Table className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="text-xs text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400 text-sm">
              Error loading pools: {error}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-red-400 hover:text-red-300 text-sm underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && pools.length === 0 && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12">
            <div className="flex flex-col items-center justify-center">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mb-4" />
              <p className="text-gray-400">Loading pools...</p>
            </div>
          </div>
        )}

        {/* Pools Table */}
        {!loading || pools.length > 0 ? (
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-white">
                {selectedChain ? `Pools on ${selectedChain}` : 'All Pools'}
              </h2>
              <p className="text-gray-400 mt-1">
                {stats.poolCount} pool{stats.poolCount !== 1 ? 's' : ''} found
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <PoolsTable pools={pools} />
            </div>
          </div>
        ) : null}
      </div>

      {/* Modals */}
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
      />
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
      />
    </DashboardLayout>
  );
}
