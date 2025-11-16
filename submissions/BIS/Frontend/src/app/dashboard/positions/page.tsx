'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PoolsTable from '@/components/portfolio/PoolsTable';
import { mockPortfolioData } from '@/data/mockPortfolio';
import { TrendingUp, TrendingDown, Filter, Search } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PoolData } from '@/lib/api/pools';

export default function PositionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused'>('all');

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

  const filteredPools = poolsAsPoolData.filter(pool => {
    const matchesSearch = (pool.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (pool.token_pair?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || pool.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const positionMetrics = {
    totalPositions: mockPortfolioData.pools.length,
    activePositions: mockPortfolioData.pools.filter(p => p.status === 'active').length,
    totalDeposited: mockPortfolioData.pools.reduce((sum, p) => sum + p.deposited, 0),
    averageAPY: mockPortfolioData.pools.reduce((sum, p) => sum + p.apy, 0) / mockPortfolioData.pools.length
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Current Positions</h1>
          <p className="text-gray-400">
            Detailed view of all your active liquidity pool positions
          </p>
        </div>

        {/* Position Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-400 text-sm font-medium">Total Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {positionMetrics.totalPositions}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {positionMetrics.activePositions} active
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-gray-400 text-sm font-medium">Total Deposited</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                ${positionMetrics.totalDeposited.toLocaleString()}
              </div>
              <div className="text-sm text-green-500 mt-1 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +12.5% this month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-gray-400 text-sm font-medium">Average APY</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {positionMetrics.averageAPY.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Across all pools
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-gray-400 text-sm font-medium">Today&apos;s Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                ${mockPortfolioData.totalEarningsToday.toLocaleString()}
              </div>
              <div className="text-sm text-green-500 mt-1 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +{mockPortfolioData.percentageChange}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search pools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'paused')}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="all">All Positions</option>
                  <option value="active">Active Only</option>
                  <option value="paused">Paused Only</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Positions Table */}
        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-white">
              {filteredPools.length} Position{filteredPools.length !== 1 ? 's' : ''}
            </h2>
            <p className="text-gray-400 mt-1">
              {filterStatus === 'all' ? 'All' : filterStatus === 'active' ? 'Active' : 'Paused'} positions
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            {filteredPools.length > 0 ? (
              <PoolsTable pools={filteredPools} />
            ) : (
              <div className="p-12 text-center">
                <div className="text-gray-400 text-lg mb-2">No positions found</div>
                <p className="text-gray-500">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>

        {/* Risk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['Low', 'Medium', 'High'].map((risk) => {
                const count = mockPortfolioData.pools.filter(
                  p => p.riskLevel?.toLowerCase() === risk.toLowerCase()
                ).length;
                const percentage = (count / mockPortfolioData.pools.length) * 100;

                return (
                  <div key={risk}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300 font-medium">{risk} Risk</span>
                      <span className="text-gray-400">{count} pools ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          risk === 'Low' ? 'bg-green-500' :
                          risk === 'Medium' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
