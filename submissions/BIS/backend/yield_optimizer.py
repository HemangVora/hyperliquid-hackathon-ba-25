#!/usr/bin/env python3
"""
BIS Yield Optimizer - Backend Service

This service:
1. Queries GlueX Yields API to find highest APY opportunities
2. Calculates optimal allocations based on risk/reward
3. Executes rebalancing via smart contract
4. Monitors performance and collects metrics
"""

import os
import time
import logging
from typing import List, Dict, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta

import requests
from web3 import Web3
from web3.contract import Contract
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ==================== CONFIGURATION CONSTANTS ====================

# Liquidity constraints
MIN_TVL = 0  # Minimum pool TVL in USDC (set to 0 since TVL data unavailable from API)
MAX_CONCENTRATION = 0.20  # Maximum 20% of any pool's TVL

# Rebalancing constraints
MIN_REBALANCE_HOURS = 24  # Conservative switching: 24 hours minimum
SCORE_IMPROVEMENT_THRESHOLD = 0.25  # Must be 25% better to switch
GAS_ROI_MULTIPLE = 3.0  # Expected benefit must be 3x gas cost

# Scoring parameters
APY_CAP = 50.0  # Cap APY at 50% for normalization (prevents unrealistic values)
RISK_FREE_RATE = 4.0  # Risk-free rate in percentage
MAX_VOLATILITY = 10.0  # Maximum expected volatility for normalization
MAX_DRAWDOWN_CAP = 20.0  # Maximum drawdown cap for normalization

# Composite score weights (must sum to 1.0)
WEIGHT_APY = 0.40  # 40% weight on returns
WEIGHT_RISK = 0.25  # 25% weight on risk/volatility
WEIGHT_LIQUIDITY = 0.20  # 20% weight on liquidity/TVL
WEIGHT_SAFETY = 0.10  # 10% weight on track record/safety
WEIGHT_GAS = 0.05  # 5% weight on gas efficiency

# Risk component sub-weights (within the 25% risk weight)
RISK_VOLATILITY_WEIGHT = 0.60  # 60% of risk score from volatility
RISK_DRAWDOWN_WEIGHT = 0.40  # 40% of risk score from max drawdown

# Safety component sub-weights (within the 10% safety weight)
SAFETY_TRACK_RECORD_WEIGHT = 0.50  # 50% from track record
SAFETY_STABILITY_PATTERN_WEIGHT = 0.30  # 30% from stability patterns
SAFETY_CONTRACT_WEIGHT = 0.20  # 20% from contract safety (whitelist)

# Gas cost parameters
GAS_EFFICIENT_THRESHOLD = 100_000  # Gas usage below this = efficient
GAS_ACCEPTABLE_THRESHOLD = 200_000  # Gas usage below this = acceptable
GAS_EXPENSIVE_THRESHOLD = 300_000  # Gas usage above this = expensive

# ================================================================


@dataclass
class VaultMetrics:
    """Metrics for a single vault with composite scoring"""
    address: str
    apy: float
    tvl: float
    historical_apys: List[float]

    # Calculated metrics
    volatility: float
    max_drawdown: float
    composite_score: float

    # Component scores (for debugging/transparency)
    apy_component: float
    risk_component: float
    liquidity_component: float
    safety_component: float
    gas_component: float

    # Legacy (for comparison)
    sharpe_ratio: float = 0.0


@dataclass
class AllocationTarget:
    """Target allocation for a vault"""
    address: str
    amount: int  # in wei
    percentage: float


class GlueXClient:
    """Client for interacting with GlueX APIs"""
    
    def __init__(self, api_key: str, base_url: str = "https://yield-api.gluex.xyz"):
        self.api_key = api_key
        self.base_url = base_url
        # GlueX network configuration (can be overridden via env)
        # Default to Ethereum mainnet which hosts the GlueX vaults.
        self.chain = os.getenv("GLUEX_CHAIN", "hyperevm")
        # Optional: specific input token (e.g. USDC) for yield calculations
        self.input_token = os.getenv("GLUEX_INPUT_TOKEN")
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })
    
    @staticmethod
    def _safe_float(value, default: float = 0.0) -> float:
        """Safely extract a float from a value that might be nested in a dict."""
        if value is None:
            return default
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            try:
                return float(value)
            except ValueError:
                return default
        if isinstance(value, dict):
            # Try common keys for numeric values
            for key in ["value", "apy", "amount", "tvl", "tvl_usd"]:
                if key in value:
                    return GlueXClient._safe_float(value[key], default)
            return default
        return default
    
    def get_historical_apy(
        self, 
        vaults: List[str], 
        timeframe: str = "7d"
    ) -> Dict[str, Dict]:
        """
        Query GlueX Yields API for historical APY data
        
        Docs: https://docs.gluex.xyz/api-reference/yield-api/post-historical-apy
        """
        results: Dict[str, Dict] = {}

        for vault in vaults:
            vault_lower = vault.lower()
            normalized_vault = vault_lower

            tvl_value = 0.0
            apy_value = 0.0
            historical_apys: List[float] = []

            # 1) Fetch TVL (best effort) - Note: TVL endpoint not documented in GlueX API
            # Keeping TVL=0 for all vaults as the /tvl endpoint returns 422 errors
            # TODO: Check if TVL is available through another endpoint or on-chain
            tvl_value = 0.0
            
            # Commenting out failing TVL fetch:
            # tvl_payload = {
            #     "chain": self.chain,
            #     "pool_address": normalized_vault,
            #     "lp_token_address": normalized_vault,
            # }
            # try:
            #     tvl_response = self.session.post(
            #         f"{self.base_url}/tvl",
            #         json=tvl_payload,
            #         timeout=10,
            #     )
            #     if tvl_response.status_code == 404:
            #         logger.debug(f"TVL not found for vault {vault[:10]}...")
            #     else:
            #         tvl_response.raise_for_status()
            #         tvl_json = tvl_response.json()
            #         tvl_container = tvl_json.get("tvl", tvl_json)
            #         tvl_value = self._safe_float(tvl_container, 0.0)
            # except requests.RequestException as e:
            #     logger.debug(f"Failed to fetch TVL for {vault}: {e}")

            # 2) Fetch historical APY (required)
            hist_payload = {
                "chain": self.chain,
                "pool_address": normalized_vault,
            }
            if self.input_token:
                hist_payload["input_token"] = self.input_token

            try:
                hist_response = self.session.post(
                    f"{self.base_url}/historical-apy",
                    json=hist_payload,
                    timeout=10,
                )
                hist_response.raise_for_status()
                hist_json = hist_response.json()

                # Debug: log the response to see what we're getting
                logger.debug(f"GlueX historical APY response for {vault[:10]}...: {hist_json}")

                historic_yield = hist_json.get("historic_yield") or hist_json.get("historicYield") or hist_json

                if isinstance(historic_yield, dict):
                    # Use safe_float to handle nested dicts or various types
                    apy_raw = historic_yield.get("apy", historic_yield.get("average_apy"))
                    apy_value = self._safe_float(apy_raw, 0.0)
                    
                    history = (
                        historic_yield.get("history")
                        or historic_yield.get("historic_apy")
                        or historic_yield.get("points")
                    )
                    if isinstance(history, list):
                        for point in history:
                            if isinstance(point, dict) and "apy" in point:
                                apy_point = self._safe_float(point["apy"], None)
                                if apy_point is not None:
                                    historical_apys.append(apy_point)
                elif isinstance(historic_yield, list):
                    for point in historic_yield:
                        if isinstance(point, dict) and "apy" in point:
                            apy_point = self._safe_float(point["apy"], None)
                            if apy_point is not None:
                                historical_apys.append(apy_point)
                    if historical_apys:
                        apy_value = historical_apys[-1]

                results[vault_lower] = {
                    "apy": apy_value,
                    "tvl": tvl_value,
                    "historical": historical_apys,
                }

                tvl_display = f"${tvl_value:,.0f}" if tvl_value > 0 else "N/A"
                logger.info(
                    f"Fetched GlueX yields for vault {vault[:10]}... - "
                    f"APY {apy_value:.2f}%, TVL {tvl_display}"
                )

            except requests.RequestException as e:
                logger.error(f"Failed to fetch historical APY data for {vault}: {e}")

        return results
    
    def get_quote(
        self,
        token_in: str,
        token_out: str,
        amount_in: int,
        slippage_bps: int = 50
    ) -> Dict:
        """
        Get a quote for reallocation using GlueX Router API
        
        Docs: https://docs.gluex.xyz/api-reference/router-api/post-quote
        """
        try:
            # Router API uses a different base URL than Yield API
            router_url = "https://router.gluex.xyz/v1"
            response = self.session.post(
                f"{router_url}/quote",
                json={
                    "tokenIn": token_in,
                    "tokenOut": token_out,
                    "amountIn": amount_in,
                    "slippageBps": slippage_bps
                }
            )
            response.raise_for_status()
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Failed to get quote: {e}")
            return {}


class YieldOptimizer:
    """Main yield optimization service"""
    
    # GlueX Vault addresses from task requirements
    GLUEX_VAULTS = [
        "0xe25514992597786e07872e6c5517fe1906c0cadd",
        "0xcdc3975df9d1cf054f44ed238edfb708880292ea",
        "0x8f9291606862eef771a97e5b71e4b98fd1fa216a",
        "0x9f75eac57d1c6f7248bd2aede58c95689f3827f7",
        "0x63cf7ee583d9954febf649ad1c40c97a6493b1be"
    ]
    
    def __init__(
        self,
        rpc_url: str,
        private_key: str,
        vault_address: str,
        gluex_api_key: str,
        min_rebalance_interval: int = 86400  # 24 hours (conservative switching)
    ):
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.account = self.w3.eth.account.from_key(private_key)
        self.vault_address = Web3.to_checksum_address(vault_address)
        self.min_rebalance_interval = min_rebalance_interval
        
        # Initialize GlueX client
        self.gluex = GlueXClient(gluex_api_key)
        
        # Load vault contract
        self.vault = self._load_vault_contract()
        
        # Last rebalance timestamp
        self.last_rebalance = 0
        
        logger.info(f"YieldOptimizer initialized for vault {vault_address}")
        logger.info(f"Operator account: {self.account.address}")
    
    def _load_vault_contract(self) -> Contract:
        """Load the YieldOptimizer contract"""
        
        # Minimal ABI for the functions we need
        abi = [
            {
                "inputs": [
                    {"internalType": "address[]", "name": "targetVaults", "type": "address[]"},
                    {"internalType": "uint256[]", "name": "targetAmounts", "type": "uint256[]"}
                ],
                "name": "rebalance",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "totalAssets",
                "outputs": [{"internalType": "uint256", "name": "total", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "getWhitelistedVaults",
                "outputs": [{"internalType": "address[]", "name": "activeVaults", "type": "address[]"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "lastRebalance",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            }
        ]
        
        return self.w3.eth.contract(
            address=self.vault_address,
            abi=abi
        )
    
    def get_vault_metrics(
        self,
        vaults: List[str],
        vault_total_assets: float,
        whitelisted_vaults: List[str]
    ) -> List[VaultMetrics]:
        """
        Fetch and calculate comprehensive metrics for all vaults using composite scoring.

        Args:
            vaults: List of vault addresses to evaluate
            vault_total_assets: Total assets in our optimizer vault
            whitelisted_vaults: List of approved vault addresses

        Returns:
            List of VaultMetrics with composite scores
        """
        logger.info(f"Fetching metrics for {len(vaults)} vaults...")

        # Get historical APY data from GlueX
        apy_data = self.gluex.get_historical_apy(vaults)

        metrics = []
        for vault in vaults:
            vault = Web3.to_checksum_address(vault)

            # Get data from GlueX API response
            vault_data = apy_data.get(vault.lower(), {})

            apy = vault_data.get("apy", 0) / 100  # Convert to decimal
            tvl = vault_data.get("tvl", 0)
            historical_apys = vault_data.get("historical", [])

            # Skip vaults below minimum TVL threshold
            if tvl < MIN_TVL:
                logger.warning(
                    f"Skipping {vault[:10]}... - TVL ${tvl:,.0f} below minimum ${MIN_TVL:,.0f}"
                )
                continue

            # Calculate volatility and max drawdown
            volatility = self._calculate_volatility(historical_apys) if historical_apys else 0.1
            max_drawdown = self._calculate_max_drawdown(historical_apys) if historical_apys else 0.0

            # Calculate composite score
            composite_score, components = self._calculate_composite_score(
                apy=apy,
                historical_apys=historical_apys,
                tvl=tvl,
                vault_total_assets=vault_total_assets,
                whitelisted_vaults=whitelisted_vaults,
                vault_address=vault
            )

            # Legacy Sharpe ratio for comparison
            risk_free_rate = RISK_FREE_RATE / 100
            sharpe_ratio = (apy - risk_free_rate) / volatility if volatility > 0 else 0

            metrics.append(VaultMetrics(
                address=vault,
                apy=apy,
                tvl=tvl,
                historical_apys=historical_apys,
                volatility=volatility,
                max_drawdown=max_drawdown,
                composite_score=composite_score,
                apy_component=components['apy'],
                risk_component=components['risk'],
                liquidity_component=components['liquidity'],
                safety_component=components['safety'],
                gas_component=components['gas'],
                sharpe_ratio=sharpe_ratio
            ))

            logger.info(
                f"Vault {vault[:10]}... - "
                f"APY: {apy*100:.2f}%, "
                f"TVL: ${tvl:,.0f}, "
                f"Composite: {composite_score:.3f}, "
                f"Sharpe: {sharpe_ratio:.2f}"
            )
            logger.debug(
                f"  Components - APY:{components['apy']:.3f} "
                f"Risk:{components['risk']:.3f} Liq:{components['liquidity']:.3f} "
                f"Safety:{components['safety']:.3f} Gas:{components['gas']:.3f}"
            )

        return metrics
    
    def _calculate_volatility(self, historical_apys: List[float]) -> float:
        """Calculate standard deviation of historical APYs"""
        if len(historical_apys) < 2:
            return 0.1  # Default volatility

        mean = sum(historical_apys) / len(historical_apys)
        variance = sum((x - mean) ** 2 for x in historical_apys) / len(historical_apys)
        return variance ** 0.5

    def _calculate_max_drawdown(self, historical_apys: List[float]) -> float:
        """
        Calculate maximum drawdown from historical APY data.
        Drawdown = largest peak-to-trough decline in APY
        """
        if len(historical_apys) < 2:
            return 0.0

        max_drawdown = 0.0
        peak = historical_apys[0]

        for apy in historical_apys:
            if apy > peak:
                peak = apy
            drawdown = ((peak - apy) / (peak + 0.001)) * 100  # As percentage
            max_drawdown = max(max_drawdown, drawdown)

        return max_drawdown

    def _calculate_liquidity_score(
        self,
        tvl: float,
        vault_total_assets: float
    ) -> float:
        """
        Calculate liquidity score based on TVL and concentration.

        Args:
            tvl: Total value locked in the target vault
            vault_total_assets: Our vault's total assets

        Returns:
            Score from 0.0 to 1.0 (higher is better)
        """
        # If TVL data unavailable (0), return neutral score
        if tvl == 0:
            logger.debug("TVL=0, using neutral liquidity score of 0.5")
            return 0.5  # Neutral score when TVL unknown
        
        # Absolute TVL tier scoring
        if tvl >= 5_000_000:  # $5M+
            base_score = 1.0
        elif tvl >= 1_000_000:  # $1M-$5M
            base_score = 0.85
        elif tvl >= 500_000:  # $500K-$1M
            base_score = 0.65
        elif tvl >= 100_000:  # $100K-$500K
            base_score = 0.40
        else:  # <$100K
            base_score = 0.10

        # Concentration penalty: avoid being >20% of pool
        concentration = vault_total_assets / (tvl + 1)  # Avoid division by zero

        if concentration > MAX_CONCENTRATION:
            concentration_penalty = 0.5  # Major penalty
        elif concentration > 0.10:
            concentration_penalty = 0.8  # Moderate penalty
        else:
            concentration_penalty = 1.0  # No penalty

        return base_score * concentration_penalty

    def _calculate_track_record_score(
        self,
        historical_apys: List[float]
    ) -> float:
        """
        Calculate track record score based on data availability and age.

        Args:
            historical_apys: List of historical APY data points

        Returns:
            Score from 0.0 to 1.0 (higher is better)
        """
        data_points = len(historical_apys)

        # Estimate pool age (assuming daily data points)
        pool_age_days = data_points

        # Age-based scoring
        if pool_age_days >= 90:  # 3+ months
            age_score = 1.0
        elif pool_age_days >= 30:  # 1-3 months
            age_score = 0.75
        elif pool_age_days >= 7:  # 1 week - 1 month
            age_score = 0.50
        else:  # <1 week
            age_score = 0.20

        # Data availability score (want 30+ data points)
        data_score = min(data_points / 30.0, 1.0)

        # Combined score
        return (age_score + data_score) / 2.0

    def _calculate_stability_pattern_score(
        self,
        historical_apys: List[float]
    ) -> float:
        """
        Detect stability patterns and red flags in APY history.

        Args:
            historical_apys: List of historical APY data points

        Returns:
            Score from 0.0 to 1.0 (higher is better/more stable)
        """
        if len(historical_apys) < 3:
            return 0.7  # Default: acceptable but unproven

        mean_apy = sum(historical_apys) / len(historical_apys)
        recent_apys = historical_apys[-3:]  # Last 3 data points

        # Check for recent spike (>2x mean)
        recent_spike = any(apy > mean_apy * 2.0 for apy in recent_apys)

        # Check for recent crash (<0.5x mean)
        recent_crash = any(apy < mean_apy * 0.5 for apy in recent_apys if mean_apy > 0)

        if recent_spike or recent_crash:
            return 0.3  # Warning: unstable

        # Calculate trend (simple linear regression slope)
        if len(historical_apys) >= 5:
            n = len(historical_apys)
            x = list(range(n))
            x_mean = sum(x) / n
            y_mean = mean_apy

            numerator = sum((x[i] - x_mean) * (historical_apys[i] - y_mean) for i in range(n))
            denominator = sum((x[i] - x_mean) ** 2 for i in range(n))

            trend = numerator / denominator if denominator != 0 else 0
            volatility = self._calculate_volatility(historical_apys)

            # Green flag: positive trend with low volatility
            if trend > 0 and volatility < 0.02:  # 2% volatility threshold
                return 1.0

        return 0.7  # Acceptable stability

    def _calculate_contract_safety_score(
        self,
        vault_address: str,
        whitelisted_vaults: List[str]
    ) -> float:
        """
        Calculate contract safety score based on whitelist status.

        Args:
            vault_address: Address of the vault
            whitelisted_vaults: List of approved vault addresses

        Returns:
            1.0 if whitelisted, 0.0 otherwise
        """
        vault_address = Web3.to_checksum_address(vault_address)
        whitelisted = [Web3.to_checksum_address(v) for v in whitelisted_vaults]

        return 1.0 if vault_address in whitelisted else 0.0

    def _calculate_gas_efficiency_score(
        self,
        avg_gas: int = 150_000  # Default estimate
    ) -> float:
        """
        Calculate gas efficiency score based on historical gas usage.

        Args:
            avg_gas: Average gas used for deposit+withdraw cycle

        Returns:
            Score from 0.0 to 1.0 (higher is better/cheaper)
        """
        if avg_gas <= GAS_EFFICIENT_THRESHOLD:
            return 1.0
        elif avg_gas <= GAS_ACCEPTABLE_THRESHOLD:
            return 0.75
        elif avg_gas <= GAS_EXPENSIVE_THRESHOLD:
            return 0.50
        else:
            return 0.25

    def _calculate_composite_score(
        self,
        apy: float,
        historical_apys: List[float],
        tvl: float,
        vault_total_assets: float,
        whitelisted_vaults: List[str],
        vault_address: str,
        avg_gas: int = 150_000
    ) -> Tuple[float, Dict[str, float]]:
        """
        Calculate comprehensive composite score combining all factors.

        Args:
            apy: Current APY (as decimal, e.g., 0.15 for 15%)
            historical_apys: List of historical APY data points
            tvl: Total value locked in the vault
            vault_total_assets: Our vault's total assets
            whitelisted_vaults: List of approved vault addresses
            vault_address: Address of the vault being scored
            avg_gas: Average gas used for operations

        Returns:
            Tuple of (composite_score, component_scores_dict)
        """
        # 1. APY Component (40% weight)
        apy_pct = apy * 100  # Convert to percentage
        apy_normalized = min(apy_pct / APY_CAP, 1.0)  # Cap at 50%
        apy_component = apy_normalized * WEIGHT_APY

        # 2. Risk Component (25% weight)
        volatility = self._calculate_volatility(historical_apys)
        max_drawdown = self._calculate_max_drawdown(historical_apys)

        volatility_normalized = 1 - min(volatility / (MAX_VOLATILITY / 100), 1.0)
        drawdown_normalized = 1 - min(max_drawdown / MAX_DRAWDOWN_CAP, 1.0)

        risk_score = (
            RISK_VOLATILITY_WEIGHT * volatility_normalized +
            RISK_DRAWDOWN_WEIGHT * drawdown_normalized
        )
        risk_component = risk_score * WEIGHT_RISK

        # 3. Liquidity Component (20% weight)
        liquidity_score = self._calculate_liquidity_score(tvl, vault_total_assets)
        liquidity_component = liquidity_score * WEIGHT_LIQUIDITY

        # 4. Safety Component (10% weight)
        track_record = self._calculate_track_record_score(historical_apys)
        stability_pattern = self._calculate_stability_pattern_score(historical_apys)
        contract_safety = self._calculate_contract_safety_score(
            vault_address,
            whitelisted_vaults
        )

        safety_score = (
            SAFETY_TRACK_RECORD_WEIGHT * track_record +
            SAFETY_STABILITY_PATTERN_WEIGHT * stability_pattern +
            SAFETY_CONTRACT_WEIGHT * contract_safety
        )
        safety_component = safety_score * WEIGHT_SAFETY

        # 5. Gas Efficiency Component (5% weight)
        gas_score = self._calculate_gas_efficiency_score(avg_gas)
        gas_component = gas_score * WEIGHT_GAS

        # Total Composite Score
        composite_score = (
            apy_component +
            risk_component +
            liquidity_component +
            safety_component +
            gas_component
        )

        # Component scores for transparency
        components = {
            'apy': apy_component,
            'risk': risk_component,
            'liquidity': liquidity_component,
            'safety': safety_component,
            'gas': gas_component
        }

        return composite_score, components

    def calculate_optimal_allocation(
        self,
        metrics: List[VaultMetrics],
        total_assets: int,
        max_vaults: int = 3
    ) -> List[AllocationTarget]:
        """
        Calculate optimal allocation across vaults using composite scoring.

        Strategy: Maximize composite score while diversifying across top vaults

        Args:
            metrics: List of VaultMetrics with composite scores
            total_assets: Total assets to allocate (in wei)
            max_vaults: Maximum number of vaults to allocate to (default: 3)

        Returns:
            List of AllocationTarget with optimal distribution
        """
        logger.info("Calculating optimal allocation using composite scores...")

        # Filter vaults with positive composite scores
        valid_metrics = [m for m in metrics if m.composite_score > 0]

        if not valid_metrics:
            logger.warning("No suitable vaults found (all scores <= 0)")
            return []

        # Sort by composite score (highest first)
        sorted_metrics = sorted(valid_metrics, key=lambda x: x.composite_score, reverse=True)

        # Select top vaults
        top_vaults = sorted_metrics[:max_vaults]

        logger.info(f"Selected top {len(top_vaults)} vaults by composite score")

        # Calculate weights proportional to composite scores
        total_score = sum(v.composite_score for v in top_vaults)

        if total_score == 0:
            # Equal weight as fallback
            weights = [1.0 / len(top_vaults)] * len(top_vaults)
        else:
            weights = [v.composite_score / total_score for v in top_vaults]

        # Create allocation targets
        allocations = []
        for vault, weight in zip(top_vaults, weights):
            amount = int(total_assets * weight)

            # Verify concentration constraint
            concentration = amount / (vault.tvl * 1e6 + 1)  # Convert TVL to wei
            if concentration > MAX_CONCENTRATION:
                logger.warning(
                    f"Concentration {concentration*100:.1f}% exceeds max {MAX_CONCENTRATION*100}% "
                    f"for {vault.address[:10]}..."
                )

            allocations.append(AllocationTarget(
                address=vault.address,
                amount=amount,
                percentage=weight * 100
            ))

            logger.info(
                f"Allocate {weight*100:.1f}% ({amount/1e6:.2f} USDC) "
                f"to {vault.address[:10]}... "
                f"(Score: {vault.composite_score:.3f}, APY: {vault.apy*100:.2f}%)"
            )

        return allocations

    def should_rebalance(
        self,
        current_metrics: List[VaultMetrics],
        optimal_allocations: List[AllocationTarget],
        total_assets: float,
        estimated_gas_cost_usd: float = 50.0
    ) -> Tuple[bool, str]:
        """
        Determine if rebalancing should occur based on conservative criteria.

        Args:
            current_metrics: Current vault metrics
            optimal_allocations: Proposed optimal allocations
            total_assets: Total assets in vault
            estimated_gas_cost_usd: Estimated gas cost in USD

        Returns:
            Tuple of (should_rebalance: bool, reason: str)
        """
        # 1. Time-based constraint (24 hours minimum)
        last_rebalance_time = self.vault.functions.lastRebalance().call()
        hours_since_last = (time.time() - last_rebalance_time) / 3600

        if hours_since_last < MIN_REBALANCE_HOURS:
            return False, f"Only {hours_since_last:.1f}h since last rebalance (min: {MIN_REBALANCE_HOURS}h)"

        # 2. Check if we have assets to rebalance
        if total_assets == 0:
            return False, "No assets to rebalance"

        # 3. Calculate current weighted score (simplified - assumes equal distribution if unknown)
        # In production, you'd track actual current allocations
        current_scores = [m.composite_score for m in current_metrics if m.composite_score > 0]
        if not current_scores:
            return True, "No valid current allocations, rebalancing needed"

        current_weighted_score = sum(current_scores[:3]) / min(len(current_scores), 3)

        # 4. Calculate optimal weighted score
        optimal_scores = [
            next((m.composite_score for m in current_metrics if m.address == alloc.address), 0)
            for alloc in optimal_allocations
        ]
        optimal_weighted_score = sum(optimal_scores) / max(len(optimal_scores), 1)

        # 5. Score improvement threshold (must be >25% better)
        if current_weighted_score > 0:
            improvement = (optimal_weighted_score - current_weighted_score) / current_weighted_score

            if improvement < SCORE_IMPROVEMENT_THRESHOLD:
                return False, (
                    f"Score improvement {improvement*100:.1f}% below threshold "
                    f"{SCORE_IMPROVEMENT_THRESHOLD*100}%"
                )
        else:
            improvement = 1.0  # First rebalance

        # 6. Gas cost ROI check
        total_assets_usd = total_assets / 1e6  # Convert from wei to USDC
        estimated_benefit_usd = improvement * total_assets_usd

        if estimated_benefit_usd < estimated_gas_cost_usd * GAS_ROI_MULTIPLE:
            return False, (
                f"Benefit ${estimated_benefit_usd:.2f} < {GAS_ROI_MULTIPLE}x gas cost "
                f"${estimated_gas_cost_usd:.2f}"
            )

        # 7. Liquidity checks for optimal allocations
        for alloc in optimal_allocations:
            vault_metrics = next((m for m in current_metrics if m.address == alloc.address), None)
            if not vault_metrics:
                continue

            if vault_metrics.tvl < MIN_TVL:
                return False, f"Target vault {alloc.address[:10]}... TVL below minimum"

            concentration = alloc.amount / (vault_metrics.tvl * 1e6 + 1)
            if concentration > MAX_CONCENTRATION:
                return False, (
                    f"Would exceed {MAX_CONCENTRATION*100}% concentration in "
                    f"{alloc.address[:10]}..."
                )

        # All checks passed!
        return True, (
            f"Rebalancing approved: {improvement*100:.1f}% improvement, "
            f"benefit ${estimated_benefit_usd:.2f}"
        )

    def execute_rebalance(self, allocations: List[AllocationTarget]) -> str:
        """
        Execute rebalancing on-chain
        
        Returns: Transaction hash
        """
        if not allocations:
            logger.warning("No allocations to execute")
            return ""
        
        # Check if enough time has passed since last rebalance
        last_rebalance = self.vault.functions.lastRebalance().call()
        time_since_rebalance = time.time() - last_rebalance
        
        if time_since_rebalance < self.min_rebalance_interval:
            logger.info(
                f"Skipping rebalance - only {time_since_rebalance:.0f}s "
                f"since last rebalance (min: {self.min_rebalance_interval}s)"
            )
            return ""
        
        # Prepare transaction
        vault_addresses = [a.address for a in allocations]
        amounts = [a.amount for a in allocations]
        
        logger.info("Executing rebalance transaction...")
        
        try:
            # Build transaction
            tx = self.vault.functions.rebalance(
                vault_addresses,
                amounts
            ).build_transaction({
                'from': self.account.address,
                'nonce': self.w3.eth.get_transaction_count(self.account.address),
                'gas': 2000000,  # Adjust as needed
                'gasPrice': self.w3.eth.gas_price
            })
            
            # Sign transaction
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.account.key)
            
            # Send transaction
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            logger.info(f"Transaction sent: {tx_hash.hex()}")
            
            # Wait for confirmation
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            if receipt['status'] == 1:
                logger.info(f"✅ Rebalance successful! Gas used: {receipt['gasUsed']}")
                self.last_rebalance = time.time()
            else:
                logger.error("❌ Rebalance transaction failed")
            
            return tx_hash.hex()
            
        except Exception as e:
            logger.error(f"Failed to execute rebalance: {e}")
            return ""
    
    def run_optimization_cycle(self):
        """
        Run one complete optimization cycle with conservative switching logic:
        1. Fetch vault metrics with composite scoring
        2. Calculate optimal allocation
        3. Evaluate rebalancing criteria
        4. Execute rebalance only if all conditions met
        """
        logger.info("=" * 60)
        logger.info("Starting optimization cycle")
        logger.info("=" * 60)

        try:
            # Get whitelisted vaults
            whitelisted = self.vault.functions.getWhitelistedVaults().call()
            logger.info(f"Found {len(whitelisted)} whitelisted vaults")

            # Get current total assets
            total_assets = self.vault.functions.totalAssets().call()
            logger.info(f"Total assets under management: {total_assets / 1e6:.2f} USDC")

            if total_assets == 0:
                logger.info("No assets to manage")
                return

            # Fetch metrics for all vaults using composite scoring
            metrics = self.get_vault_metrics(
                vaults=whitelisted,
                vault_total_assets=total_assets / 1e6,  # Convert to USDC
                whitelisted_vaults=whitelisted
            )

            if not metrics:
                logger.warning("No valid vaults found (all below minimum TVL or filtered out)")
                return

            # Calculate optimal allocation
            allocations = self.calculate_optimal_allocation(metrics, total_assets)

            if not allocations:
                logger.warning("No optimal allocations calculated")
                return

            # Evaluate conservative switching criteria
            should_rebal, reason = self.should_rebalance(
                current_metrics=metrics,
                optimal_allocations=allocations,
                total_assets=total_assets,
                estimated_gas_cost_usd=50.0  # Estimate, could be dynamic
            )

            logger.info(f"Rebalance decision: {'YES' if should_rebal else 'NO'} - {reason}")

            # Execute rebalance only if approved
            if should_rebal:
                tx_hash = self.execute_rebalance(allocations)
                if tx_hash:
                    logger.info(f"🎉 Rebalance completed: {tx_hash}")
            else:
                logger.info("⏸️  Skipping rebalance - criteria not met")

        except Exception as e:
            logger.error(f"Error in optimization cycle: {e}", exc_info=True)
    
    def run_forever(self, check_interval: int = 30):
        """
        Run the optimizer continuously
        
        Args:
            check_interval: Seconds between optimization checks (default: 5 minutes)
        """
        logger.info("🚀 Starting yield optimizer service...")
        logger.info(f"Check interval: {check_interval}s")
        logger.info(f"Min rebalance interval: {self.min_rebalance_interval}s")
        
        while True:
            try:
                self.run_optimization_cycle()
            except KeyboardInterrupt:
                logger.info("Shutting down...")
                break
            except Exception as e:
                logger.error(f"Unexpected error: {e}", exc_info=True)
            
            logger.info(f"Sleeping for {check_interval}s...")
            time.sleep(check_interval)


def main():
    """Main entry point"""
    
    # Load environment variables
    load_dotenv()
    
    # Configuration
    RPC_URL = os.getenv("HYPERLIQUID_RPC_URL", "https://rpc.hyperliquid.xyz/evm")
    PRIVATE_KEY = os.getenv("PRIVATE_KEY")
    VAULT_ADDRESS = os.getenv("VAULT_ADDRESS")
    GLUEX_API_KEY = os.getenv("GLUEX_API_KEY")
    
    # Validate configuration
    if not all([PRIVATE_KEY, VAULT_ADDRESS, GLUEX_API_KEY]):
        logger.error("Missing required environment variables!")
        logger.error("Please set: PRIVATE_KEY, VAULT_ADDRESS, GLUEX_API_KEY")
        return
    
    # Create optimizer with conservative switching (24-hour minimum)
    optimizer = YieldOptimizer(
        rpc_url=RPC_URL,
        private_key=PRIVATE_KEY,
        vault_address=VAULT_ADDRESS,
        gluex_api_key=GLUEX_API_KEY,
        min_rebalance_interval=86400  # 24 hours
    )

    # Run forever - checks frequently but rebalances conservatively
    optimizer.run_forever(check_interval=300)  # Check every 5 minutes


if __name__ == "__main__":
    main()

