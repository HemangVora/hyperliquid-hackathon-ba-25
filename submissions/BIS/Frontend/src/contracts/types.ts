/**
 * TypeScript types for smart contract interactions
 */

export interface VaultPosition {
  shares: bigint;
  assets: bigint;
  pendingDeposit: bigint;
  pendingRedeem: bigint;
}

export interface DepositRequest {
  amount: bigint;
  epoch: bigint;
  timestamp: number;
}

export interface RedeemRequest {
  shares: bigint;
  epoch: bigint;
  timestamp: number;
}

export interface TransactionEvent {
  type: 'deposit' | 'withdraw' | 'claim-deposit' | 'claim-withdraw';
  user: string;
  amount: bigint;
  shares?: bigint;
  epoch?: bigint;
  timestamp: number;
  txHash: string;
  blockNumber: bigint;
}

export interface VaultStats {
  totalAssets: bigint;
  totalShares: bigint;
  sharePrice: bigint;
  performanceFee: bigint;
  currentEpoch: bigint;
}

export interface UserPortfolio {
  position: VaultPosition;
  usdcBalance: bigint;
  usdcAllowance: bigint;
  transactions: TransactionEvent[];
}

// Transaction states for UI
export enum TransactionStatus {
  IDLE = 'idle',
  PENDING = 'pending',
  CONFIRMING = 'confirming',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface TransactionState {
  status: TransactionStatus;
  hash?: string;
  error?: string;
}
