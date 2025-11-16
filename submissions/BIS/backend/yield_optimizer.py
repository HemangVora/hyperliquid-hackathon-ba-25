#!/usr/bin/env python3
"""
BIS Yield Optimizer - Backend Service

This service:
1. Queries GlueX Yields API to find highest APY opportunities
2. Calculates optimal allocations based on risk/reward
3. Executes rebalancing via smart contract
4. Monitors performance and collects metrics

CONFIGURATION QUICK GUIDE:
==========================
To change allocation strategy, edit the constants below (lines 32-50):

- ALLOCATION_STRATEGY: "concentrated" or "diversified"
  • "concentrated" = 100% to highest yield vault (maximize returns)
  • "diversified" = Spread across top 3 vaults (balanced risk/reward)

- MIN_TOTAL_ASSETS: Minimum USDC to trigger rebalance (default: 10)
- MIN_REBALANCE_HOURS: Hours between rebalances (default: 24)
- SCORE_IMPROVEMENT_THRESHOLD: Required improvement % to rebalance (default: 15%)
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
MAX_CONCENTRATION = 0.35  # Maximum 35% of any pool's TVL (allows diversification across 3+ vaults)

# Rebalancing constraints
MIN_REBALANCE_HOURS = 24  # Conservative switching: 24 hours minimum
SCORE_IMPROVEMENT_THRESHOLD = 0.15  # Must be 15% better to switch
MIN_TOTAL_ASSETS = 10.0  # Minimum 10 USDC total to execute rebalance (avoids dust transactions)
MIN_ALLOCATION_PER_VAULT = 1.0  # Minimum 1 USDC per vault (GlueX vaults may reject smaller deposits)
# GAS_ROI_MULTIPLE = 3.0  # [DEPRECATED] Not used on HyperEVM due to negligible gas costs (~$0.01)

# Allocation strategy
ALLOCATION_STRATEGY = "concentrated"  # Options: "diversified" or "concentrated"
# - "diversified": Spread funds across top 3 vaults based on composite scores
# - "concentrated": Allocate 100% to highest-scoring vault (maximizes yield, higher risk)
MAX_VAULTS_DIVERSIFIED = 3  # Number of vaults to use in diversified strategy

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

            # 1) Fetch TVL (best effort)
            tvl_value = 0.0
            tvl_payload = {
                "chain": self.chain,
                "pool_address": normalized_vault,
                "lp_token_address": normalized_vault,
            }
            try:
                tvl_response = self.session.post(
                    f"{self.base_url}/tvl",
                    json=tvl_payload,
                    timeout=10,
                )
                if tvl_response.status_code == 404:
                    logger.debug(f"TVL not found for vault {vault[:10]}...")
                elif tvl_response.status_code == 422:
                    logger.debug(f"TVL endpoint returned 422 for vault {vault[:10]}... (may not be supported)")
                else:
                    tvl_response.raise_for_status()
                    tvl_json = tvl_response.json()
                    # Response format: {"success": true, "tvl": {"tvl": 1234567.89, ...}}
                    if tvl_json.get("success") and "tvl" in tvl_json:
                        tvl_data = tvl_json["tvl"]
                        if isinstance(tvl_data, dict) and "tvl" in tvl_data:
                            tvl_value = self._safe_float(tvl_data["tvl"], 0.0)
                        else:
                            tvl_value = self._safe_float(tvl_data, 0.0)
                    logger.debug(f"Fetched TVL ${tvl_value:,.0f} for vault {vault[:10]}...")
            except requests.RequestException as e:
                logger.debug(f"Failed to fetch TVL for {vault}: {e}")

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
    # NOTE: Filtered to only USDC-accepting vaults to avoid token mismatch issues
    # The deployed YieldOptimizer accepts USDC (0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb)
    # Only Vault 2 accepts USDC; others require different tokens:
    # - Vault 1 (0xE255...CAdD): requires 0xb883...630f
    # - Vault 2 (0xCdc3...92EA): requires USDC ✓
    # - Vault 3 (0x8F92...216a): requires 0x5555...5555  
    # - Vault 4 (0x9f75...7f7): requires 0x1111...1111
    # - Vault 5 (0x63Cf...1Be): requires 0x5d3a...f34
    GLUEX_VAULTS = [
        "0xcdc3975df9d1cf054f44ed238edfb708880292ea",  # USDC vault - the only compatible one
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
            },
            {
                "inputs": [],
                "name": "asset",
                "outputs": [{"internalType": "address", "name": "", "type": "address"}],
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

        # Get our contract's base asset (USDC)
        try:
            base_asset = self.vault.functions.asset().call()
            logger.info(f"Base asset: {base_asset}")
        except Exception as e:
            logger.warning(f"Could not determine base asset: {e}")
            base_asset = None

        # Get historical APY data from GlueX
        apy_data = self.gluex.get_historical_apy(vaults)

        metrics = []
        vault_abi = [{
            "constant": True,
            "inputs": [],
            "name": "asset",
            "outputs": [{"name": "", "type": "address"}],
            "type": "function"
        }]
        
        for vault in vaults:
            vault = Web3.to_checksum_address(vault)

            # Filter out vaults that don't accept our base asset (USDC)
            if base_asset:
                try:
                    vault_contract = self.w3.eth.contract(
                        address=vault,
                        abi=vault_abi
                    )
                    vault_asset = vault_contract.functions.asset().call()
                    
                    if vault_asset.lower() != base_asset.lower():
                        logger.warning(
                            f"⚠️  Skipping {vault[:10]}... - requires {vault_asset[:10]}... "
                            f"but we have {base_asset[:10]}... (token mismatch)"
                        )
                        continue
                except Exception as e:
                    logger.warning(f"⚠️  Could not check vault {vault[:10]}... asset: {e}, skipping")
                    continue

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

        Strategy depends on ALLOCATION_STRATEGY configuration:
        - "concentrated": 100% to highest-scoring vault (max yield)
        - "diversified": Spread across top vaults based on scores (balanced risk/reward)

        Args:
            metrics: List of VaultMetrics with composite scores
            total_assets: Total assets to allocate (in wei)
            max_vaults: Maximum number of vaults to allocate to (default: 3)

        Returns:
            List of AllocationTarget with optimal distribution
        """
        logger.info(f"Calculating optimal allocation using '{ALLOCATION_STRATEGY}' strategy...")

        # Filter vaults with positive composite scores
        valid_metrics = [m for m in metrics if m.composite_score > 0]

        if not valid_metrics:
            logger.warning("No suitable vaults found (all scores <= 0)")
            return []

        # Sort by composite score (highest first)
        sorted_metrics = sorted(valid_metrics, key=lambda x: x.composite_score, reverse=True)

        # Select strategy
        if ALLOCATION_STRATEGY == "concentrated":
            # Concentrated strategy: 100% to highest-scoring vault
            best_vault = sorted_metrics[0]
            allocations = [AllocationTarget(
                address=best_vault.address,
                amount=total_assets,
                percentage=100.0
            )]
            
            logger.info(
                f"💎 Concentrated allocation: 100% ({total_assets/1e6:.2f} USDC) "
                f"to {best_vault.address[:10]}... "
                f"(Score: {best_vault.composite_score:.3f}, APY: {best_vault.apy*100:.2f}%)"
            )
            
            return allocations
        
        else:
            # Diversified strategy: Spread across top vaults
            top_vaults = sorted_metrics[:max_vaults]
            
            logger.info(f"📊 Diversified allocation across top {len(top_vaults)} vaults")

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

                # Verify concentration constraint (skip if TVL data unavailable)
                if vault.tvl > 0:
                    concentration = amount / (vault.tvl * 1e6 + 1)  # Convert TVL to wei
                    if concentration > MAX_CONCENTRATION:
                        logger.warning(
                            f"Concentration {concentration*100:.1f}% exceeds max {MAX_CONCENTRATION*100:.1f}% "
                            f"for {vault.address[:10]}..."
                        )

                allocations.append(AllocationTarget(
                    address=vault.address,
                    amount=amount,
                    percentage=weight * 100
                ))

                logger.info(
                    f"  → {weight*100:.1f}% ({amount/1e6:.2f} USDC) "
                    f"to {vault.address[:10]}... "
                    f"(Score: {vault.composite_score:.3f}, APY: {vault.apy*100:.2f}%)"
                )

            return allocations

    def should_rebalance(
        self,
        current_metrics: List[VaultMetrics],
        optimal_allocations: List[AllocationTarget],
        total_assets: float,
        estimated_gas_cost_usd: float = 0.01  # HyperEVM has very low gas costs (~$0.01)
    ) -> Tuple[bool, str]:
        """
        Determine if rebalancing should occur based on conservative criteria.

        Args:
            current_metrics: Current vault metrics
            optimal_allocations: Proposed optimal allocations
            total_assets: Total assets in vault
            estimated_gas_cost_usd: Estimated gas cost in USD (HyperEVM default: $0.01)

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
        
        # 3. Check minimum total assets threshold (avoid dust transactions)
        total_assets_usdc = total_assets / 1e6  # Convert from wei to USDC
        if total_assets_usdc < MIN_TOTAL_ASSETS:
            return False, (
                f"Total assets ${total_assets_usdc:.2f} below minimum ${MIN_TOTAL_ASSETS:.0f} "
                f"(prevents dust transactions that may fail)"
            )
        
        # 4. Check minimum allocation per vault (skip for concentrated strategy with single vault)
        if ALLOCATION_STRATEGY != "concentrated" or len(optimal_allocations) > 1:
            for alloc in optimal_allocations:
                alloc_usdc = alloc.amount / 1e6
                if alloc_usdc < MIN_ALLOCATION_PER_VAULT:
                    return False, (
                        f"Allocation ${alloc_usdc:.2f} to {alloc.address[:10]}... "
                        f"below minimum ${MIN_ALLOCATION_PER_VAULT:.0f} USDC per vault"
                    )

        # 5. Calculate current weighted score (simplified - assumes equal distribution if unknown)
        # In production, you'd track actual current allocations
        current_scores = [m.composite_score for m in current_metrics if m.composite_score > 0]
        if not current_scores:
            return True, "No valid current allocations, rebalancing needed"

        current_weighted_score = sum(current_scores[:3]) / min(len(current_scores), 3)

        # 6. Calculate optimal weighted score
        optimal_scores = [
            next((m.composite_score for m in current_metrics if m.address == alloc.address), 0)
            for alloc in optimal_allocations
        ]
        optimal_weighted_score = sum(optimal_scores) / max(len(optimal_scores), 1)

        # 7. Score improvement threshold (must be >15% better)
        if current_weighted_score > 0:
            improvement = (optimal_weighted_score - current_weighted_score) / current_weighted_score

            if improvement < SCORE_IMPROVEMENT_THRESHOLD:
                return False, (
                    f"Score improvement {improvement*100:.1f}% below threshold "
                    f"{SCORE_IMPROVEMENT_THRESHOLD*100}%"
                )
        else:
            improvement = 1.0  # First rebalance

        # 8. Gas cost ROI check - SKIPPED on HyperEVM
        # HyperEVM has negligible gas costs (~$0.01), so this check is not needed
        # The score improvement threshold above is sufficient to prevent unnecessary rebalancing
        logger.info(f"Score improvement: {improvement*100:.1f}% (gas cost negligible on HyperEVM)")

        # 9. Liquidity checks for optimal allocations
        for alloc in optimal_allocations:
            vault_metrics = next((m for m in current_metrics if m.address == alloc.address), None)
            if not vault_metrics:
                continue

            if vault_metrics.tvl < MIN_TVL:
                return False, f"Target vault {alloc.address[:10]}... TVL below minimum"

            # Skip concentration check if TVL data unavailable (TVL=0)
            # This is expected since GlueX API doesn't provide TVL data
            if vault_metrics.tvl > 0:
                concentration = alloc.amount / (vault_metrics.tvl * 1e6 + 1)
                if concentration > MAX_CONCENTRATION:
                    return False, (
                        f"Would exceed {MAX_CONCENTRATION*100}% concentration in "
                        f"{alloc.address[:10]}..."
                    )

        # All checks passed!
        return True, (
            f"Rebalancing approved: {improvement*100:.1f}% score improvement "
            f"(gas cost: ${estimated_gas_cost_usd:.2f})"
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
        logger.info(f"Vault addresses: {vault_addresses}")
        logger.info(f"Amounts: {amounts}")
        
        # Add diagnostic checks
        logger.info("🔍 Running pre-transaction diagnostics...")
        try:
            # Check contract's USDC balance
            asset_address = self.vault.functions.asset().call()
            logger.info(f"   Base asset address: {asset_address}")
            
            asset_contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(asset_address),
                abi=[{
                    "constant": True,
                    "inputs": [{"name": "account", "type": "address"}],
                    "name": "balanceOf",
                    "outputs": [{"name": "", "type": "uint256"}],
                    "type": "function"
                }, {
                    "constant": True,
                    "inputs": [],
                    "name": "decimals",
                    "outputs": [{"name": "", "type": "uint8"}],
                    "type": "function"
                }, {
                    "constant": True,
                    "inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}],
                    "name": "allowance",
                    "outputs": [{"name": "", "type": "uint256"}],
                    "type": "function"
                }]
            )
            
            try:
                decimals = asset_contract.functions.decimals().call()
                contract_balance = asset_contract.functions.balanceOf(self.vault_address).call()
                total_requested = sum(amounts)
                logger.info(f"   Contract balance: {contract_balance / 10**decimals:.6f} tokens")
                logger.info(f"   Total requested: {total_requested / 10**decimals:.6f} tokens")
                
                if contract_balance < total_requested:
                    logger.error(
                        f"❌ INSUFFICIENT BALANCE: Contract has {contract_balance / 10**decimals:.6f} "
                        f"but needs {total_requested / 10**decimals:.6f} tokens"
                    )
            except Exception as e:
                logger.warning(f"   Could not check balance: {e}")
            
            # Check each vault's deposit limits and token requirements
            vault_abi = [{
                "constant": True,
                "inputs": [{"name": "receiver", "type": "address"}],
                "name": "maxDeposit",
                "outputs": [{"name": "", "type": "uint256"}],
                "type": "function"
            }, {
                "constant": True,
                "inputs": [],
                "name": "asset",
                "outputs": [{"name": "", "type": "address"}],
                "type": "function"
            }]
            
            for i, vault_addr in enumerate(vault_addresses):
                logger.info(f"\n   Checking vault {i + 1}/{len(vault_addresses)}: {vault_addr}")
                vault_contract = self.w3.eth.contract(
                    address=Web3.to_checksum_address(vault_addr),
                    abi=vault_abi
                )
                try:
                    vault_asset = vault_contract.functions.asset().call()
                    logger.info(f"      Required asset: {vault_asset}")
                    
                    # Check if vault requires same token as our base asset
                    if vault_asset.lower() != asset_address.lower():
                        logger.warning(
                            f"⚠️  TOKEN MISMATCH: Vault requires {vault_asset[:10]}... "
                            f"but we have {asset_address[:10]}..."
                        )
                    
                    max_deposit = vault_contract.functions.maxDeposit(self.vault_address).call()
                    logger.info(f"      Max deposit: {max_deposit / 10**decimals:.6f} tokens")
                    logger.info(f"      Requested: {amounts[i] / 10**decimals:.6f} tokens")
                    
                    if max_deposit == 0:
                        logger.error(f"❌ VAULT PAUSED/FULL: maxDeposit = 0 for {vault_addr[:10]}...")
                    elif amounts[i] > max_deposit:
                        logger.error(
                            f"❌ AMOUNT EXCEEDS LIMIT: Requesting {amounts[i] / 10**decimals:.6f} "
                            f"but max is {max_deposit / 10**decimals:.6f}"
                        )
                except Exception as e:
                    logger.warning(f"      Could not check vault limits: {e}")
                    
        except Exception as e:
            logger.warning(f"⚠️  Diagnostic checks failed: {e}")
            import traceback
            logger.debug(traceback.format_exc())
        
        try:
            # First, try to simulate the call to catch errors early
            try:
                self.vault.functions.rebalance(
                    vault_addresses,
                    amounts
                ).call({'from': self.account.address})
                logger.info("✓ Transaction simulation successful")
            except Exception as sim_error:
                logger.error(f"❌ Transaction would revert: {sim_error}")
                return ""
            
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
                return tx_hash.hex()
            else:
                logger.error(f"❌ Rebalance transaction failed - tx reverted on-chain")
                logger.error(f"Transaction hash: {tx_hash.hex()}")
                logger.error(f"Receipt: {receipt}")
                return ""  # Return empty string on failure
            
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

            # Calculate optimal allocation based on configured strategy
            max_vaults = 1 if ALLOCATION_STRATEGY == "concentrated" else MAX_VAULTS_DIVERSIFIED
            allocations = self.calculate_optimal_allocation(metrics, total_assets, max_vaults)

            if not allocations:
                logger.warning("No optimal allocations calculated")
                return

            # Evaluate conservative switching criteria
            # Gas cost will be calculated dynamically inside should_rebalance
            should_rebal, reason = self.should_rebalance(
                current_metrics=metrics,
                optimal_allocations=allocations,
                total_assets=total_assets
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

