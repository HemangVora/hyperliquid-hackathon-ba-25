'use client';

import { TrendingUp } from 'lucide-react';
import { Pool } from '@/types/portfolio';

interface PoolsTableProps {
  pools: Pool[];
}

export default function PoolsTable({ pools }: PoolsTableProps) {
  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case 'low':
        return 'text-green-500';
      case 'medium':
        return 'text-yellow-500';
      case 'high':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-400 uppercase">
              Pool
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-semibold text-gray-400 uppercase">
              APY
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-semibold text-gray-400 uppercase">
              Deposited
            </th>
            <th className="hidden md:table-cell px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">
              Earned Today
            </th>
            <th className="hidden lg:table-cell px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">
              Total Earned
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
          {pools.map((pool) => (
            <tr key={pool.id} className="hover:bg-gray-800/50 transition-colors">
              <td className="px-2 sm:px-4 py-3 sm:py-4">
                <div>
                  <div className="font-medium text-white text-sm sm:text-base">{pool.name}</div>
                  <div className="text-xs sm:text-sm text-gray-400">{pool.tokenPair}</div>
                  {/* Show risk/status badges on mobile only */}
                  <div className="flex gap-1 mt-1 sm:hidden">
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(pool.riskLevel)}`}>
                      {pool.riskLevel?.toUpperCase()}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      pool.status === 'active'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-gray-500/10 text-gray-500'
                    }`}>
                      {pool.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-2 sm:px-4 py-3 sm:py-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                  <span className="font-semibold text-green-500 text-sm sm:text-base">{pool.apy}%</span>
                </div>
              </td>
              <td className="px-2 sm:px-4 py-3 sm:py-4 text-right">
                <span className="font-medium text-white text-sm sm:text-base">
                  ${pool.deposited.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </td>
              <td className="hidden md:table-cell px-4 py-4 text-right">
                <span className="font-medium text-green-500">
                  +${pool.earnedToday.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </td>
              <td className="hidden lg:table-cell px-4 py-4 text-right">
                <span className="font-medium text-white">
                  ${pool.earnedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </td>
              <td className="hidden sm:table-cell px-2 sm:px-4 py-3 sm:py-4 text-center">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(pool.riskLevel)}`}>
                  {pool.riskLevel?.toUpperCase()}
                </span>
              </td>
              <td className="hidden sm:table-cell px-2 sm:px-4 py-3 sm:py-4 text-center">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  pool.status === 'active'
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-gray-500/10 text-gray-500'
                }`}>
                  {pool.status.toUpperCase()}
                </span>
              </td>
              <td className="px-2 sm:px-4 py-3 sm:py-4">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                  <button className="w-full sm:w-auto px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors rounded bg-primary-500/10 sm:bg-transparent min-h-[36px] sm:min-h-0">
                    Add
                  </button>
                  <button className="w-full sm:w-auto px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-medium text-gray-400 hover:text-gray-300 transition-colors rounded bg-gray-700/30 sm:bg-transparent min-h-[36px] sm:min-h-0">
                    Withdraw
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
