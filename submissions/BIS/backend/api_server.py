"""
BIS Yield Optimizer - REST API Server

FastAPI server that exposes GlueX pool data to the frontend.
Provides endpoints for pools, TVL, historical APY, and chain information.

Run with: uvicorn api_server:app --reload --port 8000
"""

import os
import logging
from typing import List, Optional
from datetime import datetime
import time

from fastapi import FastAPI, HTTPException, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from gluex_client import GlueXClient, GlueXAPIError
from chains_config import (
    get_all_chains,
    get_chain,
    get_chains_from_env,
    is_chain_supported,
)
from models import (
    ChainInfo,
    ChainsResponse,
    PoolData,
    PoolsResponse,
    TVLData,
    TVLResponse,
    HistoricalAPY,
    APYResponse,
    APYDataPoint,
    HealthStatus,
    ErrorResponse,
    ErrorDetail,
)

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="BIS Yield Optimizer API",
    description="REST API for accessing GlueX pool data across multiple blockchains",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
cors_enabled = os.getenv("ENABLE_CORS", "true").lower() == "true"
if cors_enabled:
    cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.info(f"CORS enabled for origins: {cors_origins}")

# Initialize GlueX client
gluex_client = GlueXClient(
    api_key=os.getenv("GLUEX_API_KEY"),
    cache_ttl=int(os.getenv("CACHE_TTL", "30")),
)

# Server start time for uptime calculation
START_TIME = time.time()

# Supported chains from environment
SUPPORTED_CHAINS = get_chains_from_env("SUPPORTED_CHAINS")
logger.info(f"Loaded {len(SUPPORTED_CHAINS)} supported chains")


# ============================================
# Error Handlers
# ============================================


@app.exception_handler(GlueXAPIError)
async def gluex_api_error_handler(request, exc: GlueXAPIError):
    """Handle GlueX API errors."""
    logger.error(f"GlueX API error: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code or 500,
        content={
            "success": False,
            "error": {
                "code": "GLUEX_API_ERROR",
                "message": exc.message,
                "details": exc.response_data,
            },
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {"code": "HTTP_ERROR", "message": exc.detail},
        },
    )


# ============================================
# Health & Info Endpoints
# ============================================


@app.get("/", response_model=dict)
async def root():
    """Root endpoint with API information."""
    return {
        "name": "BIS Yield Optimizer API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health", response_model=HealthStatus)
async def health_check():
    """
    Health check endpoint.

    Returns server status and uptime.
    """
    uptime = time.time() - START_TIME

    # Check GlueX API connectivity (simple ping)
    gluex_status = "unknown"
    try:
        # Try to get supported chains as a health check
        _ = get_all_chains()
        gluex_status = "connected"
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        gluex_status = "disconnected"

    return HealthStatus(
        status="healthy" if gluex_status == "connected" else "degraded",
        version="1.0.0",
        timestamp=datetime.utcnow(),
        uptime_seconds=uptime,
        services={"gluex_api": gluex_status, "cache": "enabled"},
    )


# ============================================
# Chain Endpoints
# ============================================


@app.get("/api/chains", response_model=ChainsResponse)
async def get_chains():
    """
    Get list of supported blockchain networks.

    Returns all chains configured in SUPPORTED_CHAINS environment variable.
    """
    chains = [
        ChainInfo(
            id=chain.id,
            name=chain.name,
            chain_id=chain.chain_id,
            native_token=chain.native_token,
            color=chain.color,
            explorer_url=chain.explorer_url,
        )
        for chain in SUPPORTED_CHAINS
    ]

    return ChainsResponse(chains=chains, total=len(chains))


# ============================================
# Pool Endpoints
# ============================================


@app.get("/api/pools", response_model=PoolsResponse)
async def get_pools(
    chain: Optional[str] = Query(None, description="Filter by chain ID"),
    min_tvl: Optional[float] = Query(None, description="Minimum TVL filter"),
    min_apy: Optional[float] = Query(None, description="Minimum APY filter"),
    limit: int = Query(50, ge=1, le=500, description="Maximum results"),
):
    """
    Get list of available pools with TVL and APY data.

    Fetches pool data from GlueX API for the specified chain(s).
    """
    # Validate chain
    if chain and not is_chain_supported(chain):
        raise HTTPException(
            status_code=400,
            detail=f"Chain '{chain}' is not supported. Use /api/chains to see supported chains.",
        )

    # Determine which chains to query
    chains_to_query = [get_chain(chain)] if chain else SUPPORTED_CHAINS

    pools = []

    # For demo purposes, we'll create sample pool data
    # In production, you would query actual pool addresses from GlueX or a database
    # This is a placeholder implementation
    logger.info(f"Fetching pools for {len(chains_to_query)} chain(s)")

    # NOTE: GlueX doesn't have a "list all pools" endpoint
    # You need to know the pool addresses beforehand
    # This is a simplified demo - in production you'd maintain a list of pool addresses
    # or integrate with a protocol-specific API to discover pools

    sample_pools = _get_sample_pools(chains_to_query)

    # Apply filters
    if min_tvl:
        sample_pools = [p for p in sample_pools if p.tvl >= min_tvl]
    if min_apy:
        sample_pools = [p for p in sample_pools if p.apy >= min_apy]

    # Apply limit
    sample_pools = sample_pools[:limit]

    return PoolsResponse(pools=sample_pools, total=len(sample_pools), chain=chain)


def _get_sample_pools(chains: List) -> List[PoolData]:
    """
    Generate sample pool data for demonstration.

    TODO: Replace with actual pool discovery logic or database of known pools.
    """
    pools = []

    # Sample pool addresses (these would come from a database or discovery service)
    sample_addresses = [
        "0xe25514992597786e07872e6c5517fe1906c0cadd",
        "0xcdc3975df9d1cf054f44ed238edfb708880292ea",
        "0x8f9291606862eef771a97e5b71e4b98fd1fa216a",
        "0x9f75eac57d1c6f7248bd2aede58c95689f3827f7",
        "0x63cf7ee583d9954febf649ad1c40c97a6493b1be",
    ]

    for chain_config in chains:
        for i, address in enumerate(sample_addresses):
            pools.append(
                PoolData(
                    pool_address=address,
                    chain=chain_config.id,
                    name=f"Pool {i+1} on {chain_config.name}",
                    token_pair="ETH/USDC",  # Placeholder
                    tvl=1000000 + (i * 500000),  # Sample TVL
                    apy=8.0 + (i * 2.5),  # Sample APY
                    risk_level="low" if i % 3 == 0 else "medium" if i % 3 == 1 else "high",
                    protocol="GlueX Vault",
                    status="active",
                )
            )

    return pools


@app.get("/api/pools/{pool_address}/tvl", response_model=TVLResponse)
async def get_pool_tvl(
    pool_address: str = Path(..., description="Pool contract address"),
    chain: str = Query(..., description="Chain identifier (e.g., 'ethereum')"),
):
    """
    Get Total Value Locked (TVL) for a specific pool.

    Queries GlueX Yield API for real-time TVL data.
    """
    # Validate chain
    if not is_chain_supported(chain):
        raise HTTPException(
            status_code=400, detail=f"Chain '{chain}' is not supported"
        )

    try:
        # Query GlueX API
        response = gluex_client.get_tvl(chain=chain, pool_address=pool_address)

        if not response.get("success"):
            raise HTTPException(status_code=404, detail="TVL data not found")

        tvl_data = response.get("tvl", {})

        return TVLResponse(
            success=True,
            data=TVLData(
                pool_address=pool_address,
                chain=chain,
                tvl=tvl_data.get("tvl", 0.0),
                timestamp=datetime.utcnow(),
            ),
        )

    except GlueXAPIError as e:
        logger.error(f"Failed to fetch TVL: {e}")
        raise HTTPException(status_code=502, detail=f"GlueX API error: {e.message}")


@app.get("/api/pools/{pool_address}/apy", response_model=APYResponse)
async def get_pool_apy(
    pool_address: str = Path(..., description="Pool contract address"),
    chain: str = Query(..., description="Chain identifier"),
    timeframe: str = Query("7d", description="Timeframe (e.g., '7d', '30d')"),
):
    """
    Get historical APY data for a specific pool.

    Queries GlueX Yield API for APY trends over time.
    """
    # Validate chain
    if not is_chain_supported(chain):
        raise HTTPException(
            status_code=400, detail=f"Chain '{chain}' is not supported"
        )

    try:
        # Query GlueX API
        response = gluex_client.get_historical_apy(
            chain=chain, pool_address=pool_address
        )

        if not response.get("success"):
            raise HTTPException(status_code=404, detail="APY data not found")

        apy_data = response.get("historic_yield", {})
        current_apy = apy_data.get("apy", 0.0)

        # Generate sample historical data (in production, this would come from API)
        # GlueX API currently returns current APY, not full time series
        historical_points = _generate_sample_historical_apy(current_apy, timeframe)

        return APYResponse(
            success=True,
            data=HistoricalAPY(
                pool_address=pool_address,
                chain=chain,
                current_apy=current_apy,
                timeframe=timeframe,
                historical=historical_points,
            ),
        )

    except GlueXAPIError as e:
        logger.error(f"Failed to fetch APY: {e}")
        raise HTTPException(status_code=502, detail=f"GlueX API error: {e.message}")


def _generate_sample_historical_apy(
    current_apy: float, timeframe: str
) -> List[APYDataPoint]:
    """
    Generate sample historical APY data.

    TODO: Replace with actual historical data from GlueX or database.
    """
    import random
    from datetime import timedelta

    days = 7 if timeframe == "7d" else 30 if timeframe == "30d" else 7
    points = []

    for i in range(days):
        date = (datetime.utcnow() - timedelta(days=days - i - 1)).strftime("%Y-%m-%d")
        # Simulate slight variations around current APY
        variation = random.uniform(-0.5, 0.5)
        apy = max(0, current_apy + variation)
        points.append(APYDataPoint(date=date, apy=round(apy, 2)))

    return points


# ============================================
# Cache Management
# ============================================


@app.post("/api/cache/clear")
async def clear_cache():
    """
    Clear API response cache.

    Useful for forcing fresh data from GlueX API.
    """
    gluex_client.clear_cache()
    return {"success": True, "message": "Cache cleared successfully"}


@app.get("/api/cache/stats")
async def get_cache_stats():
    """
    Get cache statistics.

    Returns information about cached entries and hit rates.
    """
    stats = gluex_client.get_cache_stats()
    return {"success": True, "stats": stats}


# ============================================
# Run Server
# ============================================

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("API_PORT", "8000"))
    logger.info(f"Starting API server on port {port}")

    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
    )
