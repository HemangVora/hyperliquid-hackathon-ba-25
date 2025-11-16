'use client';

import { PoolMetrics } from '@/types/rebalancing';

interface PoolComparisonTableProps {
  pools: PoolMetrics[];
}

export default function PoolComparisonTable({ pools }: PoolComparisonTableProps) {
  // Helper function to determine delta indicator
  const getDeltaIndicator = (delta: number) => {
    if (delta > 0) {
      return <span className="text-green-400">↑ {delta.toFixed(2)}</span>;
    } else if (delta < 0) {
      return <span className="text-red-400">↓ {Math.abs(delta).toFixed(2)}</span>;
    } else {
      return <span className="text-gray-400">— {delta.toFixed(2)}</span>;
    }
  };

  // Helper function to get allocation bar color
  const getAllocationBarColor = (deltaPercent: number) => {
    if (deltaPercent > 5) return 'bg-green-500';
    if (deltaPercent < -5) return 'bg-red-500';
    return 'bg-blue-500';
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">Pool Comparison Matrix</h2>
        <p className="text-gray-400 text-sm">
          Current vs. optimal allocations across all whitelisted pools
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-gray-700">
              <th className="pb-3 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                Pool
              </th>
              <th className="pb-3 text-gray-400 text-xs font-semibold uppercase tracking-wider text-right">
                APY
              </th>
              <th className="pb-3 text-gray-400 text-xs font-semibold uppercase tracking-wider text-right">
                Sharpe Ratio
              </th>
              <th className="pb-3 text-gray-400 text-xs font-semibold uppercase tracking-wider text-right">
                Volatility
              </th>
              <th className="pb-3 text-gray-400 text-xs font-semibold uppercase tracking-wider text-right">
                Risk Score
              </th>
              <th className="pb-3 text-gray-400 text-xs font-semibold uppercase tracking-wider text-right">
                Current
              </th>
              <th className="pb-3 text-gray-400 text-xs font-semibold uppercase tracking-wider text-right">
                Target
              </th>
              <th className="pb-3 text-gray-400 text-xs font-semibold uppercase tracking-wider text-right">
                Delta
              </th>
              <th className="pb-3 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                Allocation
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {pools.map((pool, index) => (
              <tr
                key={pool.address}
                className={`hover:bg-gray-700/30 transition-colors ${
                  index === 0 ? 'bg-green-500/5' : ''
                }`}
              >
                {/* Pool Name */}
                <td className="py-4">
                  <div>
                    <p className="text-white font-medium text-sm">{pool.name}</p>
                    <p className="text-gray-500 text-xs font-mono">{pool.address.slice(0, 10)}...</p>
                    {index === 0 && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                        Best Sharpe
                      </span>
                    )}
                  </div>
                </td>

                {/* APY */}
                <td className="py-4 text-right">
                  <span className="text-green-400 font-semibold">{pool.apy.toFixed(2)}%</span>
                </td>

                {/* Sharpe Ratio */}
                <td className="py-4 text-right">
                  <span className="text-white font-semibold">{pool.sharpeRatio.toFixed(2)}</span>
                </td>

                {/* Volatility */}
                <td className="py-4 text-right">
                  <span className="text-gray-300">{pool.volatility.toFixed(2)}%</span>
                </td>

                {/* Risk Score */}
                <td className="py-4 text-right">
                  <span
                    className={`font-mono text-sm ${
                      pool.riskScore < 0.05
                        ? 'text-green-400'
                        : pool.riskScore < 0.10
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}
                  >
                    {pool.riskScore.toFixed(4)}
                  </span>
                </td>

                {/* Current Allocation */}
                <td className="py-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-white font-medium">
                      ${pool.currentAllocation.toLocaleString()}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {pool.currentAllocationPercent.toFixed(1)}%
                    </span>
                  </div>
                </td>

                {/* Target Allocation */}
                <td className="py-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-blue-400 font-medium">
                      ${pool.targetAllocation.toLocaleString()}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {pool.targetAllocationPercent.toFixed(1)}%
                    </span>
                  </div>
                </td>

                {/* Delta */}
                <td className="py-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-medium">{getDeltaIndicator(pool.delta)}</span>
                    <span className="text-xs">
                      {pool.deltaPercent > 0 && '+'}
                      {pool.deltaPercent.toFixed(1)}%
                    </span>
                  </div>
                </td>

                {/* Allocation Visualization */}
                <td className="py-4 pl-4">
                  <div className="w-32">
                    {/* Current allocation bar */}
                    <div className="mb-1">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">Current</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-gray-400 h-1.5 rounded-full"
                          style={{ width: `${pool.currentAllocationPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Target allocation bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">Target</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div
                          className={`${getAllocationBarColor(pool.deltaPercent)} h-1.5 rounded-full`}
                          style={{ width: `${pool.targetAllocationPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pools.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No pool data available</p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="flex items-center gap-6 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span>Gaining allocation (&gt;5%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span>Minor change (±5%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span>Losing allocation (&lt;-5%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
