# HyperGlueX Backend API Requirements

**Project:** HyperGlueX - DeFi Yield Optimization Platform for HyperLiquid
**Frontend Location:** `C:\HyperLiquid\hyperliquid-hackathon-ba-25\submissions\BIS\Frontend`
**Last Updated:** 2025-11-15

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Data Models & TypeScript Interfaces](#data-models--typescript-interfaces)
3. [API Endpoints Reference](#api-endpoints-reference)
   - [Authentication](#authentication-endpoints)
   - [Portfolio & Positions](#portfolio--positions-endpoints)
   - [Pool Operations](#pool-operations-endpoints)
   - [Strategy Management](#strategy-management-endpoints)
   - [Analytics & Metrics](#analytics--metrics-endpoints)
   - [Public Data](#public-data-endpoints)
4. [Real-Time WebSocket Specifications](#real-time-websocket-specifications)
5. [Authentication & Security](#authentication--security)
6. [Frontend Integration Points](#frontend-integration-points)
7. [Implementation Priority](#implementation-priority)
8. [Error Handling & Best Practices](#error-handling--best-practices)
9. [Quick Reference Table](#quick-reference-table)

---

## Executive Summary

HyperGlueX is a DeFi yield optimization platform that automatically manages liquidity pool positions on HyperLiquid. The frontend application currently uses mock data and requires a comprehensive backend API to enable full functionality.

**Current State:**
- Frontend: Fully built with Next.js 15, TypeScript, Tailwind CSS
- Mock data location: `src/data/mockPortfolio.ts`
- TypeScript interfaces: `src/types/portfolio.ts`

**Required Backend:**
- **19 total endpoints** (16 REST + 3 WebSocket)
- Wallet-based authentication (HyperLiquid wallet)
- Real-time data streams for portfolio updates
- HyperLiquid blockchain integration

---

## Data Models & TypeScript Interfaces

These interfaces are already defined in `src/types/portfolio.ts` and should be matched exactly by the backend API responses.

### Pool Interface

```typescript
interface Pool {
  id: string;                                    // Unique pool identifier
  name: string;                                  // Display name (e.g., "HYPE/USDC Pool")
  tokenPair: string;                             // Token pair (e.g., "HYPE-USDC")
  apy: number;                                   // Annual Percentage Yield
  deposited: number;                             // User's deposited amount in USD
  earnedToday: number;                           // Earnings today in USD
  earnedTotal: number;                           // Total earnings in USD
  status: 'active' | 'inactive';                 // Pool status
  icon?: string;                                 // Optional icon URL
  riskLevel?: 'low' | 'medium' | 'high';        // Risk assessment
}
```

### DailyEarning Interface

```typescript
interface DailyEarning {
  date: string;      // Format: 'YYYY-MM-DD'
  amount: number;    // Earnings amount in USD
}
```

### PortfolioData Interface

```typescript
interface PortfolioData {
  totalValue: number;              // Total portfolio value in USD
  totalEarningsToday: number;      // Today's total earnings
  totalEarningsAllTime: number;    // All-time total earnings
  percentageChange: number;        // 24h percentage change
  pools: Pool[];                   // Array of user's pool positions
  dailyEarnings: DailyEarning[];  // Historical daily earnings
}
```

### StrategyFeature Interface

```typescript
interface StrategyFeature {
  label: string;      // Feature description
  included: boolean;  // Whether feature is included in strategy
}
```

### Strategy Type

```typescript
type StrategyType = 'apy' | 'standard' | null;
```

---

## API Endpoints Reference

### Base URL
```
https://api.hypergluex.com/v1
```

### Common Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## Authentication Endpoints

### 1. Connect Wallet

**Endpoint:** `POST /api/auth/connect-wallet`
**Authentication:** Not required
**Purpose:** Connect and authenticate user's HyperLiquid wallet

**Request Body:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "signature": "0x...",
  "message": "Sign this message to authenticate with HyperGlueX"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "createdAt": "2025-11-15T10:00:00Z"
  }
}
```

**Error Responses:**
```json
// 401 Unauthorized
{
  "error": "Invalid signature",
  "message": "Wallet signature verification failed"
}

// 400 Bad Request
{
  "error": "Invalid wallet address",
  "message": "The provided wallet address is not valid"
}
```

---

### 2. Disconnect Wallet

**Endpoint:** `POST /api/auth/disconnect`
**Authentication:** Required
**Purpose:** Disconnect wallet and invalidate session

**Request Body:**
```json
{}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully disconnected"
}
```

---

### 3. Check Authentication Status

**Endpoint:** `GET /api/auth/status`
**Authentication:** Required
**Purpose:** Verify if user is authenticated

**Response (200 OK):**
```json
{
  "authenticated": true,
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response (401 Unauthorized):**
```json
{
  "authenticated": false,
  "message": "Token expired or invalid"
}
```

---

## Portfolio & Positions Endpoints

### 4. Get Portfolio Data

**Endpoint:** `GET /api/portfolio`
**Authentication:** Required
**Purpose:** Get complete portfolio data for authenticated user
**Frontend Usage:** Dashboard page, Portfolio page

**Response (200 OK):**
```json
{
  "totalValue": 125432.89,
  "totalEarningsToday": 342.15,
  "totalEarningsAllTime": 8965.42,
  "percentageChange": 2.47,
  "pools": [
    {
      "id": "pool-hype-usdc-001",
      "name": "HYPE/USDC Pool",
      "tokenPair": "HYPE-USDC",
      "apy": 45.8,
      "deposited": 50000,
      "earnedToday": 125.50,
      "earnedTotal": 3245.20,
      "status": "active",
      "icon": "https://cdn.hypergluex.com/tokens/hype.png",
      "riskLevel": "medium"
    },
    {
      "id": "pool-eth-usdc-002",
      "name": "ETH/USDC Pool",
      "tokenPair": "ETH-USDC",
      "apy": 38.2,
      "deposited": 35000,
      "earnedToday": 92.40,
      "earnedTotal": 2100.80,
      "status": "active",
      "riskLevel": "low"
    }
  ],
  "dailyEarnings": [
    { "date": "2025-11-15", "amount": 342.15 },
    { "date": "2025-11-14", "amount": 312.50 },
    { "date": "2025-11-13", "amount": 298.75 },
    { "date": "2025-11-12", "amount": 305.20 },
    { "date": "2025-11-11", "amount": 289.60 },
    { "date": "2025-11-10", "amount": 276.30 },
    { "date": "2025-11-09", "amount": 264.85 },
    { "date": "2025-11-08", "amount": 251.40 }
  ]
}
```

**Notes:**
- This is the **most critical endpoint** - replaces `mockPortfolioData`
- Should return exactly the `PortfolioData` interface structure
- Used by multiple components: PortfolioSummary, EarningsChart, PoolsTable

---

### 5. Get All Available Pools

**Endpoint:** `GET /api/pools`
**Authentication:** Required
**Purpose:** List all available liquidity pools on HyperLiquid

**Query Parameters:**
- `status` (optional): `'all'` | `'active'` | `'inactive'` - Filter by pool status
- `riskLevel` (optional): `'low'` | `'medium'` | `'high'` - Filter by risk level
- `search` (optional): `string` - Search by pool name or token pair

**Example Request:**
```
GET /api/pools?status=active&riskLevel=low&search=ETH
```

**Response (200 OK):**
```json
{
  "pools": [
    {
      "id": "pool-eth-usdc-002",
      "name": "ETH/USDC Pool",
      "tokenPair": "ETH-USDC",
      "apy": 38.2,
      "tvl": 5000000,
      "volume24h": 250000,
      "riskLevel": "low",
      "status": "active",
      "icon": "https://cdn.hypergluex.com/tokens/eth.png"
    },
    {
      "id": "pool-btc-usdc-003",
      "name": "BTC/USDC Pool",
      "tokenPair": "BTC-USDC",
      "apy": 42.5,
      "tvl": 8000000,
      "volume24h": 450000,
      "riskLevel": "low",
      "status": "active",
      "icon": "https://cdn.hypergluex.com/tokens/btc.png"
    }
  ],
  "total": 2,
  "filteredFrom": 50
}
```

---

### 6. Get Pool Details

**Endpoint:** `GET /api/pools/:poolId`
**Authentication:** Required
**Purpose:** Get detailed information about a specific pool

**Example Request:**
```
GET /api/pools/pool-hype-usdc-001
```

**Response (200 OK):**
```json
{
  "id": "pool-hype-usdc-001",
  "name": "HYPE/USDC Pool",
  "tokenPair": "HYPE-USDC",
  "apy": 45.8,
  "tvl": 3500000,
  "volume24h": 180000,
  "riskLevel": "medium",
  "status": "active",
  "icon": "https://cdn.hypergluex.com/tokens/hype.png",
  "userPosition": {
    "deposited": 50000,
    "currentValue": 51245.20,
    "earnedToday": 125.50,
    "earnedTotal": 3245.20,
    "depositedAt": "2025-10-01T10:00:00Z"
  },
  "historicalData": [
    { "date": "2025-11-15", "apy": 45.8, "tvl": 3500000 },
    { "date": "2025-11-14", "apy": 44.2, "tvl": 3450000 },
    { "date": "2025-11-13", "apy": 46.5, "tvl": 3600000 }
  ],
  "fees": {
    "depositFee": 0,
    "withdrawalFee": 0.1,
    "performanceFee": 2.0
  }
}
```

**Response (404 Not Found):**
```json
{
  "error": "Pool not found",
  "poolId": "invalid-pool-id"
}
```

---

### 7. Get User Positions

**Endpoint:** `GET /api/positions`
**Authentication:** Required
**Purpose:** Get user's current positions across all pools
**Frontend Usage:** Positions page metrics

**Response (200 OK):**
```json
{
  "totalPositions": 4,
  "activePositions": 4,
  "totalDeposited": 125432.89,
  "averageAPY": 42.2,
  "positions": [
    {
      "poolId": "pool-hype-usdc-001",
      "poolName": "HYPE/USDC Pool",
      "tokenPair": "HYPE-USDC",
      "deposited": 50000,
      "currentValue": 51245.20,
      "earnedToday": 125.50,
      "earnedTotal": 3245.20,
      "apy": 45.8,
      "status": "active",
      "riskLevel": "medium"
    },
    {
      "poolId": "pool-eth-usdc-002",
      "poolName": "ETH/USDC Pool",
      "tokenPair": "ETH-USDC",
      "deposited": 35000,
      "currentValue": 35892.40,
      "earnedToday": 92.40,
      "earnedTotal": 2100.80,
      "apy": 38.2,
      "status": "active",
      "riskLevel": "low"
    },
    {
      "poolId": "pool-btc-usdc-003",
      "poolName": "BTC/USDC Pool",
      "tokenPair": "BTC-USDC",
      "deposited": 25000,
      "currentValue": 26210.50,
      "earnedToday": 73.25,
      "earnedTotal": 1850.30,
      "apy": 42.5,
      "status": "active",
      "riskLevel": "low"
    },
    {
      "poolId": "pool-sol-usdc-004",
      "poolName": "SOL/USDC Pool",
      "tokenPair": "SOL-USDC",
      "deposited": 15432.89,
      "currentValue": 16519.12,
      "earnedToday": 51.00,
      "earnedTotal": 1769.12,
      "apy": 52.3,
      "status": "active",
      "riskLevel": "high"
    }
  ]
}
```

---

### 8. Get Earnings History

**Endpoint:** `GET /api/earnings/history`
**Authentication:** Required
**Purpose:** Get historical earnings data for charts

**Query Parameters:**
- `period` (optional): `'week'` | `'month'` | `'year'` | `'all'` - Time period (default: 'month')
- `poolId` (optional): `string` - Filter by specific pool

**Example Request:**
```
GET /api/earnings/history?period=week&poolId=pool-hype-usdc-001
```

**Response (200 OK):**
```json
{
  "dailyEarnings": [
    {
      "date": "2025-11-15",
      "amount": 342.15,
      "poolBreakdown": [
        { "poolId": "pool-hype-usdc-001", "poolName": "HYPE/USDC Pool", "amount": 125.50 },
        { "poolId": "pool-eth-usdc-002", "poolName": "ETH/USDC Pool", "amount": 92.40 },
        { "poolId": "pool-btc-usdc-003", "poolName": "BTC/USDC Pool", "amount": 73.25 },
        { "poolId": "pool-sol-usdc-004", "poolName": "SOL/USDC Pool", "amount": 51.00 }
      ]
    },
    {
      "date": "2025-11-14",
      "amount": 312.50,
      "poolBreakdown": [
        { "poolId": "pool-hype-usdc-001", "poolName": "HYPE/USDC Pool", "amount": 115.20 },
        { "poolId": "pool-eth-usdc-002", "poolName": "ETH/USDC Pool", "amount": 88.30 },
        { "poolId": "pool-btc-usdc-003", "poolName": "BTC/USDC Pool", "amount": 68.00 },
        { "poolId": "pool-sol-usdc-004", "poolName": "SOL/USDC Pool", "amount": 41.00 }
      ]
    }
  ],
  "totalEarnings": 8965.42,
  "period": "week"
}
```

---

## Pool Operations Endpoints

### 9. Deposit to Pool

**Endpoint:** `POST /api/pools/:poolId/deposit`
**Authentication:** Required
**Purpose:** Deposit funds into a liquidity pool

**Request Body:**
```json
{
  "amount": 1000,
  "transactionHash": "0x1234567890abcdef..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "position": {
    "poolId": "pool-hype-usdc-001",
    "deposited": 51000,
    "transactionHash": "0x1234567890abcdef...",
    "timestamp": "2025-11-15T10:30:00Z"
  },
  "message": "Successfully deposited 1000 USDC to HYPE/USDC Pool"
}
```

**Error Responses:**
```json
// 400 Bad Request
{
  "error": "Insufficient balance",
  "message": "Your wallet balance is insufficient for this deposit"
}

// 404 Not Found
{
  "error": "Pool not found",
  "poolId": "invalid-pool-id"
}

// 422 Unprocessable Entity
{
  "error": "Transaction verification failed",
  "message": "Could not verify transaction on blockchain"
}
```

---

### 10. Withdraw from Pool

**Endpoint:** `POST /api/pools/:poolId/withdraw`
**Authentication:** Required
**Purpose:** Withdraw funds from a liquidity pool

**Request Body:**
```json
{
  "amount": 1000,
  "transactionHash": "0xabcdef1234567890..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "position": {
    "poolId": "pool-hype-usdc-001",
    "deposited": 49000,
    "transactionHash": "0xabcdef1234567890...",
    "timestamp": "2025-11-15T10:35:00Z"
  },
  "message": "Successfully withdrew 1000 USDC from HYPE/USDC Pool"
}
```

**Error Responses:**
```json
// 400 Bad Request
{
  "error": "Insufficient position",
  "message": "Your position balance is insufficient for this withdrawal"
}

// 423 Locked
{
  "error": "Position locked",
  "message": "Position is locked until 2025-11-20",
  "unlockDate": "2025-11-20T00:00:00Z"
}
```

---

## Strategy Management Endpoints

### 11. Get Available Strategies

**Endpoint:** `GET /api/strategies`
**Authentication:** Required
**Purpose:** Get list of available optimization strategies
**Frontend Usage:** Strategies page

**Response (200 OK):**
```json
{
  "strategies": [
    {
      "id": "apy",
      "title": "APY Strategy",
      "description": "Maximum yield focused. Automatically selects pools with the highest APY to maximize your returns.",
      "currentAPY": "28.5%",
      "recommended": false,
      "features": [
        { "label": "Highest APY pools prioritized", "included": true },
        { "label": "Liquidity depth analysis", "included": false },
        { "label": "Historical performance tracking", "included": false },
        { "label": "Risk assessment", "included": false },
        { "label": "Impermanent loss protection", "included": false }
      ],
      "estimatedReturn": {
        "daily": 78.50,
        "monthly": 2355.00,
        "yearly": 28260.00
      }
    },
    {
      "id": "standard",
      "title": "Standard Strategy",
      "description": "Balanced optimization. Considers multiple factors including liquidity and historical performance for sustainable returns.",
      "currentAPY": "24.2%",
      "recommended": true,
      "features": [
        { "label": "Highest APY pools prioritized", "included": true },
        { "label": "Liquidity depth analysis", "included": true },
        { "label": "Historical performance tracking", "included": true },
        { "label": "Risk assessment", "included": true },
        { "label": "Impermanent loss protection", "included": false }
      ],
      "estimatedReturn": {
        "daily": 66.75,
        "monthly": 2002.50,
        "yearly": 24030.00
      }
    }
  ]
}
```

---

### 12. Get User's Selected Strategy

**Endpoint:** `GET /api/user/strategy`
**Authentication:** Required
**Purpose:** Get user's currently selected optimization strategy

**Response (200 OK):**
```json
{
  "selectedStrategy": "standard",
  "appliedAt": "2025-11-01T10:00:00Z",
  "performance": {
    "currentAPY": "24.2%",
    "totalEarnings": 8965.42,
    "averageDailyEarnings": 342.15,
    "daysSinceApplied": 14
  }
}
```

**Response (404 Not Found):**
```json
{
  "selectedStrategy": null,
  "message": "No strategy selected yet"
}
```

---

### 13. Apply New Strategy

**Endpoint:** `POST /api/user/strategy`
**Authentication:** Required
**Purpose:** Apply a new optimization strategy
**Frontend Usage:** Strategies page "Apply Strategy" button (line 272)

**Request Body:**
```json
{
  "strategyId": "apy"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "strategy": {
    "id": "apy",
    "appliedAt": "2025-11-15T10:40:00Z",
    "estimatedRebalancing": {
      "poolsToAdd": [
        {
          "poolId": "pool-sol-usdc-004",
          "poolName": "SOL/USDC Pool",
          "apy": 52.3,
          "suggestedAmount": 15000
        }
      ],
      "poolsToRemove": [
        {
          "poolId": "pool-eth-usdc-002",
          "poolName": "ETH/USDC Pool",
          "apy": 38.2,
          "reason": "Lower APY than threshold"
        }
      ],
      "estimatedNewAPY": "28.5%",
      "rebalancingRequired": true
    }
  },
  "message": "APY Strategy applied successfully. Rebalancing recommendations available."
}
```

**Error Responses:**
```json
// 400 Bad Request
{
  "error": "Invalid strategy",
  "message": "Strategy ID 'invalid-strategy' does not exist"
}

// 409 Conflict
{
  "error": "Strategy already applied",
  "message": "This strategy is already active for your account"
}
```

---

## Analytics & Metrics Endpoints

### 14. Get Portfolio Analytics

**Endpoint:** `GET /api/analytics/portfolio`
**Authentication:** Required
**Purpose:** Get detailed portfolio analytics and performance metrics

**Query Parameters:**
- `period` (optional): `'week'` | `'month'` | `'year'` - Analysis period (default: 'month')

**Example Request:**
```
GET /api/analytics/portfolio?period=month
```

**Response (200 OK):**
```json
{
  "performance": {
    "totalReturn": 8965.42,
    "totalReturnPercentage": 7.15,
    "averageAPY": 42.2,
    "bestPerformingPool": {
      "poolId": "pool-sol-usdc-004",
      "poolName": "SOL/USDC Pool",
      "apy": 52.3,
      "earnings": 1769.12
    },
    "worstPerformingPool": {
      "poolId": "pool-eth-usdc-002",
      "poolName": "ETH/USDC Pool",
      "apy": 38.2,
      "earnings": 2100.80
    }
  },
  "riskDistribution": {
    "low": 2,
    "medium": 1,
    "high": 1
  },
  "chartData": {
    "portfolioValue": [
      { "date": "2025-10-15", "value": 115000.00 },
      { "date": "2025-10-22", "value": 118234.50 },
      { "date": "2025-10-29", "value": 121567.80 },
      { "date": "2025-11-05", "value": 123890.20 },
      { "date": "2025-11-12", "value": 124876.30 },
      { "date": "2025-11-15", "value": 125432.89 }
    ],
    "dailyEarnings": [
      { "date": "2025-11-08", "amount": 251.40 },
      { "date": "2025-11-09", "amount": 264.85 },
      { "date": "2025-11-10", "amount": 276.30 },
      { "date": "2025-11-11", "amount": 289.60 },
      { "date": "2025-11-12", "amount": 305.20 },
      { "date": "2025-11-13", "amount": 298.75 },
      { "date": "2025-11-14", "amount": 312.50 },
      { "date": "2025-11-15", "amount": 342.15 }
    ]
  },
  "period": "month"
}
```

---

### 15. Get Risk Analysis

**Endpoint:** `GET /api/analytics/risk`
**Authentication:** Required
**Purpose:** Get risk assessment and distribution analysis
**Frontend Usage:** Positions page "Risk Distribution" section

**Response (200 OK):**
```json
{
  "overallRiskScore": 6.5,
  "riskLevel": "medium",
  "distribution": {
    "low": {
      "count": 2,
      "percentage": 50,
      "totalValue": 60000,
      "pools": ["pool-eth-usdc-002", "pool-btc-usdc-003"]
    },
    "medium": {
      "count": 1,
      "percentage": 25,
      "totalValue": 50000,
      "pools": ["pool-hype-usdc-001"]
    },
    "high": {
      "count": 1,
      "percentage": 25,
      "totalValue": 15432.89,
      "pools": ["pool-sol-usdc-004"]
    }
  },
  "recommendations": [
    "Consider rebalancing to reduce high-risk exposure",
    "Your portfolio is well-diversified across risk levels",
    "Medium risk pools offer good balance of APY and stability"
  ],
  "comparisonToAverage": {
    "yourRiskScore": 6.5,
    "platformAverage": 5.2,
    "percentile": 68
  }
}
```

---

## Public Data Endpoints

### 16. Get Platform Statistics

**Endpoint:** `GET /api/public/stats`
**Authentication:** Not required
**Purpose:** Get platform-wide statistics for landing page marketing

**Response (200 OK):**
```json
{
  "totalValueLocked": "2548392",
  "activeUsers": "1247",
  "averageAPY": "24.8",
  "poolsSupported": "52",
  "totalEarningsDistributed": "156892.45",
  "last24hVolume": "847321.00"
}
```

**Notes:**
- This endpoint is public and does not require authentication
- Used on home page for platform statistics display
- Should be cached aggressively (5-15 minutes)

---

## Real-Time WebSocket Specifications

### WebSocket Base URL
```
wss://api.hypergluex.com/v1/ws
```

### Authentication
WebSockets require authentication via query parameter or initial message:

**Option 1: Query Parameter**
```javascript
wss://api.hypergluex.com/v1/ws/portfolio?token=<jwt_token>
```

**Option 2: Initial Message**
```javascript
// Connect without token
const ws = new WebSocket('wss://api.hypergluex.com/v1/ws/portfolio');

// Send auth message first
ws.send(JSON.stringify({
  type: 'auth',
  token: '<jwt_token>'
}));
```

---

### 17. WebSocket: Portfolio Updates

**Endpoint:** `WS /ws/portfolio`
**Purpose:** Real-time portfolio value and earnings updates

**Server Messages:**

```javascript
// Portfolio Update
{
  "type": "portfolio_update",
  "data": {
    "totalValue": 125532.89,
    "totalEarningsToday": 342.15,
    "percentageChange": 2.47,
    "updatedAt": "2025-11-15T10:45:00Z"
  }
}

// Earnings Update
{
  "type": "earnings_update",
  "data": {
    "totalEarningsToday": 345.20,
    "increase": 3.05,
    "updatedAt": "2025-11-15T10:45:30Z"
  }
}

// Error
{
  "type": "error",
  "message": "Authentication failed",
  "code": "AUTH_ERROR"
}
```

**Client Messages:**

```javascript
// Heartbeat/Ping
{
  "type": "ping"
}

// Subscribe to specific pools
{
  "type": "subscribe_pools",
  "poolIds": ["pool-hype-usdc-001", "pool-eth-usdc-002"]
}
```

---

### 18. WebSocket: Pool Data Updates

**Endpoint:** `WS /ws/pools`
**Purpose:** Real-time pool APY, TVL, and status updates

**Server Messages:**

```javascript
// Pool Update
{
  "type": "pool_update",
  "data": {
    "poolId": "pool-hype-usdc-001",
    "apy": 45.9,
    "tvl": 3510000,
    "volume24h": 185000,
    "updatedAt": "2025-11-15T10:45:00Z"
  }
}

// Multiple Pools Update
{
  "type": "pools_batch_update",
  "data": [
    {
      "poolId": "pool-hype-usdc-001",
      "apy": 45.9,
      "tvl": 3510000
    },
    {
      "poolId": "pool-eth-usdc-002",
      "apy": 38.5,
      "tvl": 5020000
    }
  ],
  "updatedAt": "2025-11-15T10:45:00Z"
}
```

---

### 19. WebSocket: Earnings Notifications

**Endpoint:** `WS /ws/earnings`
**Purpose:** Real-time earnings notifications and updates

**Server Messages:**

```javascript
// New Earning
{
  "type": "earning_update",
  "data": {
    "poolId": "pool-hype-usdc-001",
    "poolName": "HYPE/USDC Pool",
    "amount": 2.50,
    "timestamp": "2025-11-15T10:45:00Z"
  }
}

// Daily Summary
{
  "type": "daily_summary",
  "data": {
    "totalEarningsToday": 342.15,
    "poolBreakdown": [
      { "poolId": "pool-hype-usdc-001", "poolName": "HYPE/USDC Pool", "amount": 125.50 },
      { "poolId": "pool-eth-usdc-002", "poolName": "ETH/USDC Pool", "amount": 92.40 }
    ],
    "timestamp": "2025-11-15T23:59:59Z"
  }
}
```

---

## Authentication & Security

### Authentication Flow

1. **User clicks "Connect Wallet" button** (Header or Home page)
2. **Frontend requests signature from MetaMask/wallet**
   ```javascript
   const message = "Sign this message to authenticate with HyperGlueX";
   const signature = await wallet.signMessage(message);
   ```
3. **Frontend sends to backend**
   ```javascript
   POST /api/auth/connect-wallet
   {
     "walletAddress": "0x...",
     "signature": "0x...",
     "message": "Sign this message..."
   }
   ```
4. **Backend verifies signature** and returns JWT token
5. **Frontend stores token** (localStorage or sessionStorage)
6. **Frontend includes token in all subsequent requests**
   ```javascript
   headers: {
     'Authorization': `Bearer ${token}`
   }
   ```

### JWT Token Structure

```javascript
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "iat": 1700000000,  // Issued at
    "exp": 1700086400   // Expires at (24 hours later)
  }
}
```

### Security Requirements

- **HTTPS only** - All API communication must use HTTPS
- **CORS configuration** - Allow frontend domain only
- **Rate limiting** - Implement rate limits per endpoint
  - Auth endpoints: 5 requests/minute
  - Read endpoints: 100 requests/minute
  - Write endpoints: 10 requests/minute
- **Input validation** - Validate all request inputs
- **Signature verification** - Always verify wallet signatures
- **Token expiration** - 24-hour token expiration recommended
- **Refresh tokens** - Implement refresh token mechanism

---

## Frontend Integration Points

### Current Files Using Mock Data

1. **`src/data/mockPortfolio.ts`**
   - Contains all mock data
   - **Action:** Replace with API service layer

2. **`src/app/dashboard/page.tsx`** (Line 6)
   ```typescript
   import { mockPortfolioData } from '@/data/mockPortfolio';
   ```
   - **Action:** Replace with `usePortfolio()` hook calling `GET /api/portfolio`

3. **`src/app/portfolio/page.tsx`** (Line 6)
   ```typescript
   import { mockPortfolioData } from '@/data/mockPortfolio';
   ```
   - **Action:** Replace with `usePortfolio()` hook calling `GET /api/portfolio`

4. **`src/app/dashboard/positions/page.tsx`** (Line 6)
   ```typescript
   import { mockPortfolioData } from '@/data/mockPortfolio';
   ```
   - **Action:** Replace with `usePositions()` hook calling `GET /api/positions`

5. **`src/app/dashboard/strategies/page.tsx`** (Line 272)
   ```typescript
   // "Apply Strategy" button - currently no implementation
   <button className="...">Apply Strategy</button>
   ```
   - **Action:** Call `POST /api/user/strategy` with selected strategy

### TODO Comments Found

- **File:** `src/app/dashboard/strategies/page.tsx`
- **Line:** 80
- **Comment:** `// TODO: Implement actual strategy selection logic`
- **Solution:** Implement `POST /api/user/strategy` API call

### Required Frontend Implementation

#### 1. API Service Layer (`src/services/api.ts`)

```typescript
// Base API client
class APIClient {
  private baseURL = 'https://api.hypergluex.com/v1';
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('API Error');
    return response.json();
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('API Error');
    return response.json();
  }
}

export const apiClient = new APIClient();

// Portfolio API
export const portfolioAPI = {
  getPortfolio: () => apiClient.get<PortfolioData>('/api/portfolio'),
  getPositions: () => apiClient.get('/api/positions'),
  getEarningsHistory: (period: string) =>
    apiClient.get(`/api/earnings/history?period=${period}`),
};

// Strategy API
export const strategyAPI = {
  getStrategies: () => apiClient.get('/api/strategies'),
  getUserStrategy: () => apiClient.get('/api/user/strategy'),
  applyStrategy: (strategyId: string) =>
    apiClient.post('/api/user/strategy', { strategyId }),
};
```

#### 2. React Query Hooks (`src/hooks/usePortfolio.ts`)

```typescript
import { useQuery } from '@tanstack/react-query';
import { portfolioAPI } from '@/services/api';

export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: portfolioAPI.getPortfolio,
    refetchInterval: 60000, // Refetch every minute
  });
}

export function usePositions() {
  return useQuery({
    queryKey: ['positions'],
    queryFn: portfolioAPI.getPositions,
    refetchInterval: 60000,
  });
}
```

#### 3. WebSocket Service (`src/services/websocket.ts`)

```typescript
class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(endpoint: string, token: string) {
    const url = `wss://api.hypergluex.com/v1/ws${endpoint}?token=${token}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      this.attemptReconnect(endpoint, token);
    };
  }

  private handleMessage(message: any) {
    // Emit events for React components to listen to
    window.dispatchEvent(new CustomEvent('ws-message', { detail: message }));
  }

  private attemptReconnect(endpoint: string, token: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(endpoint, token), 3000);
    }
  }

  disconnect() {
    this.ws?.close();
  }
}

export const wsService = new WebSocketService();
```

---

## Implementation Priority

### Phase 1: Core Functionality (Week 1)
**Priority: Critical**

1. **Authentication**
   - `POST /api/auth/connect-wallet`
   - `GET /api/auth/status`
   - `POST /api/auth/disconnect`

2. **Portfolio Data**
   - `GET /api/portfolio` - **Most critical endpoint**
   - Replace mock data in Dashboard and Portfolio pages

3. **Frontend Integration**
   - Create API service layer
   - Set up React Query
   - Implement authentication flow

**Deliverable:** Users can connect wallet and view their portfolio

---

### Phase 2: Extended Features (Week 2)
**Priority: High**

4. **Positions & Analytics**
   - `GET /api/positions`
   - `GET /api/analytics/risk`
   - `GET /api/earnings/history`

5. **Pool Operations**
   - `GET /api/pools`
   - `GET /api/pools/:poolId`
   - `POST /api/pools/:poolId/deposit`
   - `POST /api/pools/:poolId/withdraw`

6. **Strategy Management**
   - `GET /api/strategies`
   - `GET /api/user/strategy`
   - `POST /api/user/strategy` - **Complete TODO at line 272**

**Deliverable:** Full portfolio management and strategy selection

---

### Phase 3: Real-Time & Advanced Features (Week 3)
**Priority: Medium**

7. **Real-Time Updates**
   - `WS /ws/portfolio`
   - `WS /ws/pools`
   - `WS /ws/earnings`

8. **Advanced Analytics**
   - `GET /api/analytics/portfolio`

9. **Public Data**
   - `GET /api/public/stats`

**Deliverable:** Live updates and comprehensive analytics

---

### Phase 4: Polish & Optimization (Week 4)
**Priority: Low**

10. **Performance Optimization**
    - Implement caching strategies
    - Optimize WebSocket reconnection
    - Add request batching

11. **Error Handling**
    - Comprehensive error states
    - Retry mechanisms
    - User-friendly error messages

12. **Testing & Documentation**
    - API integration tests
    - Frontend E2E tests
    - API documentation updates

**Deliverable:** Production-ready application

---

## Error Handling & Best Practices

### Standard Error Response Format

All error responses should follow this structure:

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### HTTP Status Codes

- **200 OK** - Successful request
- **201 Created** - Resource created successfully
- **400 Bad Request** - Invalid request parameters
- **401 Unauthorized** - Missing or invalid authentication
- **403 Forbidden** - Authenticated but not authorized
- **404 Not Found** - Resource not found
- **409 Conflict** - Resource conflict (e.g., strategy already applied)
- **422 Unprocessable Entity** - Validation failed
- **423 Locked** - Resource is locked
- **429 Too Many Requests** - Rate limit exceeded
- **500 Internal Server Error** - Server error
- **503 Service Unavailable** - Service temporarily unavailable

### Rate Limiting Headers

Include rate limit information in response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1700000000
```

### Caching Strategy

| Endpoint | Cache Duration | Strategy |
|----------|---------------|----------|
| GET /api/portfolio | 1-5 minutes | Stale-while-revalidate |
| GET /api/pools | 5-10 minutes | Stale-while-revalidate |
| GET /api/positions | 1-5 minutes | Stale-while-revalidate |
| GET /api/earnings/history | 15-30 minutes | Cache-first |
| GET /api/strategies | 1 hour | Cache-first |
| GET /api/public/stats | 5-15 minutes | Cache-first |
| Real-time (WebSocket) | No cache | Live connection |

### Retry Logic

Implement exponential backoff for failed requests:

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;

      // Don't retry on 4xx errors (except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

### Optimistic Updates

For write operations (deposit, withdraw, strategy changes), implement optimistic UI updates:

```typescript
const mutation = useMutation({
  mutationFn: (data) => strategyAPI.applyStrategy(data.strategyId),
  onMutate: async (newStrategy) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['userStrategy'] });

    // Snapshot previous value
    const previousStrategy = queryClient.getQueryData(['userStrategy']);

    // Optimistically update
    queryClient.setQueryData(['userStrategy'], newStrategy);

    return { previousStrategy };
  },
  onError: (err, newStrategy, context) => {
    // Rollback on error
    queryClient.setQueryData(['userStrategy'], context.previousStrategy);
  },
  onSettled: () => {
    // Refetch to ensure sync
    queryClient.invalidateQueries({ queryKey: ['userStrategy'] });
  },
});
```

---

## Quick Reference Table

| # | Method | Endpoint | Purpose | Auth | Priority |
|---|--------|----------|---------|------|----------|
| 1 | POST | `/api/auth/connect-wallet` | Connect wallet | No | Critical |
| 2 | POST | `/api/auth/disconnect` | Disconnect wallet | Yes | Critical |
| 3 | GET | `/api/auth/status` | Check auth status | Yes | Critical |
| 4 | GET | `/api/portfolio` | Get portfolio data | Yes | Critical |
| 5 | GET | `/api/pools` | List all pools | Yes | High |
| 6 | GET | `/api/pools/:poolId` | Get pool details | Yes | High |
| 7 | GET | `/api/positions` | Get user positions | Yes | High |
| 8 | GET | `/api/earnings/history` | Get earnings history | Yes | High |
| 9 | POST | `/api/pools/:poolId/deposit` | Deposit to pool | Yes | High |
| 10 | POST | `/api/pools/:poolId/withdraw` | Withdraw from pool | Yes | High |
| 11 | GET | `/api/strategies` | List strategies | Yes | High |
| 12 | GET | `/api/user/strategy` | Get user strategy | Yes | High |
| 13 | POST | `/api/user/strategy` | Apply strategy | Yes | High |
| 14 | GET | `/api/analytics/portfolio` | Portfolio analytics | Yes | Medium |
| 15 | GET | `/api/analytics/risk` | Risk analysis | Yes | Medium |
| 16 | GET | `/api/public/stats` | Platform stats | No | Medium |
| 17 | WS | `/ws/portfolio` | Real-time portfolio | Yes | Medium |
| 18 | WS | `/ws/pools` | Real-time pool data | Yes | Medium |
| 19 | WS | `/ws/earnings` | Real-time earnings | Yes | Medium |

---

## Additional Notes

### HyperLiquid Integration Requirements

The backend needs to integrate with HyperLiquid blockchain to:

1. **Read user positions** from HyperLiquid smart contracts
2. **Fetch pool data** (APY, TVL, volume) from HyperLiquid
3. **Monitor transactions** for deposits/withdrawals
4. **Listen to events** for real-time updates
5. **Verify signatures** from HyperLiquid wallets

### Database Schema Recommendations

Consider storing:
- User profiles (wallet addresses, preferences)
- Strategy selections and history
- Cached pool data for performance
- Earnings history for analytics
- Transaction logs for audit trail

### Environment Variables

Backend should use these environment variables:

```env
# API Configuration
API_BASE_URL=https://api.hypergluex.com/v1
JWT_SECRET=<your-secret-key>
JWT_EXPIRY=24h

# HyperLiquid Configuration
HYPERLIQUID_RPC_URL=<hyperliquid-rpc-endpoint>
HYPERLIQUID_CHAIN_ID=<chain-id>

# Database
DATABASE_URL=<database-connection-string>

# Redis (for caching)
REDIS_URL=<redis-connection-string>

# WebSocket
WS_PORT=8080
WS_PATH=/v1/ws
```

### Performance Targets

- **API Response Time:** < 200ms (p95)
- **WebSocket Latency:** < 100ms
- **Cache Hit Rate:** > 80%
- **Uptime:** 99.9%

### Testing Recommendations

1. **Unit Tests** - Test individual API endpoints
2. **Integration Tests** - Test HyperLiquid integration
3. **E2E Tests** - Test complete user flows
4. **Load Tests** - Test under concurrent users
5. **WebSocket Tests** - Test real-time updates

---

## Support & Questions

For questions about frontend implementation or API integration:

1. Review TypeScript interfaces in `src/types/portfolio.ts`
2. Check mock data structure in `src/data/mockPortfolio.ts`
3. Reference component usage in `src/app/` pages
4. Test API responses match expected interfaces

**Frontend is ready to integrate - backend just needs to match the existing TypeScript interfaces!**

---

**Document Version:** 1.0
**Last Updated:** 2025-11-15
**Status:** Ready for Backend Implementation
