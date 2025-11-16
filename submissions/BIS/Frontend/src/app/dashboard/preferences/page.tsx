'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Settings, Bell, Monitor, Sliders, Clock } from 'lucide-react';

export default function PreferencesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Settings className="w-6 h-6 text-emerald-500" />
            </div>
            <h1 className="text-3xl font-bold text-white">Preferences</h1>
          </div>
          <p className="text-gray-400">
            Customize your experience and configure application settings
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
            We&apos;re creating a comprehensive preferences system to give you full control over
            your experience, from notifications to trading parameters.
          </p>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Bell className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Notification Settings</h3>
                  <p className="text-sm text-gray-400">
                    Configure alerts for deposits, withdrawals, rebalancing events, and price changes
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Monitor className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Display Preferences</h3>
                  <p className="text-sm text-gray-400">
                    Customize theme, currency display, number formatting, and language options
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Sliders className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Trading Parameters</h3>
                  <p className="text-sm text-gray-400">
                    Set slippage tolerance, gas price preferences, and transaction deadlines
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Settings className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Default Configurations</h3>
                  <p className="text-sm text-gray-400">
                    Set default strategy selection, auto-rebalance options, and quick action preferences
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
