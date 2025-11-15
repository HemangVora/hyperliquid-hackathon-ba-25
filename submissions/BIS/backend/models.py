"""
Pydantic models for API request/response validation.
Defines data structures for pools, TVL, APY, and other API responses.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from datetime import datetime


# ============================================
# Chain Models
# ============================================

class ChainInfo(BaseModel):
    """Blockchain network information."""

    id: str = Field(..., description="Chain identifier (e.g., 'ethereum')")
    name: str = Field(..., description="Display name (e.g., 'Ethereum')")
    chain_id: int = Field(..., description="EVM chain ID")
    native_token: str = Field(..., description="Native token symbol")
    color: Optional[str] = Field(None, description="Brand color hex code")
    explorer_url: str = Field(..., description="Block explorer URL")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "ethereum",
                "name": "Ethereum",
                "chain_id": 1,
                "native_token": "ETH",
                "color": "#627EEA",
                "explorer_url": "https://etherscan.io",
            }
        }


class ChainsResponse(BaseModel):
    """Response containing list of supported chains."""

    chains: List[ChainInfo]
    total: int = Field(..., description="Total number of chains")

    class Config:
        json_schema_extra = {
            "example": {
                "chains": [
                    {
                        "id": "ethereum",
                        "name": "Ethereum",
                        "chain_id": 1,
                        "native_token": "ETH",
                        "color": "#627EEA",
                        "explorer_url": "https://etherscan.io",
                    }
                ],
                "total": 1,
            }
        }


# ============================================
# Pool Models
# ============================================

class PoolData(BaseModel):
    """Pool information with TVL and APY data."""

    pool_address: str = Field(..., description="Pool contract address")
    lp_token_address: Optional[str] = Field(
        None, description="LP token contract address"
    )
    chain: str = Field(..., description="Chain identifier")
    name: Optional[str] = Field(None, description="Pool name")
    token_pair: Optional[str] = Field(None, description="Token pair (e.g., 'ETH/USDC')")
    tvl: float = Field(..., description="Total Value Locked in USD")
    apy: float = Field(..., description="Annual Percentage Yield")
    risk_level: Optional[str] = Field(
        None, description="Risk level: 'low', 'medium', 'high'"
    )
    protocol: Optional[str] = Field(None, description="Protocol name (e.g., 'Uniswap')")
    status: str = Field(default="active", description="Pool status")

    @validator("risk_level")
    def validate_risk_level(cls, v):
        """Validate risk level is one of the allowed values."""
        if v is not None and v not in ["low", "medium", "high"]:
            return "medium"  # Default to medium if invalid
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "pool_address": "0x1234567890123456789012345678901234567890",
                "lp_token_address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
                "chain": "ethereum",
                "name": "ETH/USDC Pool",
                "token_pair": "ETH/USDC",
                "tvl": 1234567.89,
                "apy": 12.5,
                "risk_level": "low",
                "protocol": "Uniswap V3",
                "status": "active",
            }
        }


class PoolsResponse(BaseModel):
    """Response containing list of pools."""

    pools: List[PoolData]
    total: int = Field(..., description="Total number of pools")
    chain: Optional[str] = Field(None, description="Filtered by chain (if applicable)")

    class Config:
        json_schema_extra = {
            "example": {
                "pools": [
                    {
                        "pool_address": "0x1234567890123456789012345678901234567890",
                        "chain": "ethereum",
                        "name": "ETH/USDC Pool",
                        "tvl": 1234567.89,
                        "apy": 12.5,
                        "status": "active",
                    }
                ],
                "total": 1,
                "chain": "ethereum",
            }
        }


# ============================================
# TVL Models
# ============================================

class TVLData(BaseModel):
    """Total Value Locked data for a pool."""

    pool_address: str = Field(..., description="Pool contract address")
    chain: str = Field(..., description="Chain identifier")
    tvl: float = Field(..., description="Total Value Locked in USD")
    timestamp: Optional[datetime] = Field(
        default_factory=datetime.utcnow, description="Data timestamp"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "pool_address": "0x1234567890123456789012345678901234567890",
                "chain": "ethereum",
                "tvl": 1234567.89,
                "timestamp": "2025-01-15T10:30:00Z",
            }
        }


class TVLResponse(BaseModel):
    """Response for TVL query."""

    success: bool = True
    data: TVLData

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "pool_address": "0x1234567890123456789012345678901234567890",
                    "chain": "ethereum",
                    "tvl": 1234567.89,
                },
            }
        }


# ============================================
# APY Models
# ============================================

class APYDataPoint(BaseModel):
    """Single APY data point with timestamp."""

    date: str = Field(..., description="Date in YYYY-MM-DD format")
    apy: float = Field(..., description="APY percentage")

    class Config:
        json_schema_extra = {"example": {"date": "2025-01-15", "apy": 12.5}}


class HistoricalAPY(BaseModel):
    """Historical APY data for a pool."""

    pool_address: str = Field(..., description="Pool contract address")
    chain: str = Field(..., description="Chain identifier")
    current_apy: float = Field(..., description="Current APY percentage")
    timeframe: str = Field(..., description="Timeframe (e.g., '7d', '30d')")
    historical: List[APYDataPoint] = Field(..., description="Historical APY data points")

    class Config:
        json_schema_extra = {
            "example": {
                "pool_address": "0x1234567890123456789012345678901234567890",
                "chain": "ethereum",
                "current_apy": 12.5,
                "timeframe": "7d",
                "historical": [
                    {"date": "2025-01-08", "apy": 12.1},
                    {"date": "2025-01-09", "apy": 12.3},
                    {"date": "2025-01-10", "apy": 12.8},
                ],
            }
        }


class APYResponse(BaseModel):
    """Response for APY query."""

    success: bool = True
    data: HistoricalAPY

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "pool_address": "0x1234567890123456789012345678901234567890",
                    "chain": "ethereum",
                    "current_apy": 12.5,
                    "timeframe": "7d",
                    "historical": [],
                },
            }
        }


class DilutedAPY(BaseModel):
    """Diluted APY data based on input amount."""

    pool_address: str = Field(..., description="Pool contract address")
    chain: str = Field(..., description="Chain identifier")
    input_amount: str = Field(..., description="Input amount in wei")
    diluted_apy: float = Field(..., description="Diluted APY percentage")
    base_apy: float = Field(..., description="Base APY before dilution")

    class Config:
        json_schema_extra = {
            "example": {
                "pool_address": "0x1234567890123456789012345678901234567890",
                "chain": "ethereum",
                "input_amount": "1000000000000000000",
                "diluted_apy": 12.3,
                "base_apy": 12.5,
            }
        }


# ============================================
# Error Models
# ============================================

class ErrorDetail(BaseModel):
    """Detailed error information."""

    code: str = Field(..., description="Error code")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details")

    class Config:
        json_schema_extra = {
            "example": {
                "code": "POOL_NOT_FOUND",
                "message": "Pool not found on the specified chain",
                "details": {"pool_address": "0x...", "chain": "ethereum"},
            }
        }


class ErrorResponse(BaseModel):
    """Standard error response."""

    success: bool = False
    error: ErrorDetail

    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error": {
                    "code": "INVALID_CHAIN",
                    "message": "Chain 'invalid_chain' is not supported",
                },
            }
        }


# ============================================
# Health Check Models
# ============================================

class HealthStatus(BaseModel):
    """API health status."""

    status: str = Field(..., description="Health status: 'healthy' or 'unhealthy'")
    version: str = Field(..., description="API version")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Current timestamp"
    )
    uptime_seconds: Optional[float] = Field(None, description="Server uptime in seconds")
    services: Optional[Dict[str, str]] = Field(
        None, description="Status of dependent services"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "version": "1.0.0",
                "timestamp": "2025-01-15T10:30:00Z",
                "uptime_seconds": 3600.5,
                "services": {
                    "gluex_api": "connected",
                    "database": "not_configured",
                },
            }
        }


# ============================================
# Request Models
# ============================================

class PoolQueryParams(BaseModel):
    """Query parameters for pool listing."""

    chain: Optional[str] = Field(None, description="Filter by chain")
    limit: int = Field(50, ge=1, le=500, description="Maximum results to return")
    offset: int = Field(0, ge=0, description="Pagination offset")
    min_tvl: Optional[float] = Field(None, description="Minimum TVL filter")
    min_apy: Optional[float] = Field(None, description="Minimum APY filter")

    class Config:
        json_schema_extra = {
            "example": {
                "chain": "ethereum",
                "limit": 20,
                "offset": 0,
                "min_tvl": 100000,
                "min_apy": 5.0,
            }
        }
