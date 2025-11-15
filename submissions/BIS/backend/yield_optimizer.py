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


@dataclass
class VaultMetrics:
    """Metrics for a single vault"""
    address: str
    apy: float
    tvl: float
    volatility: float
    sharpe_ratio: float
    risk_score: float


@dataclass
class AllocationTarget:
    """Target allocation for a vault"""
    address: str
    amount: int  # in wei
    percentage: float


class GlueXClient:
    """Client for interacting with GlueX APIs"""
    
    def __init__(self, api_key: str, base_url: str = "https://api.gluex.xyz"):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })
    
    def get_historical_apy(
        self, 
        vaults: List[str], 
        timeframe: str = "7d"
    ) -> Dict[str, Dict]:
        """
        Query GlueX Yields API for historical APY data
        
        Docs: https://docs.gluex.xyz/api-reference/yield-api/post-historical-apy
        """
        try:
            response = self.session.post(
                f"{self.base_url}/yields/historical-apy",
                json={
                    "vaults": vaults,
                    "timeframe": timeframe
                }
            )
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"Fetched APY data for {len(data)} vaults")
            return data
            
        except requests.RequestException as e:
            logger.error(f"Failed to fetch APY data: {e}")
            return {}
    
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
            response = self.session.post(
                f"{self.base_url}/router/quote",
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
        min_rebalance_interval: int = 3600  # 1 hour
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
    
    def get_vault_metrics(self, vaults: List[str]) -> List[VaultMetrics]:
        """
        Fetch and calculate metrics for all vaults
        
        Returns list of VaultMetrics with APY, TVL, risk scores, etc.
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
            
            # Calculate volatility from historical APY (simplified)
            historical_apys = vault_data.get("historical", [])
            volatility = self._calculate_volatility(historical_apys) if historical_apys else 0.1
            
            # Calculate Sharpe ratio (risk-adjusted return)
            risk_free_rate = 0.04  # 4% risk-free rate
            sharpe_ratio = (apy - risk_free_rate) / volatility if volatility > 0 else 0
            
            # Calculate risk score (lower is better)
            risk_score = volatility / (apy + 0.001)  # Avoid division by zero
            
            metrics.append(VaultMetrics(
                address=vault,
                apy=apy,
                tvl=tvl,
                volatility=volatility,
                sharpe_ratio=sharpe_ratio,
                risk_score=risk_score
            ))
            
            logger.info(
                f"Vault {vault[:10]}... - "
                f"APY: {apy*100:.2f}%, "
                f"Sharpe: {sharpe_ratio:.2f}, "
                f"Risk: {risk_score:.4f}"
            )
        
        return metrics
    
    def _calculate_volatility(self, historical_apys: List[float]) -> float:
        """Calculate standard deviation of historical APYs"""
        if len(historical_apys) < 2:
            return 0.1  # Default volatility
        
        mean = sum(historical_apys) / len(historical_apys)
        variance = sum((x - mean) ** 2 for x in historical_apys) / len(historical_apys)
        return variance ** 0.5
    
    def calculate_optimal_allocation(
        self,
        metrics: List[VaultMetrics],
        total_assets: int,
        max_vaults: int = 3
    ) -> List[AllocationTarget]:
        """
        Calculate optimal allocation across vaults
        
        Strategy: Maximize Sharpe ratio while diversifying across top vaults
        """
        logger.info("Calculating optimal allocation...")
        
        # Sort by Sharpe ratio (highest first)
        sorted_metrics = sorted(metrics, key=lambda x: x.sharpe_ratio, reverse=True)
        
        # Select top vaults
        top_vaults = sorted_metrics[:max_vaults]
        
        if not top_vaults:
            logger.warning("No suitable vaults found")
            return []
        
        # Calculate weights based on Sharpe ratio
        total_sharpe = sum(v.sharpe_ratio for v in top_vaults if v.sharpe_ratio > 0)
        
        if total_sharpe == 0:
            # Equal weight if no positive Sharpe ratios
            weights = [1.0 / len(top_vaults)] * len(top_vaults)
        else:
            weights = [v.sharpe_ratio / total_sharpe for v in top_vaults]
        
        # Create allocation targets
        allocations = []
        for vault, weight in zip(top_vaults, weights):
            amount = int(total_assets * weight)
            allocations.append(AllocationTarget(
                address=vault.address,
                amount=amount,
                percentage=weight * 100
            ))
            
            logger.info(
                f"Allocate {weight*100:.1f}% ({amount/1e6:.2f} USDC) "
                f"to {vault.address[:10]}... (APY: {vault.apy*100:.2f}%)"
            )
        
        return allocations
    
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
        Run one complete optimization cycle:
        1. Fetch vault metrics
        2. Calculate optimal allocation
        3. Execute rebalance if needed
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
            
            # Fetch metrics for all vaults
            metrics = self.get_vault_metrics(whitelisted)
            
            # Calculate optimal allocation
            allocations = self.calculate_optimal_allocation(metrics, total_assets)
            
            # Execute rebalance
            if allocations:
                tx_hash = self.execute_rebalance(allocations)
                if tx_hash:
                    logger.info(f"🎉 Rebalance completed: {tx_hash}")
            
        except Exception as e:
            logger.error(f"Error in optimization cycle: {e}", exc_info=True)
    
    def run_forever(self, check_interval: int = 300):
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
    RPC_URL = os.getenv("HYPERLIQUID_RPC_URL", "https://api.hyperliquid.xyz/evm")
    PRIVATE_KEY = os.getenv("PRIVATE_KEY")
    VAULT_ADDRESS = os.getenv("VAULT_ADDRESS")
    GLUEX_API_KEY = os.getenv("GLUEX_API_KEY")
    
    # Validate configuration
    if not all([PRIVATE_KEY, VAULT_ADDRESS, GLUEX_API_KEY]):
        logger.error("Missing required environment variables!")
        logger.error("Please set: PRIVATE_KEY, VAULT_ADDRESS, GLUEX_API_KEY")
        return
    
    # Create optimizer
    optimizer = YieldOptimizer(
        rpc_url=RPC_URL,
        private_key=PRIVATE_KEY,
        vault_address=VAULT_ADDRESS,
        gluex_api_key=GLUEX_API_KEY,
        min_rebalance_interval=3600  # 1 hour
    )
    
    # Run forever
    optimizer.run_forever(check_interval=300)  # Check every 5 minutes


if __name__ == "__main__":
    main()

