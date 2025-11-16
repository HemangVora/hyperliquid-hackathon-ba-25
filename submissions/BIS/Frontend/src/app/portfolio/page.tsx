'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PortfolioSummary from '@/components/portfolio/PortfolioSummary';
import PoolCard from '@/components/portfolio/PoolCard';
import PoolsTable from '@/components/portfolio/PoolsTable';
import EarningsChart from '@/components/portfolio/EarningsChart';
import { mockPortfolioData } from '@/data/mockPortfolio';
import { LayoutGrid, Table } from 'lucide-react';
import { PoolData } from '@/lib/api/pools';

export default function PortfolioPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Convert Pool[] to PoolData[] for PoolsTable
  const poolsAsPoolData = useMemo(() => {
    return mockPortfolioData.pools.map((pool): PoolData => ({
      pool_address: pool.id,
      chain: 'ethereum', // Default chain
      name: pool.name,
      token_pair: pool.tokenPair,
      tvl: pool.deposited, // Use deposited as TVL
      apy: pool.apy,
      risk_level: pool.riskLevel,
      status: pool.status,
      protocol: 'HyperGlueX'
    }));
  }, []);

  // Calculate average APY
  const averageAPY = useMemo(() => {
    if (mockPortfolioData.pools.length === 0) return 0;
    const sum = mockPortfolioData.pools.reduce((acc, pool) => acc + pool.apy, 0);
    return sum / mockPortfolioData.pools.length;
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Portfolio</h1>
          <p className="text-gray-400">
            Monitor your liquidity pools and track earnings
          </p>
        </div>

        <PortfolioSummary
          totalValue={mockPortfolioData.totalValue}
          averageAPY={averageAPY}
          poolCount={mockPortfolioData.pools.length}
        />

        <EarningsChart data={mockPortfolioData.dailyEarnings} />

        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Active Pools</h2>
              <p className="text-gray-400 mt-1">
                {mockPortfolioData.pools.length} pools generating earnings
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-colors ${
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

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mockPortfolioData.pools.map((pool) => (
                <PoolCard key={pool.id} pool={pool} />
              ))}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <PoolsTable pools={poolsAsPoolData} />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
