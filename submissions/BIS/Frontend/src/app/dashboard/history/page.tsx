'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { History, ArrowDownCircle, ArrowUpCircle, RefreshCw, Download, Clock } from 'lucide-react';

export default function HistoryPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <History className="w-6 h-6 text-emerald-500" />
            </div>
            <h1 className="text-3xl font-bold text-white">Transaction History</h1>
          </div>
          <p className="text-gray-400">
            Complete record of your vault activities and transactions
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
            We&apos;re developing a comprehensive transaction history system to help you track all your
            vault activities in one place with advanced filtering and export capabilities.
          </p>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <ArrowDownCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Deposit History</h3>
                  <p className="text-sm text-gray-400">
                    View all your deposit transactions with amounts, timestamps, and status
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <ArrowUpCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Withdrawal History</h3>
                  <p className="text-sm text-gray-400">
                    Track all withdrawals with detailed transaction information and receipts
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <RefreshCw className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Rebalancing Events</h3>
                  <p className="text-sm text-gray-400">
                    Monitor rebalancing operations that processed your pending transactions
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Download className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Export Functionality</h3>
                  <p className="text-sm text-gray-400">
                    Download your complete transaction history for accounting and analysis
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
