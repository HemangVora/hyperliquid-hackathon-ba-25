/**
 * Transaction history hook
 * Fetches and formats transaction events from the vault contract
 */

import { useAccount, useReadContract, useBlockNumber } from 'wagmi';
import { CONTRACTS, YieldOptimizerABI } from '@/contracts';
import type { TransactionEvent } from '@/contracts/types';
import { useEffect, useState } from 'react';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { hyperLiquid } from '@/lib/chains';

/**
 * Fetch transaction history from contract events
 */
export function useTransactionHistory() {
  const { address } = useAccount();
  const [events, setEvents] = useState<TransactionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current block number for determining how far back to fetch
  const { data: currentBlock } = useBlockNumber({
    watch: true,
  });

  useEffect(() => {
    if (!address || !currentBlock) return;

    const fetchEvents = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const publicClient = createPublicClient({
          chain: hyperLiquid,
          transport: http(),
        });

        // Calculate block range (last ~7 days, assuming 2s blocks = ~302,400 blocks)
        const fromBlock = currentBlock > 302400n ? currentBlock - 302400n : 0n;

        // Fetch DepositRequested events
        const depositRequestedLogs = await publicClient.getLogs({
          address: CONTRACTS.YIELD_OPTIMIZER,
          event: parseAbiItem(
            'event DepositRequested(address indexed user, uint256 assets, uint256 epoch)'
          ),
          args: { user: address },
          fromBlock,
          toBlock: currentBlock,
        });

        // Fetch DepositProcessed events
        const depositProcessedLogs = await publicClient.getLogs({
          address: CONTRACTS.YIELD_OPTIMIZER,
          event: parseAbiItem(
            'event DepositProcessed(address indexed user, uint256 assets, uint256 shares)'
          ),
          args: { user: address },
          fromBlock,
          toBlock: currentBlock,
        });

        // Fetch RedeemRequested events
        const redeemRequestedLogs = await publicClient.getLogs({
          address: CONTRACTS.YIELD_OPTIMIZER,
          event: parseAbiItem(
            'event RedeemRequested(address indexed user, uint256 shares, uint256 epoch)'
          ),
          args: { user: address },
          fromBlock,
          toBlock: currentBlock,
        });

        // Fetch RedeemProcessed events
        const redeemProcessedLogs = await publicClient.getLogs({
          address: CONTRACTS.YIELD_OPTIMIZER,
          event: parseAbiItem(
            'event RedeemProcessed(address indexed user, uint256 shares, uint256 assets)'
          ),
          args: { user: address },
          fromBlock,
          toBlock: currentBlock,
        });

        // Format events
        const formattedEvents: TransactionEvent[] = [
          ...depositRequestedLogs.map((log) => ({
            type: 'deposit' as const,
            user: log.args.user!,
            amount: log.args.assets!,
            epoch: log.args.epoch,
            timestamp: 0, // Will be filled with block timestamp if needed
            txHash: log.transactionHash!,
            blockNumber: log.blockNumber,
          })),
          ...depositProcessedLogs.map((log) => ({
            type: 'claim-deposit' as const,
            user: log.args.user!,
            amount: log.args.assets!,
            shares: log.args.shares,
            timestamp: 0,
            txHash: log.transactionHash!,
            blockNumber: log.blockNumber,
          })),
          ...redeemRequestedLogs.map((log) => ({
            type: 'withdraw' as const,
            user: log.args.user!,
            amount: log.args.shares!,
            epoch: log.args.epoch,
            timestamp: 0,
            txHash: log.transactionHash!,
            blockNumber: log.blockNumber,
          })),
          ...redeemProcessedLogs.map((log) => ({
            type: 'claim-withdraw' as const,
            user: log.args.user!,
            amount: log.args.assets!,
            shares: log.args.shares,
            timestamp: 0,
            txHash: log.transactionHash!,
            blockNumber: log.blockNumber,
          })),
        ];

        // Sort by block number (most recent first)
        formattedEvents.sort((a, b) => Number(b.blockNumber - a.blockNumber));

        setEvents(formattedEvents);
      } catch (err) {
        console.error('Error fetching transaction history:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [address, currentBlock]);

  return {
    events,
    isLoading,
    error,
  };
}

/**
 * Get user's portfolio summary (hook combining position and value data)
 */
export function useUserPortfolio() {
  const { address } = useAccount();
  const { events, isLoading: historyLoading } = useTransactionHistory();

  // You can extend this to calculate portfolio metrics
  const portfolioMetrics = {
    totalDeposited: events
      .filter((e) => e.type === 'deposit')
      .reduce((sum, e) => sum + e.amount, 0n),
    totalWithdrawn: events
      .filter((e) => e.type === 'claim-withdraw')
      .reduce((sum, e) => sum + e.amount, 0n),
    transactionCount: events.length,
  };

  return {
    address,
    events,
    metrics: portfolioMetrics,
    isLoading: historyLoading,
  };
}
