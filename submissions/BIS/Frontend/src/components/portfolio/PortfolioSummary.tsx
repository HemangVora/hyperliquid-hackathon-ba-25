import { TrendingUp, DollarSign, Layers } from 'lucide-react';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatTVL, formatAPY } from '@/lib/api/pools';

interface PortfolioSummaryProps {
  totalValue: number;
  averageAPY: number;
  poolCount: number;
}

export default function PortfolioSummary({
  totalValue,
  averageAPY,
  poolCount,
}: PortfolioSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card hover>
        <CardHeader>
          <CardTitle className="text-base font-medium text-gray-400">
            Total Value Locked
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold text-white">
                {formatTVL(totalValue)}
              </div>
              <div className="text-sm text-gray-400 mt-2">
                Across all pools
              </div>
            </div>
            <DollarSign className="w-8 h-8 text-primary-500 opacity-50" />
          </div>
        </CardContent>
      </Card>

      <Card hover>
        <CardHeader>
          <CardTitle className="text-base font-medium text-gray-400">
            Average APY
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold text-emerald-500">
                {formatAPY(averageAPY)}
              </div>
              <div className="text-sm text-gray-400 mt-2">
                Weighted by TVL
              </div>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-500 opacity-50" />
          </div>
        </CardContent>
      </Card>

      <Card hover>
        <CardHeader>
          <CardTitle className="text-base font-medium text-gray-400">
            Active Pools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold text-white">
                {poolCount}
              </div>
              <div className="text-sm text-gray-400 mt-2">
                Available pools
              </div>
            </div>
            <Layers className="w-8 h-8 text-primary-500 opacity-50" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
