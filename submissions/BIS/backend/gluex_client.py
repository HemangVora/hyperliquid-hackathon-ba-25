"""
GlueX API Client - Comprehensive interface to GlueX APIs.

Supports:
- Yield API: Historical APY, Diluted APY, TVL
- Router API: Price quotes, swap execution
- Exchange Rates API: Token pricing

Documentation: https://docs.gluex.xyz/
"""

import os
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime
import time

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


logger = logging.getLogger(__name__)


class GlueXAPIError(Exception):
    """Custom exception for GlueX API errors."""

    def __init__(self, message: str, status_code: Optional[int] = None, response_data: Optional[Dict] = None):
        self.message = message
        self.status_code = status_code
        self.response_data = response_data
        super().__init__(self.message)


class GlueXClient:
    """
    Comprehensive client for GlueX DeFi APIs.

    Handles authentication, retries, caching, and error handling.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        yield_api_url: Optional[str] = None,
        router_api_url: Optional[str] = None,
        exchange_rates_url: Optional[str] = None,
        cache_ttl: int = 30,
        max_retries: int = 3,
    ):
        """
        Initialize GlueX API client.

        Args:
            api_key: GlueX API key (required for Router API)
            yield_api_url: Yield API base URL (default from env or https://yield-api.gluex.xyz)
            router_api_url: Router API base URL (default from env or https://router.gluex.xyz/v1)
            exchange_rates_url: Exchange Rates API URL (default from env or https://exchange-rates.gluex.xyz)
            cache_ttl: Cache time-to-live in seconds
            max_retries: Maximum number of retry attempts
        """
        self.api_key = api_key or os.getenv("GLUEX_API_KEY")
        self.yield_api_url = yield_api_url or os.getenv(
            "GLUEX_YIELD_API_URL", "https://yield-api.gluex.xyz"
        )
        self.router_api_url = router_api_url or os.getenv(
            "GLUEX_ROUTER_API_URL", "https://router.gluex.xyz/v1"
        )
        self.exchange_rates_url = exchange_rates_url or os.getenv(
            "GLUEX_EXCHANGE_RATES_URL", "https://exchange-rates.gluex.xyz"
        )

        # Simple in-memory cache
        self.cache: Dict[str, tuple[Any, float]] = {}
        self.cache_ttl = cache_ttl

        # Configure session with retries
        self.session = self._create_session(max_retries)

    def _create_session(self, max_retries: int) -> requests.Session:
        """Create requests session with retry logic."""
        session = requests.Session()

        # Configure retry strategy
        retry_strategy = Retry(
            total=max_retries,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST"],
            backoff_factor=1,  # Wait 1, 2, 4 seconds between retries
        )

        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)

        # Set default headers
        session.headers.update({"Content-Type": "application/json"})

        # Add API key if provided (for Router API)
        if self.api_key:
            session.headers.update({"x-api-key": self.api_key})

        return session

    def _get_cache_key(self, endpoint: str, params: Dict) -> str:
        """Generate cache key from endpoint and parameters."""
        params_str = "_".join(f"{k}={v}" for k, v in sorted(params.items()))
        return f"{endpoint}:{params_str}"

    def _get_cached(self, cache_key: str) -> Optional[Any]:
        """Get data from cache if not expired."""
        if cache_key in self.cache:
            data, timestamp = self.cache[cache_key]
            if time.time() - timestamp < self.cache_ttl:
                logger.debug(f"Cache hit for {cache_key}")
                return data
            else:
                # Remove expired cache entry
                del self.cache[cache_key]
        return None

    def _set_cache(self, cache_key: str, data: Any):
        """Store data in cache with current timestamp."""
        self.cache[cache_key] = (data, time.time())

    def _make_request(
        self,
        method: str,
        url: str,
        data: Optional[Dict] = None,
        use_cache: bool = True,
    ) -> Dict:
        """
        Make HTTP request with error handling and caching.

        Args:
            method: HTTP method (GET/POST)
            url: Full URL
            data: Request payload (for POST)
            use_cache: Whether to use caching

        Returns:
            Response JSON data

        Raises:
            GlueXAPIError: If request fails
        """
        # Check cache for GET requests
        if method == "GET" and use_cache:
            cache_key = self._get_cache_key(url, data or {})
            cached = self._get_cached(cache_key)
            if cached:
                return cached

        # Make request
        try:
            if method == "GET":
                response = self.session.get(url, params=data, timeout=10)
            elif method == "POST":
                response = self.session.post(url, json=data, timeout=10)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            response.raise_for_status()
            result = response.json()

            # Cache successful GET requests
            if method == "GET" and use_cache:
                cache_key = self._get_cache_key(url, data or {})
                self._set_cache(cache_key, result)

            return result

        except requests.HTTPError as e:
            error_msg = f"HTTP {e.response.status_code}: {e.response.text}"
            logger.error(f"GlueX API error: {error_msg}")
            raise GlueXAPIError(
                error_msg,
                status_code=e.response.status_code,
                response_data=e.response.json() if e.response.text else None,
            )

        except requests.RequestException as e:
            logger.error(f"Request failed: {e}")
            raise GlueXAPIError(f"Request failed: {str(e)}")

        except ValueError as e:
            logger.error(f"Invalid JSON response: {e}")
            raise GlueXAPIError(f"Invalid response: {str(e)}")

    # ============================================
    # Yield API Methods
    # ============================================

    def get_tvl(
        self, chain: str, pool_address: Optional[str] = None, lp_token_address: Optional[str] = None
    ) -> Dict:
        """
        Get Total Value Locked for a pool.

        Args:
            chain: Chain identifier (e.g., 'ethereum')
            pool_address: Pool contract address (optional)
            lp_token_address: LP token address (optional)

        Returns:
            TVL data: {
                'success': True,
                'tvl': {
                    'tvl': 1234567.89,
                    'network_id': 'ethereum',
                    'pool_address': '0x...'
                }
            }

        Docs: https://docs.gluex.xyz/api-reference/yield-api/post-tvl
        """
        if not pool_address and not lp_token_address:
            raise ValueError("Either pool_address or lp_token_address must be provided")

        payload = {"chain": chain}
        if pool_address:
            payload["pool_address"] = pool_address
        if lp_token_address:
            payload["lp_token_address"] = lp_token_address

        logger.info(f"Fetching TVL for pool on {chain}")
        return self._make_request("POST", f"{self.yield_api_url}/tvl", data=payload)

    def get_historical_apy(
        self,
        chain: str,
        pool_address: Optional[str] = None,
        lp_token_address: Optional[str] = None,
        input_token: Optional[str] = None,
    ) -> Dict:
        """
        Get historical APY data for a pool.

        Args:
            chain: Chain identifier (e.g., 'ethereum')
            pool_address: Pool contract address (optional)
            lp_token_address: LP token address (optional)
            input_token: Input token address (optional)

        Returns:
            APY data: {
                'success': True,
                'historic_yield': {
                    'apy': 12.5,
                    'network_id': 'ethereum',
                    'pool_address': '0x...',
                    'input_token': '0x...'
                }
            }

        Docs: https://docs.gluex.xyz/api-reference/yield-api/post-historical-apy
        """
        if not pool_address and not lp_token_address:
            raise ValueError("Either pool_address or lp_token_address must be provided")

        payload = {"chain": chain}
        if pool_address:
            payload["pool_address"] = pool_address
        if lp_token_address:
            payload["lp_token_address"] = lp_token_address
        if input_token:
            payload["input_token"] = input_token

        logger.info(f"Fetching historical APY for pool on {chain}")
        return self._make_request("POST", f"{self.yield_api_url}/historical-apy", data=payload)

    def get_diluted_apy(
        self,
        chain: str,
        input_amount: int,
        pool_address: Optional[str] = None,
        lp_token_address: Optional[str] = None,
        input_token: Optional[str] = None,
    ) -> Dict:
        """
        Get diluted APY based on deposit amount.

        Args:
            chain: Chain identifier
            input_amount: Amount in token's smallest unit (wei)
            pool_address: Pool contract address (optional)
            lp_token_address: LP token address (optional)
            input_token: Input token address (optional)

        Returns:
            Diluted APY data: {
                'success': True,
                'diluted_yield': {
                    'apy': 12.3,
                    'network_id': 'ethereum',
                    'pool_address': '0x...',
                    'input_token': '0x...',
                    'input_amount': '1000000000000000000'
                }
            }

        Docs: https://docs.gluex.xyz/api-reference/yield-api/post-diluted-apy
        """
        if not pool_address and not lp_token_address:
            raise ValueError("Either pool_address or lp_token_address must be provided")

        payload = {"chain": chain, "input_amount": input_amount}
        if pool_address:
            payload["pool_address"] = pool_address
        if lp_token_address:
            payload["lp_token_address"] = lp_token_address
        if input_token:
            payload["input_token"] = input_token

        logger.info(f"Fetching diluted APY for amount {input_amount} on {chain}")
        return self._make_request("POST", f"{self.yield_api_url}/diluted-apy", data=payload)

    # ============================================
    # Router API Methods (requires API key)
    # ============================================

    def get_price(
        self,
        chain_id: str,
        input_token: str,
        output_token: str,
        user_address: str,
        output_receiver: str,
        unique_pid: str,
        order_type: str,
        input_amount: Optional[str] = None,
        output_amount: Optional[str] = None,
    ) -> Dict:
        """
        Get price quote (no calldata/simulation).

        Requires API key via x-api-key header.

        Docs: https://docs.gluex.xyz/api-reference/router-api/post-price
        """
        if not self.api_key:
            raise GlueXAPIError("API key required for Router API")

        payload = {
            "chainID": chain_id,
            "inputToken": input_token,
            "outputToken": output_token,
            "userAddress": user_address,
            "outputReceiver": output_receiver,
            "uniquePID": unique_pid,
            "orderType": order_type,
        }

        if order_type == "SELL":
            if not input_amount:
                raise ValueError("input_amount required for SELL orders")
            payload["inputAmount"] = input_amount
        elif order_type == "BUY":
            if not output_amount:
                raise ValueError("output_amount required for BUY orders")
            payload["outputAmount"] = output_amount

        logger.info(f"Getting price quote on {chain_id}")
        return self._make_request("POST", f"{self.router_api_url}/price", data=payload, use_cache=False)

    def get_quote(
        self,
        chain_id: str,
        input_token: str,
        output_token: str,
        user_address: str,
        output_receiver: str,
        unique_pid: str,
        order_type: str,
        input_amount: Optional[str] = None,
        output_amount: Optional[str] = None,
    ) -> Dict:
        """
        Get price quote with execution calldata and simulation.

        Requires API key via x-api-key header.

        Docs: https://docs.gluex.xyz/api-reference/router-api/post-quote
        """
        if not self.api_key:
            raise GlueXAPIError("API key required for Router API")

        payload = {
            "chainID": chain_id,
            "inputToken": input_token,
            "outputToken": output_token,
            "userAddress": user_address,
            "outputReceiver": output_receiver,
            "uniquePID": unique_pid,
            "orderType": order_type,
        }

        if order_type == "SELL":
            if not input_amount:
                raise ValueError("input_amount required for SELL orders")
            payload["inputAmount"] = input_amount
        elif order_type == "BUY":
            if not output_amount:
                raise ValueError("output_amount required for BUY orders")
            payload["outputAmount"] = output_amount

        logger.info(f"Getting execution quote on {chain_id}")
        return self._make_request("POST", f"{self.router_api_url}/quote", data=payload, use_cache=False)

    # ============================================
    # Exchange Rates API Methods
    # ============================================

    def get_exchange_rates(self, pairs: List[Dict[str, str]]) -> List[Dict]:
        """
        Get exchange rates for token pairs.

        Args:
            pairs: List of token pair objects:
                [
                    {
                        'domestic_blockchain': 'ethereum',
                        'domestic_token': '0xa0b86991...',  # USDC
                        'foreign_blockchain': 'ethereum',
                        'foreign_token': '0xdac17f95...'    # USDT
                    }
                ]

        Returns:
            List of exchange rate data:
                [
                    {
                        'domestic_blockchain': 'ethereum',
                        'domestic_token': '0xa0b86991...',
                        'foreign_blockchain': 'ethereum',
                        'foreign_token': '0xdac17f95...',
                        'price': 0.9998
                    }
                ]

        Docs: https://docs.gluex.xyz/api-reference/exchange-rate-api/post-price
        """
        logger.info(f"Fetching exchange rates for {len(pairs)} pairs")
        return self._make_request("POST", self.exchange_rates_url, data=pairs)

    # ============================================
    # Convenience Methods
    # ============================================

    def clear_cache(self):
        """Clear all cached data."""
        self.cache.clear()
        logger.info("Cache cleared")

    def get_cache_stats(self) -> Dict:
        """Get cache statistics."""
        total_entries = len(self.cache)
        valid_entries = sum(
            1 for _, (_, timestamp) in self.cache.items() if time.time() - timestamp < self.cache_ttl
        )
        return {
            "total_entries": total_entries,
            "valid_entries": valid_entries,
            "expired_entries": total_entries - valid_entries,
            "cache_ttl": self.cache_ttl,
        }
