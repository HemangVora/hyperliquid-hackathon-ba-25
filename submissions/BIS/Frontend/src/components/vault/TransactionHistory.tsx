'use client';

import { ExternalLink, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle } from 'lucide-react';
import { useTransactionHistory } from '@/hooks/useTransactionHistory';
import { formatUSDC, formatShares } from '@/hooks/useVaultTransactions';
import type { TransactionEvent } from '@/contracts/types';

const getEventIcon = (type: TransactionEvent['type']) => {
  switch (type) {
    case 'deposit':
      return <ArrowDownCircle className="w-5 h-5 text-emerald-500" />;
    case 'claim-deposit':
      return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    case 'withdraw':
      return <ArrowUpCircle className="w-5 h-5 text-red-500" />;
    case 'claim-withdraw':
      return <CheckCircle className="w-5 h-5 text-red-500" />;
  }
};

const getEventLabel = (type: TransactionEvent['type']) => {
  switch (type) {
    case 'deposit':
      return 'Deposit Requested';
    case 'claim-deposit':
      return 'Shares Claimed';
    case 'withdraw':
      return 'Withdrawal Requested';
    case 'claim-withdraw':
      return 'USDC Claimed';
  }
};

const getEventColor = (type: TransactionEvent['type']) => {
  switch (type) {
    case 'deposit':
    case 'claim-deposit':
      return 'text-emerald-400';
    case 'withdraw':
    case 'claim-withdraw':
      return 'text-red-400';
  }
};

export function TransactionHistory() {
  const { events, isLoading, error } = useTransactionHistory();

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Transaction History</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-gray-700/30 rounded-lg">
              <div className="w-10 h-10 bg-gray-600 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-600 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-600 rounded w-1/4"></div>
              </div>
              <div className="h-5 bg-gray-600 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Transaction History</h3>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400 text-sm">Error loading transaction history: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h3 className="text-xl font-bold text-white mb-4">Transaction History</h3>

      {events.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No transactions yet</p>
          <p className="text-sm text-gray-500 mt-1">Your transaction history will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event, index) => (
            <div
              key={`${event.txHash}-${index}`}
              className="flex items-center gap-4 p-4 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              {/* Icon */}
              <div className="flex-shrink-0">{getEventIcon(event.type)}</div>

              {/* Event Details */}
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${getEventColor(event.type)}`}>
                  {getEventLabel(event.type)}
                </p>
                <p className="text-sm text-gray-500">
                  Block #{event.blockNumber.toString()}
                  {event.epoch && ` • Epoch ${event.epoch.toString()}`}
                </p>
              </div>

              {/* Amount */}
              <div className="text-right">
                <p className="font-semibold text-white">
                  {event.type === 'withdraw' || event.shares
                    ? event.type === 'claim-withdraw' || event.type === 'withdraw'
                      ? event.shares
                        ? `${formatShares(event.shares)} BIS-YO`
                        : `${formatShares(event.amount)} BIS-YO`
                      : event.shares
                      ? `${formatShares(event.shares)} BIS-YO`
                      : `${formatUSDC(event.amount)} USDC`
                    : `${formatUSDC(event.amount)} USDC`}
                </p>
                <a
                  href={`https://explorer.hyperliquid.xyz/tx/${event.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-emerald-400 inline-flex items-center gap-1 mt-1"
                >
                  View <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
