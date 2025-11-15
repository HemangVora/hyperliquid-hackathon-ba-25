'use client';

import { RebalanceHistory as RebalanceHistoryType } from '@/types/rebalancing';

interface RebalanceHistoryProps {
  history: RebalanceHistoryType;
}

export default function RebalanceHistory({ history }: RebalanceHistoryProps) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">Rebalance History</h2>
        <p className="text-gray-400 text-sm">
          Historical rebalancing events and performance impact
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900/50 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Total Rebalances</p>
          <p className="text-white text-2xl font-bold">{history.totalRebalances}</p>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Avg Improvement</p>
          <p className="text-green-400 text-2xl font-bold">+{history.averageImprovement.toFixed(2)}%</p>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Total Gas Cost</p>
          <p className="text-red-400 text-2xl font-bold">${history.totalGasCost.toFixed(2)}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {history.rebalances.length > 0 ? (
          history.rebalances.map((rebalance, index) => (
            <div
              key={rebalance.transactionHash}
              className="relative pl-8 pb-4 border-l-2 border-gray-700 last:border-0"
            >
              {/* Timeline dot */}
              <div className="absolute left-0 top-0 -translate-x-[9px] w-4 h-4 bg-blue-500 rounded-full border-2 border-gray-800" />

              {/* Content */}
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white font-semibold">
                      Rebalance #{history.totalRebalances - index}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {new Date(rebalance.timestamp * 1000).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        rebalance.performanceImprovement > 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {rebalance.performanceImprovement > 0 ? '+' : ''}
                      {rebalance.performanceImprovement.toFixed(2)}%
                    </p>
                    <p className="text-gray-500 text-xs">Sharpe Δ</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-gray-400 mb-1">Pools Affected</p>
                    <p className="text-white font-medium">{rebalance.poolsAffected.length}</p>
                  </div>

                  <div>
                    <p className="text-gray-400 mb-1">Amount Moved</p>
                    <p className="text-white font-medium">
                      ${rebalance.totalAmountMoved.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-400 mb-1">Gas Used</p>
                    <p className="text-white font-medium">{rebalance.gasUsed.toLocaleString()}</p>
                  </div>

                  <div>
                    <p className="text-gray-400 mb-1">Gas Cost</p>
                    <p className="text-red-400 font-medium">${rebalance.gasCostUSD.toFixed(2)}</p>
                  </div>
                </div>

                {/* Sharpe Ratio Change */}
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-gray-400">Sharpe Before: </span>
                      <span className="text-white font-mono">
                        {rebalance.sharpeRatioBefore.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-gray-500">→</div>
                    <div>
                      <span className="text-gray-400">Sharpe After: </span>
                      <span className="text-green-400 font-mono">
                        {rebalance.sharpeRatioAfter.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transaction Hash */}
                <div className="mt-2">
                  <a
                    href={`https://explorer.hyperliquid.xyz/tx/${rebalance.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-xs font-mono"
                  >
                    {rebalance.transactionHash.slice(0, 10)}...
                    {rebalance.transactionHash.slice(-8)}
                  </a>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">No rebalancing history available yet</p>
            <p className="text-gray-500 text-sm mt-2">
              History will appear here after the first rebalance
            </p>
          </div>
        )}
      </div>

      {/* Load more button (if needed) */}
      {history.rebalances.length >= 10 && (
        <div className="mt-6 text-center">
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm">
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
