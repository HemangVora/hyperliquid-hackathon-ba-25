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
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Pool
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
              APY
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Deposited
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Earned Today
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Total Earned
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Risk
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {pools.map((pool) => (
            <tr key={pool.id} className="hover:bg-gray-800/50 transition-colors">
              <td className="px-4 py-4">
                <div>
                  <div className="font-medium text-white">{pool.name}</div>
                  <div className="text-sm text-gray-400">{pool.tokenPair}</div>
                </div>
              </td>
              <td className="px-4 py-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="font-semibold text-green-500">{pool.apy}%</span>
                </div>
              </td>
              <td className="px-4 py-4 text-right">
                <span className="font-medium text-white">
                  ${pool.deposited.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </td>
              <td className="px-4 py-4 text-right">
                <span className="font-medium text-green-500">
                  +${pool.earnedToday.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </td>
              <td className="px-4 py-4 text-right">
                <span className="font-medium text-white">
                  ${pool.earnedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </td>
              <td className="px-4 py-4 text-center">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(pool.riskLevel)}`}>
                  {pool.riskLevel?.toUpperCase()}
                </span>
              </td>
              <td className="px-4 py-4 text-center">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  pool.status === 'active'
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-gray-500/10 text-gray-500'
                }`}>
                  {pool.status.toUpperCase()}
                </span>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center justify-center gap-2">
                  <button className="px-3 py-1 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors">
                    Add
                  </button>
                  <button className="px-3 py-1 text-xs font-medium text-gray-400 hover:text-gray-300 transition-colors">
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
