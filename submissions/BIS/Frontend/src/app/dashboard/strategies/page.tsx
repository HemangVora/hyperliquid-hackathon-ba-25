'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StrategyCard from '@/components/portfolio/StrategyCard';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { TrendingUp, Target, Zap, BarChart3, Shield, Activity, CheckCircle2 } from 'lucide-react';

type StrategyType = 'apy' | 'standard' | null;

export default function StrategiesPage() {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>(null);

  const strategies = [
    {
      id: 'apy' as StrategyType,
      title: 'APY Strategy',
      description: 'Maximum yield focused. Automatically selects pools with the highest APY to maximize your returns.',
      icon: TrendingUp,
      color: 'bg-emerald-500',
      currentAPY: '28.5%',
      recommended: false,
      features: [
        { label: 'Highest APY pools prioritized', included: true },
        { label: 'Liquidity depth analysis', included: false },
        { label: 'Historical performance tracking', included: false },
        { label: 'Risk assessment', included: false },
        { label: 'Impermanent loss protection', included: false }
      ]
    },
    {
      id: 'standard' as StrategyType,
      title: 'Standard Strategy',
      description: 'Balanced optimization. Considers multiple factors including liquidity and historical performance for sustainable returns.',
      icon: Target,
      color: 'bg-emerald-500',
      currentAPY: '24.2%',
      recommended: true,
      features: [
        { label: 'Highest APY pools prioritized', included: true },
        { label: 'Liquidity depth analysis', included: true },
        { label: 'Historical performance tracking', included: true },
        { label: 'Risk assessment', included: true },
        { label: 'Impermanent loss protection', included: false }
      ]
    }
  ];

  const comparisonData = [
    {
      factor: 'APY Focus',
      apy: 'Maximum',
      standard: 'Balanced'
    },
    {
      factor: 'Risk Level',
      apy: 'Higher',
      standard: 'Moderate'
    },
    {
      factor: 'Stability',
      apy: 'Variable',
      standard: 'Stable'
    },
    {
      factor: 'Liquidity Check',
      apy: 'No',
      standard: 'Yes'
    },
    {
      factor: 'Historical Data',
      apy: 'No',
      standard: 'Yes'
    }
  ];

  const handleSelectStrategy = (strategyId: StrategyType) => {
    setSelectedStrategy(strategyId);
    // TODO: Implement actual strategy selection logic
    console.log('Selected strategy:', strategyId);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-white mb-2">Choose Your Strategy</h1>
          <p className="text-gray-400">
            Select the optimization strategy that best fits your investment goals
          </p>
        </motion.div>

        {/* Strategy Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {strategies.map((strategy, index) => (
            <motion.div
              key={strategy.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <StrategyCard
                title={strategy.title}
                description={strategy.description}
                icon={strategy.icon}
                color={strategy.color}
                features={strategy.features}
                recommended={strategy.recommended}
                currentAPY={strategy.currentAPY}
                onSelect={() => handleSelectStrategy(strategy.id)}
                isSelected={selectedStrategy === strategy.id}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Strategy Comparison</CardTitle>
              <p className="text-gray-400 mt-2">
                Detailed comparison of optimization factors
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-4 px-4 text-gray-400 font-medium">Factor</th>
                      <th className="text-center py-4 px-4 text-gray-400 font-medium">APY Strategy</th>
                      <th className="text-center py-4 px-4 text-gray-400 font-medium">
                        <div className="flex items-center justify-center gap-2">
                          Standard Strategy
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                            Recommended
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, index) => (
                      <tr
                        key={row.factor}
                        className={`border-b border-gray-700/50 ${
                          index % 2 === 0 ? 'bg-gray-800/30' : ''
                        }`}
                      >
                        <td className="py-4 px-4 text-white font-medium">{row.factor}</td>
                        <td className="py-4 px-4 text-center text-gray-300">{row.apy}</td>
                        <td className="py-4 px-4 text-center text-gray-300">{row.standard}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>How Strategy Selection Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* APY Strategy Explanation */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">APY Strategy</h3>
                  </div>
                  <p className="text-gray-400 leading-relaxed">
                    Focuses purely on maximizing Annual Percentage Yield (APY). The algorithm scans all available
                    liquidity pools and automatically allocates your funds to the pools offering the highest returns.
                    Best for aggressive investors seeking maximum yield.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Simple and straightforward approach</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Maximum potential returns</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Quick rebalancing based on APY changes</span>
                    </div>
                  </div>
                </div>

                {/* Standard Strategy Explanation */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Standard Strategy</h3>
                  </div>
                  <p className="text-gray-400 leading-relaxed">
                    Takes a holistic approach by considering liquidity depth and historical performance alongside APY.
                    Evaluates pool stability, trading volume, and past earnings consistency to provide more sustainable
                    returns. Ideal for balanced risk-reward optimization.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Multi-factor optimization</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>More stable and consistent returns</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Reduced exposure to volatile pools</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Selection Confirmation */}
        {selectedStrategy && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed bottom-4 sm:bottom-8 left-4 right-4 sm:left-auto sm:right-8 sm:max-w-md z-50"
          >
            <Card className="border-2 border-emerald-500 shadow-2xl shadow-emerald-500/50 bg-gray-800">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                      {selectedStrategy === 'apy' ? 'APY Strategy' : 'Standard Strategy'} Selected
                    </h3>
                    <p className="text-sm text-gray-400 mb-3 sm:mb-4">
                      Your portfolio will be optimized using the selected strategy.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg transition-colors min-h-[44px] sm:min-h-0">
                        Apply Strategy
                      </button>
                      <button
                        onClick={() => setSelectedStrategy(null)}
                        className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors min-h-[44px] sm:min-h-0"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
