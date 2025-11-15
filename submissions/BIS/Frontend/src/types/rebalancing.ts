// Types for the Rebalancing Monitor page

export interface PoolMetrics {
  address: string;
  name: string;
  apy: number;
  volatility: number;
  sharpeRatio: number;
  riskScore: number;
  tvl: number;
  currentAllocation: number; // in USDC
  currentAllocationPercent: number; // 0-100
  targetAllocation: number; // in USDC
  targetAllocationPercent: number; // 0-100
  delta: number; // difference in USDC
  deltaPercent: number; // difference in %
}

export interface RebalanceStatus {
  lastRebalanceTime: number; // Unix timestamp
  nextRebalanceTime: number; // Unix timestamp
  timeRemaining: number; // seconds until next check
  status: 'ready' | 'waiting' | 'processing';
  totalAUM: number; // Total Assets Under Management in USDC
  currentSharpeRatio: number;
  targetSharpeRatio: number;
  sharpeImprovement: number; // percentage improvement
}

export interface RebalanceDecision {
  pools: PoolMetrics[];
  totalAllocationChange: number; // % of total funds moving
  expectedGasCost: number; // in USDC
  expectedBenefit: number; // expected additional APY in USDC annually
  benefitToCostRatio: number; // benefit / (gas + fees)
  projectedAnnualReturn: number; // new expected annual return in USDC
}

export interface RebalanceCondition {
  id: string;
  label: string;
  description: string;
  met: boolean;
  currentValue: number;
  requiredValue: number;
  unit: string;
}

export interface RebalanceConditions {
  timeDelaySatisfied: RebalanceCondition;
  improvementThresholdMet: RebalanceCondition;
  gasCostAcceptable: RebalanceCondition;
  backendServiceHealthy: RebalanceCondition;
  allConditionsMet: boolean;
}

export interface HistoricalRebalance {
  timestamp: number;
  poolsAffected: string[]; // pool addresses
  totalAmountMoved: number; // in USDC
  gasUsed: number;
  gasCostUSD: number;
  sharpeRatioBefore: number;
  sharpeRatioAfter: number;
  performanceImprovement: number; // %
  transactionHash: string;
}

export interface RebalanceHistory {
  rebalances: HistoricalRebalance[];
  totalRebalances: number;
  averageImprovement: number;
  totalGasCost: number;
}

export interface GaugeData {
  label: string;
  value: number; // 0-100
  status: 'good' | 'warning' | 'critical';
  description: string;
  rawValue?: number;
  targetValue?: number;
  unit?: string;
}

export interface AllocationChange {
  poolAddress: string;
  poolName: string;
  currentAmount: number;
  targetAmount: number;
  change: number;
  changePercent: number;
  direction: 'increase' | 'decrease' | 'stable';
  apy: number;
}

// WebSocket message types
export interface RebalanceWebSocketMessage {
  type: 'status_update' | 'rebalance_triggered' | 'rebalance_completed' | 'countdown_tick';
  data: any;
  timestamp: number;
}
