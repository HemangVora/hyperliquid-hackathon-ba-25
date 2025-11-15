export interface Pool {
  id: string;
  name: string;
  tokenPair: string;
  apy: number;
  deposited: number;
  earnedToday: number;
  earnedTotal: number;
  status: 'active' | 'inactive';
  icon?: string;
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface DailyEarning {
  date: string;
  amount: number;
}

export interface PortfolioData {
  totalValue: number;
  totalEarningsToday: number;
  totalEarningsAllTime: number;
  percentageChange: number;
  pools: Pool[];
  dailyEarnings: DailyEarning[];
}
