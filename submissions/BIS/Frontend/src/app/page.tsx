import DashboardLayout from '@/components/layout/DashboardLayout';

export default function Home() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Dashboard
          </h1>
          <p className="text-gray-400">
            Welcome to HyperGlueX - Your HyperLiquid trading companion
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Portfolio
            </h2>
            <p className="text-gray-400">
              View your positions and portfolio performance
            </p>
            <div className="mt-4 text-3xl font-bold text-primary-500">
              $0.00
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Markets
            </h2>
            <p className="text-gray-400">
              Real-time market data and analytics
            </p>
            <div className="mt-4 text-sm text-green-500">
              ↑ Markets Active
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Trading
            </h2>
            <p className="text-gray-400">
              Execute trades and manage orders
            </p>
            <div className="mt-4 text-sm text-gray-500">
              Connect wallet to start
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
