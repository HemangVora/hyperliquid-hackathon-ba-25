import { TrendingUp, Droplet, AlertCircle } from 'lucide-react';
import Card, { CardContent } from '@/components/ui/Card';
import { Pool } from '@/types/portfolio';

interface PoolCardProps {
  pool: Pool;
}

export default function PoolCard({ pool }: PoolCardProps) {
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

  const getRiskBadgeColor = (risk?: string) => {
    switch (risk) {
      case 'low':
        return 'bg-green-500/10 text-green-500';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'high':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <Card hover className="relative overflow-hidden">
      <CardContent>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center">
              <Droplet className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{pool.name}</h3>
              <p className="text-sm text-gray-400">{pool.tokenPair}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskBadgeColor(pool.riskLevel)}`}>
                {pool.riskLevel?.toUpperCase()}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                pool.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'
              }`}>
                {pool.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">APY</p>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <p className="text-xl font-bold text-green-500">{pool.apy}%</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Deposited</p>
            <p className="text-xl font-bold text-white">
              ${pool.deposited.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Earned Today</p>
            <p className="text-lg font-semibold text-green-500">
              +${pool.earnedToday.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Total Earned</p>
            <p className="text-lg font-semibold text-white">
              ${pool.earnedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors">
            Add Funds
          </button>
          <button className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors">
            Withdraw
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
