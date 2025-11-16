'use client';

import { RebalanceDecision } from '@/types/rebalancing';

interface SwitchPredictionProps {
  decision: RebalanceDecision;
}

export default function SwitchPrediction({ decision }: SwitchPredictionProps) {
  // Separate pools into gaining and losing
  const gainingPools = decision.pools.filter((p) => p.delta > 0).sort((a, b) => b.delta - a.delta);
  const losingPools = decision.pools.filter((p) => p.delta < 0).sort((a, b) => a.delta - b.delta);
  const stablePools = decision.pools.filter((p) => p.delta === 0);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">Switch Prediction & Impact</h2>
        <p className="text-gray-400 text-sm">
          Expected allocation changes when rebalance executes
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900/50 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Total Moving</p>
          <p className="text-white text-lg font-bold">{decision.totalAllocationChange.toFixed(1)}%</p>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Gas Cost</p>
          <p className="text-red-400 text-lg font-bold">${decision.expectedGasCost.toFixed(2)}</p>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Annual Benefit</p>
          <p className="text-green-400 text-lg font-bold">${decision.expectedBenefit.toFixed(2)}</p>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Benefit/Cost</p>
          <p className="text-blue-400 text-lg font-bold">{decision.benefitToCostRatio.toFixed(1)}x</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pools Gaining Allocation */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <h3 className="text-white font-semibold">Gaining Allocation</h3>
            <span className="text-gray-500 text-sm">({gainingPools.length} pools)</span>
          </div>

          <div className="space-y-3">
            {gainingPools.length > 0 ? (
              gainingPools.map((pool) => (
                <div
                  key={pool.address}
                  className="bg-green-500/5 border border-green-500/20 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-medium text-sm">{pool.name}</p>
                      <p className="text-gray-500 text-xs font-mono">{pool.address.slice(0, 10)}...</p>
                    </div>
                    <span className="text-green-400 font-bold text-lg">↑</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-400 mb-1">APY</p>
                      <p className="text-green-400 font-semibold">{pool.apy.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Sharpe Ratio</p>
                      <p className="text-white font-semibold">{pool.sharpeRatio.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Current</p>
                      <p className="text-white">${pool.currentAllocation.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Target</p>
                      <p className="text-green-400 font-semibold">
                        ${pool.targetAllocation.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-green-500/20">
                    <p className="text-green-400 font-semibold text-sm">
                      +${pool.delta.toLocaleString()} ({pool.deltaPercent > 0 ? '+' : ''}
                      {pool.deltaPercent.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm italic">No pools gaining allocation</p>
            )}
          </div>
        </div>

        {/* Pools Losing Allocation */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <h3 className="text-white font-semibold">Losing Allocation</h3>
            <span className="text-gray-500 text-sm">({losingPools.length} pools)</span>
          </div>

          <div className="space-y-3">
            {losingPools.length > 0 ? (
              losingPools.map((pool) => (
                <div
                  key={pool.address}
                  className="bg-red-500/5 border border-red-500/20 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-medium text-sm">{pool.name}</p>
                      <p className="text-gray-500 text-xs font-mono">{pool.address.slice(0, 10)}...</p>
                    </div>
                    <span className="text-red-400 font-bold text-lg">↓</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-400 mb-1">APY</p>
                      <p className="text-green-400 font-semibold">{pool.apy.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Sharpe Ratio</p>
                      <p className="text-white font-semibold">{pool.sharpeRatio.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Current</p>
                      <p className="text-white">${pool.currentAllocation.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Target</p>
                      <p className="text-red-400 font-semibold">
                        ${pool.targetAllocation.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-red-500/20">
                    <p className="text-red-400 font-semibold text-sm">
                      ${pool.delta.toLocaleString()} ({pool.deltaPercent.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm italic">No pools losing allocation</p>
            )}
          </div>
        </div>
      </div>

      {/* Stable Pools */}
      {stablePools.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-gray-500 rounded-full" />
            <h3 className="text-white font-semibold">No Change</h3>
            <span className="text-gray-500 text-sm">({stablePools.length} pools)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {stablePools.map((pool) => (
              <span
                key={pool.address}
                className="px-3 py-1 bg-gray-700/50 text-gray-400 rounded text-sm"
              >
                {pool.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Projected Outcome */}
      <div className="mt-6 pt-6 border-t border-gray-700 bg-gradient-to-r from-blue-500/10 to-purple-500/10 -m-6 p-6 rounded-b-lg">
        <h3 className="text-white font-semibold mb-3">Projected Outcome</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-400 mb-1">Pools with higher Sharpe ratios</p>
            <p className="text-green-400 font-semibold">
              {gainingPools.length} gaining, {losingPools.length} reducing
            </p>
          </div>
          <div>
            <p className="text-gray-400 mb-1">Expected execution</p>
            <p className="text-white font-semibold">Next rebalance window</p>
          </div>
          <div>
            <p className="text-gray-400 mb-1">Annual return improvement</p>
            <p className="text-green-400 font-semibold">
              +${decision.expectedBenefit.toLocaleString()}/year
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
