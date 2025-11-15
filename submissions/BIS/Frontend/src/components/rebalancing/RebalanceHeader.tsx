'use client';

import { useEffect, useState } from 'react';
import { RebalanceStatus } from '@/types/rebalancing';

interface RebalanceHeaderProps {
  status: RebalanceStatus;
  onRefresh?: () => void;
}

export default function RebalanceHeader({ status, onRefresh }: RebalanceHeaderProps) {
  const [timeRemaining, setTimeRemaining] = useState(status.timeRemaining);

  // Countdown timer
  useEffect(() => {
    setTimeRemaining(status.timeRemaining);

    const interval = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [status.timeRemaining]);

  // Format time remaining as MM:SS
  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage (0-100)
  const progressPercentage = status.timeRemaining > 0
    ? ((3600 - timeRemaining) / 3600) * 100
    : 100;

  // Status badge styling
  const getStatusBadge = () => {
    switch (status.status) {
      case 'ready':
        return (
          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
            ✓ Ready to Rebalance
          </span>
        );
      case 'processing':
        return (
          <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium animate-pulse">
            ⏳ Processing
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded-full text-sm font-medium">
            ⏸ On Schedule
          </span>
        );
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
      {/* Top row: Title and status */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Rebalancing Monitor</h1>
          <p className="text-gray-400 text-sm">
            Real-time pool switching decision system
          </p>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge()}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900/50 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Total AUM</p>
          <p className="text-white text-xl font-bold">
            ${status.totalAUM.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Current Sharpe</p>
          <p className="text-white text-xl font-bold">{status.currentSharpeRatio.toFixed(2)}</p>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Target Sharpe</p>
          <p className="text-green-400 text-xl font-bold">{status.targetSharpeRatio.toFixed(2)}</p>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Improvement</p>
          <p className={`text-xl font-bold ${status.sharpeImprovement >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {status.sharpeImprovement >= 0 ? '+' : ''}
            {status.sharpeImprovement.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Countdown timer */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-400 text-sm">
            {timeRemaining > 0 ? 'Time Until Next Check' : 'Ready for Rebalance'}
          </p>
          <p className="text-white font-mono text-lg font-bold">
            {timeRemaining > 0 ? formatTimeRemaining(timeRemaining) : '00:00'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              status.status === 'ready'
                ? 'bg-green-500'
                : 'bg-gradient-to-r from-blue-500 to-purple-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Last rebalance info */}
        <p className="text-gray-500 text-xs mt-2">
          Last rebalance:{' '}
          {new Date(status.lastRebalanceTime * 1000).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
