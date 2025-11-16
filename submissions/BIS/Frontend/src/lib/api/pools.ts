/**
 * Pool API Functions
 *
 * Functions for fetching pool data, TVL, and APY from the backend API.
 */

import { apiClient, APIResponse } from '../api-client';

// ============================================
// Types
// ============================================

export interface ChainInfo {
  id: string;
  name: string;
  chain_id: number;
  native_token: string;
  color?: string;
  explorer_url: string;
}

export interface PoolData {
  pool_address: string;
  lp_token_address?: string;
  chain: string;
  name?: string;
  token_pair?: string;
  tvl: number;
  apy: number;
  risk_level?: 'low' | 'medium' | 'high';
  protocol?: string;
  status: string;
}

export interface TVLData {
  pool_address: string;
  chain: string;
  tvl: number;
  timestamp: string;
}

export interface APYDataPoint {
  date: string;
  apy: number;
}

export interface HistoricalAPY {
  pool_address: string;
  chain: string;
  current_apy: number;
  timeframe: string;
  historical: APYDataPoint[];
}

export interface PoolsResponse {
  pools: PoolData[];
  total: number;
  chain?: string;
}

export interface ChainsResponse {
  chains: ChainInfo[];
  total: number;
}

export interface TVLResponse {
  success: boolean;
  data: TVLData;
}

export interface APYResponse {
  success: boolean;
  data: HistoricalAPY;
}

export interface PoolQueryParams {
  chain?: string;
  min_tvl?: number;
  min_apy?: number;
  limit?: number;
}

// ============================================
// Chain API Functions
// ============================================

/**
 * Get list of supported blockchain networks
 */
export async function fetchChains(): Promise<ChainInfo[]> {
  const response = await apiClient.get<ChainsResponse>('/chains');
  return response.chains;
}

/**
 * Get chain by ID
 */
export async function fetchChain(chainId: string): Promise<ChainInfo | null> {
  const chains = await fetchChains();
  return chains.find(chain => chain.id === chainId) || null;
}

// ============================================
// Pool API Functions
// ============================================

/**
 * Get list of pools
 *
 * @param params Query parameters for filtering pools
 * @returns List of pools with TVL and APY data
 */
export async function fetchPools(params?: PoolQueryParams): Promise<PoolData[]> {
  const response = await apiClient.get<PoolsResponse>('/pools', params);
  return response.pools;
}

/**
 * Get pools for a specific chain
 *
 * @param chain Chain identifier (e.g., 'ethereum')
 * @returns List of pools on the specified chain
 */
export async function fetchPoolsByChain(chain: string): Promise<PoolData[]> {
  return fetchPools({ chain });
}

/**
 * Get TVL for a specific pool
 *
 * @param poolAddress Pool contract address
 * @param chain Chain identifier
 * @returns TVL data
 */
export async function fetchPoolTVL(
  poolAddress: string,
  chain: string
): Promise<TVLData> {
  const response = await apiClient.get<TVLResponse>(
    `/pools/${poolAddress}/tvl`,
    { chain }
  );
  return response.data;
}

/**
 * Get historical APY for a specific pool
 *
 * @param poolAddress Pool contract address
 * @param chain Chain identifier
 * @param timeframe Timeframe for historical data (e.g., '7d', '30d')
 * @returns Historical APY data
 */
export async function fetchPoolAPY(
  poolAddress: string,
  chain: string,
  timeframe: string = '7d'
): Promise<HistoricalAPY> {
  const response = await apiClient.get<APYResponse>(
    `/pools/${poolAddress}/apy`,
    { chain, timeframe }
  );
  return response.data;
}

/**
 * Get pools with minimum TVL filter
 *
 * @param minTVL Minimum TVL in USD
 * @returns Filtered pools
 */
export async function fetchHighTVLPools(minTVL: number): Promise<PoolData[]> {
  return fetchPools({ min_tvl: minTVL });
}

/**
 * Get pools with minimum APY filter
 *
 * @param minAPY Minimum APY percentage
 * @returns Filtered pools
 */
export async function fetchHighAPYPools(minAPY: number): Promise<PoolData[]> {
  return fetchPools({ min_apy: minAPY });
}

/**
 * Get top pools by TVL across all chains
 *
 * @param limit Maximum number of pools to return
 * @returns Top pools sorted by TVL
 */
export async function fetchTopPoolsByTVL(limit: number = 10): Promise<PoolData[]> {
  const pools = await fetchPools({ limit: 500 }); // Fetch more than needed
  return pools.sort((a, b) => b.tvl - a.tvl).slice(0, limit);
}

/**
 * Get top pools by APY across all chains
 *
 * @param limit Maximum number of pools to return
 * @returns Top pools sorted by APY
 */
export async function fetchTopPoolsByAPY(limit: number = 10): Promise<PoolData[]> {
  const pools = await fetchPools({ limit: 500 }); // Fetch more than needed
  return pools.sort((a, b) => b.apy - a.apy).slice(0, limit);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format TVL value for display
 *
 * @param tvl TVL value in USD
 * @returns Formatted string (e.g., "$1.2M")
 */
export function formatTVL(tvl: number): string {
  if (tvl >= 1_000_000_000) {
    return `$${(tvl / 1_000_000_000).toFixed(2)}B`;
  } else if (tvl >= 1_000_000) {
    return `$${(tvl / 1_000_000).toFixed(2)}M`;
  } else if (tvl >= 1_000) {
    return `$${(tvl / 1_000).toFixed(2)}K`;
  } else {
    return `$${tvl.toFixed(2)}`;
  }
}

/**
 * Format APY value for display
 *
 * @param apy APY percentage
 * @returns Formatted string (e.g., "12.5%")
 */
export function formatAPY(apy: number): string {
  return `${apy.toFixed(2)}%`;
}

/**
 * Get risk level color for UI
 *
 * @param riskLevel Risk level
 * @returns Tailwind color class
 */
export function getRiskLevelColor(riskLevel?: string): string {
  switch (riskLevel) {
    case 'low':
      return 'text-emerald-500';
    case 'medium':
      return 'text-yellow-500';
    case 'high':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}

/**
 * Get risk level badge background color
 *
 * @param riskLevel Risk level
 * @returns Tailwind background color class
 */
export function getRiskLevelBadgeColor(riskLevel?: string): string {
  switch (riskLevel) {
    case 'low':
      return 'bg-emerald-500/10 text-emerald-500';
    case 'medium':
      return 'bg-yellow-500/10 text-yellow-500';
    case 'high':
      return 'bg-red-500/10 text-red-500';
    default:
      return 'bg-gray-500/10 text-gray-500';
  }
}

/**
 * Calculate total TVL across multiple pools
 *
 * @param pools List of pools
 * @returns Total TVL
 */
export function calculateTotalTVL(pools: PoolData[]): number {
  return pools.reduce((sum, pool) => sum + pool.tvl, 0);
}

/**
 * Calculate weighted average APY across multiple pools
 *
 * @param pools List of pools
 * @returns Weighted average APY
 */
export function calculateWeightedAverageAPY(pools: PoolData[]): number {
  if (pools.length === 0) return 0;

  const totalTVL = calculateTotalTVL(pools);
  if (totalTVL === 0) return 0;

  const weightedSum = pools.reduce((sum, pool) => {
    return sum + (pool.apy * pool.tvl);
  }, 0);

  return weightedSum / totalTVL;
}
