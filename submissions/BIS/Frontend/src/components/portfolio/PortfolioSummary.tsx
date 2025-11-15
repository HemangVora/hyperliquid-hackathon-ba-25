import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface PortfolioSummaryProps {
  totalValue: number;
  totalEarningsToday: number;
  totalEarningsAllTime: number;
  percentageChange: number;
}

export default function PortfolioSummary({
  totalValue,
  totalEarningsToday,
  totalEarningsAllTime,
  percentageChange,
}: PortfolioSummaryProps) {
  const isPositive = percentageChange >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card hover>
        <CardHeader>
          <CardTitle className="text-base font-medium text-gray-400">
            Total Portfolio Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold text-white">
                ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`flex items-center mt-2 text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? (
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 mr-1" />
                )}
                {Math.abs(percentageChange).toFixed(2)}% today
              </div>
            </div>
            <TrendingUp className="w-8 h-8 text-primary-500 opacity-50" />
          </div>
        </CardContent>
      </Card>

      <Card hover>
        <CardHeader>
          <CardTitle className="text-base font-medium text-gray-400">
            Today's Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <div className="text-3xl font-bold text-green-500">
              +${totalEarningsToday.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-gray-400 mt-2">
              From {4} active pools
            </div>
          </div>
        </CardContent>
      </Card>

      <Card hover>
        <CardHeader>
          <CardTitle className="text-base font-medium text-gray-400">
            Total Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <div className="text-3xl font-bold text-white">
              ${totalEarningsAllTime.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-gray-400 mt-2">
              All time earnings
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
