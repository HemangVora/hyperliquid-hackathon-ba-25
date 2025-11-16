'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { BarChart3, TrendingUp, PieChart, Activity, Clock } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <BarChart3 className="w-6 h-6 text-emerald-500" />
            </div>
            <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
          </div>
          <p className="text-gray-400">
            Advanced analytics and performance insights for your portfolio
          </p>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-emerald-500/10 rounded-full">
              <Clock className="w-12 h-12 text-emerald-500" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white text-center mb-4">
            Coming Soon
          </h2>

          <p className="text-gray-400 text-center mb-8 max-w-2xl mx-auto">
            We&apos;re building powerful analytics tools to help you make data-driven decisions.
            This page will provide comprehensive insights into your portfolio performance.
          </p>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Performance Charts</h3>
                  <p className="text-sm text-gray-400">
                    Track your portfolio value, APY trends, and earnings over time with interactive charts
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Pool Analytics</h3>
                  <p className="text-sm text-gray-400">
                    Compare pool performance, liquidity trends, and volume analytics across chains
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Activity className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">APY History</h3>
                  <p className="text-sm text-gray-400">
                    Visualize historical APY data and identify the best performing pools
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <PieChart className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Risk Analysis</h3>
                  <p className="text-sm text-gray-400">
                    Understand your portfolio risk distribution and exposure metrics
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
