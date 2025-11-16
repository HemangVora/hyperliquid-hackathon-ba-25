'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { User, Wallet, Activity, BarChart, Clock } from 'lucide-react';

export default function AccountPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <User className="w-6 h-6 text-emerald-500" />
            </div>
            <h1 className="text-3xl font-bold text-white">Account Settings</h1>
          </div>
          <p className="text-gray-400">
            Manage your account information and wallet connection
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
            We&apos;re building a comprehensive account management system where you&apos;ll be able to
            view and manage all aspects of your account and wallet connection.
          </p>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Wallet Information</h3>
                  <p className="text-sm text-gray-400">
                    View your connected wallet address, balance, and connection status
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <BarChart className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Account Statistics</h3>
                  <p className="text-sm text-gray-400">
                    Track total deposits, withdrawals, earnings, and account lifetime value
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
                  <h3 className="text-white font-semibold mb-1">Activity Summary</h3>
                  <p className="text-sm text-gray-400">
                    Review your recent activity, transaction count, and engagement metrics
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <User className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Profile Management</h3>
                  <p className="text-sm text-gray-400">
                    Manage wallet connections, copy addresses, and disconnect options
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
