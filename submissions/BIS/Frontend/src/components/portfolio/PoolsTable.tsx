'use client';

import { TrendingUp, ExternalLink } from 'lucide-react';
import { PoolData } from '@/lib/api/pools';
import { getRiskLevelBadgeColor, formatTVL, formatAPY } from '@/lib/api/pools';
import { useChains } from '@/hooks/useChains';

interface PoolsTableProps {
  pools: PoolData[];
}

export default function PoolsTable({ pools }: PoolsTableProps) {
  const { chains } = useChains();

  const getChainInfo = (chainId: string) => {
    return chains.find(c => c.id === chainId);
  };

  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case 'low':
        return 'text-emerald-500';
      case 'medium':
        return 'text-yellow-500';
      case 'high':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  if (pools.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No pools found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-400 uppercase">
              Pool
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-400 uppercase">
              Chain
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-semibold text-gray-400 uppercase">
              APY
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-semibold text-gray-400 uppercase">
              TVL
            </th>
            <th className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-400 uppercase">
              Risk
            </th>
            <th className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-400 uppercase">
              Status
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-400 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {pools.map((pool) => {
            const chainInfo = getChainInfo(pool.chain);
            return (
              <tr key={`${pool.pool_address}-${pool.chain}`} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-2 sm:px-4 py-3 sm:py-4">
                  <div>
                    <div className="font-medium text-white text-sm sm:text-base">
                      {pool.name || 'Unnamed Pool'}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-400">
                      {pool.token_pair || pool.protocol || 'Pool'}
                    </div>
                    {/* Show risk/status badges on mobile only */}
                    <div className="flex gap-1 mt-1 sm:hidden">
                      {pool.risk_level && (
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(pool.risk_level)}`}>
                          {pool.risk_level.toUpperCase()}
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                        pool.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-gray-500/10 text-gray-500'
                      }`}>
                        {pool.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-2 sm:px-4 py-3 sm:py-4">
                  <div className="flex items-center gap-2">
                    {chainInfo?.color && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: chainInfo.color }}
                      />
                    )}
                    <span className="text-white text-sm font-medium">
                      {chainInfo?.name || pool.chain}
                    </span>
                  </div>
                </td>
                <td className="px-2 sm:px-4 py-3 sm:py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
                    <span className="font-semibold text-emerald-500 text-sm sm:text-base">
                      {formatAPY(pool.apy)}
                    </span>
                  </div>
                </td>
                <td className="px-2 sm:px-4 py-3 sm:py-4 text-right">
                  <span className="font-medium text-white text-sm sm:text-base">
                    {formatTVL(pool.tvl)}
                  </span>
                </td>
                <td className="hidden sm:table-cell px-2 sm:px-4 py-3 sm:py-4 text-center">
                  {pool.risk_level && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelBadgeColor(pool.risk_level)}`}>
                      {pool.risk_level.toUpperCase()}
                    </span>
                  )}
                </td>
                <td className="hidden sm:table-cell px-2 sm:px-4 py-3 sm:py-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    pool.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-gray-500/10 text-gray-500'
                  }`}>
                    {pool.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-2 sm:px-4 py-3 sm:py-4">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                    <button className="w-full sm:w-auto px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors rounded bg-primary-500/10 sm:bg-transparent min-h-[36px] sm:min-h-0">
                      Deposit
                    </button>
                    {chainInfo && (
                      <a
                        href={`${chainInfo.explorer_url}/address/${pool.pool_address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-medium text-gray-400 hover:text-gray-300 transition-colors rounded bg-gray-700/30 sm:bg-transparent min-h-[36px] sm:min-h-0 flex items-center justify-center gap-1"
                      >
                        View
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
