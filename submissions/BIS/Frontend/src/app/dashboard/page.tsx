'use client';

import { useState, useMemo } from 'react';
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
import { LayoutGrid, Table, RefreshCw, Plus, Minus } from 'lucide-react';

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Fetch pool data with auto-refresh
  const { pools, loading, error, refetch, lastUpdated } = usePoolData(
    { chain: selectedChain || undefined, limit: 100 },
    { autoRefresh: true }
  );

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
