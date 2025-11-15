/**
 * useChains Hook
 *
 * Custom hook for fetching supported blockchain networks from the backend API.
 */

'use client';

import { useState, useEffect } from 'react';
import { fetchChains, ChainInfo } from '@/lib/api/pools';
import { APIError } from '@/lib/api-client';

interface UseChainsResult {
  chains: ChainInfo[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching supported chains
 *
 * @returns Chains data with loading and error states
 */
export function useChains(): UseChainsResult {
  const [chains, setChains] = useState<ChainInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchChains();
      setChains(data);
    } catch (err) {
      const errorMessage =
        err instanceof APIError
          ? err.message
          : 'Failed to fetch supported chains';
      setError(errorMessage);
      console.error('Error fetching chains:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    chains,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook for getting a specific chain by ID
 *
 * @param chainId Chain identifier
 * @returns Chain info or null if not found
 */
export function useChain(chainId: string): ChainInfo | null {
  const { chains } = useChains();
  return chains.find(chain => chain.id === chainId) || null;
}
