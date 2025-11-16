/**
 * usePoolData Hook
 *
 * Custom hook for fetching and managing pool data from the backend API.
 * Includes auto-refresh, loading states, and error handling.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchPools,
  fetchPoolsByChain,
  PoolData,
  PoolQueryParams,
} from '@/lib/api/pools';
import { APIError } from '@/lib/api-client';

const REFRESH_INTERVAL = parseInt(
  process.env.NEXT_PUBLIC_REFRESH_INTERVAL || '30000'
); // Default: 30 seconds

interface UsePoolDataResult {
  pools: PoolData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

/**
 * Hook for fetching pool data
 *
 * @param params Query parameters for filtering pools
 * @param options Hook options
 * @returns Pool data with loading and error states
 */
export function usePoolData(
  params?: PoolQueryParams,
  options: {
    autoRefresh?: boolean;
    refreshInterval?: number;
  } = {}
): UsePoolDataResult {
  const { autoRefresh = true, refreshInterval = REFRESH_INTERVAL } = options;

  const [pools, setPools] = useState<PoolData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchPools(params);
      setPools(data);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage =
        err instanceof APIError
          ? err.message
          : 'Failed to fetch pool data';
      setError(errorMessage);
      console.error('Error fetching pools:', err);
    } finally {
      setLoading(false);
    }
    // Use JSON.stringify for stable dependency comparison of params object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  return {
    pools,
    loading,
    error,
    refetch: fetchData,
    lastUpdated,
  };
}

/**
 * Hook for fetching pools by chain
 *
 * @param chain Chain identifier (e.g., 'ethereum')
 * @param options Hook options
 * @returns Pool data filtered by chain
 */
export function usePoolsByChain(
  chain: string,
  options: {
    autoRefresh?: boolean;
    refreshInterval?: number;
  } = {}
): UsePoolDataResult {
  return usePoolData({ chain }, options);
}

/**
 * Hook for fetching top pools by TVL
 *
 * @param limit Maximum number of pools
 * @param options Hook options
 * @returns Top pools sorted by TVL
 */
export function useTopPoolsByTVL(
  limit: number = 10,
  options: {
    autoRefresh?: boolean;
    refreshInterval?: number;
  } = {}
): UsePoolDataResult {
  const result = usePoolData({ limit }, options);

  // Sort by TVL descending
  const sortedPools = [...result.pools].sort((a, b) => b.tvl - a.tvl);

  return {
    ...result,
    pools: sortedPools,
  };
}

/**
 * Hook for fetching top pools by APY
 *
 * @param limit Maximum number of pools
 * @param options Hook options
 * @returns Top pools sorted by APY
 */
export function useTopPoolsByAPY(
  limit: number = 10,
  options: {
    autoRefresh?: boolean;
    refreshInterval?: number;
  } = {}
): UsePoolDataResult {
  const result = usePoolData({ limit }, options);

  // Sort by APY descending
  const sortedPools = [...result.pools].sort((a, b) => b.apy - a.apy);

  return {
    ...result,
    pools: sortedPools,
  };
}
