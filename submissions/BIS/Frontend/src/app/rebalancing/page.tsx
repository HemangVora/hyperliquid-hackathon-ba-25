'use client';

import { useState, useEffect } from 'react';
import RebalanceHeader from '@/components/rebalancing/RebalanceHeader';
import DecisionGauges from '@/components/rebalancing/DecisionGauges';
import PoolComparisonTable from '@/components/rebalancing/PoolComparisonTable';
import SwitchPrediction from '@/components/rebalancing/SwitchPrediction';
import RebalanceHistory from '@/components/rebalancing/RebalanceHistory';
import ConditionsChecklist from '@/components/rebalancing/ConditionsChecklist';
import {
  RebalanceStatus,
  RebalanceDecision,
  RebalanceConditions,
  RebalanceHistory as RebalanceHistoryType,
} from '@/types/rebalancing';

// API base URL - update this to match your backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function RebalancingPage() {
  const [status, setStatus] = useState<RebalanceStatus | null>(null);
  const [decision, setDecision] = useState<RebalanceDecision | null>(null);
  const [conditions, setConditions] = useState<RebalanceConditions | null>(null);
  const [history, setHistory] = useState<RebalanceHistoryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all endpoints in parallel
      const [statusRes, decisionRes, conditionsRes, historyRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/rebalance/status`),
        fetch(`${API_BASE_URL}/api/rebalance/decision`),
        fetch(`${API_BASE_URL}/api/rebalance/conditions`),
        fetch(`${API_BASE_URL}/api/rebalance/history`),
      ]);

      if (!statusRes.ok || !decisionRes.ok || !conditionsRes.ok || !historyRes.ok) {
        throw new Error('Failed to fetch rebalancing data');
      }

      const [statusData, decisionData, conditionsData, historyData] = await Promise.all([
        statusRes.json(),
        decisionRes.json(),
        conditionsRes.json(),
        historyRes.json(),
      ]);

      setStatus(statusData);
      setDecision(decisionData);
      setConditions(conditionsData);
      setHistory(historyData);
    } catch (err) {
      console.error('Error fetching rebalancing data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchData();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);

    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (loading && !status) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4" />
              <p className="text-gray-400">Loading rebalancing monitor...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
            <h2 className="text-red-400 font-bold text-xl mb-2">Error Loading Data</h2>
            <p className="text-gray-300">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        {status && <RebalanceHeader status={status} onRefresh={fetchData} />}

        {/* Decision Gauges */}
        {conditions && (
          <DecisionGauges
            conditions={conditions}
            allocationChangePct={decision?.totalAllocationChange || 0}
          />
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conditions Checklist */}
          {conditions && <ConditionsChecklist conditions={conditions} />}

          {/* Switch Prediction */}
          {decision && <SwitchPrediction decision={decision} />}
        </div>

        {/* Pool Comparison Table */}
        {decision && <PoolComparisonTable pools={decision.pools} />}

        {/* Rebalance History */}
        {history && <RebalanceHistory history={history} />}

        {/* Footer info */}
        <div className="text-center text-gray-500 text-sm py-4">
          <p>Auto-refreshing every 10 seconds • Last updated: {new Date().toLocaleTimeString()}</p>
          <p className="mt-1">
            Backend API: {API_BASE_URL} •{' '}
            <a
              href={`${API_BASE_URL}/api/health`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              Health Check
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
