# Backend-Frontend Architecture Guide

**Comprehensive guide on how backend and frontend connect, security considerations, API integration, and production architecture.**

---

## Table of Contents

1. [How Backend-Frontend Connection Works](#how-backend-frontend-connection-works)
2. [Frontend Security Considerations](#frontend-security-considerations)
3. [Getting Data from Public APIs](#getting-data-from-public-apis)
4. [Production Architecture & Responsibilities](#production-architecture--responsibilities)
5. [Best Practices](#best-practices)

---

## How Backend-Frontend Connection Works

### Overview

In a typical production setup, you have three main layers:

```
┌─────────────────┐
│   Frontend      │  (Next.js - Browser)
│   (React)       │
└────────┬────────┘
         │ HTTP/HTTPS (REST API)
         │ WebSocket (Real-time)
         ▼
┌─────────────────┐
│   Backend API   │  (FastAPI/Express - Server)
│   (HTTP Server) │
└────────┬────────┘
         │
         ├──► External APIs (GlueX, etc.)
         ├──► Blockchain (HyperLiquid RPC)
         └──► Database (PostgreSQL/MongoDB)
```

### Current State vs Production State

#### Current State (Your Project)
- **Frontend**: Next.js app using mock data from `src/data/mockPortfolio.ts`
- **Backend**: Python script (`yield_optimizer.py`) that runs continuously and interacts with blockchain directly
- **Connection**: ❌ **No connection yet** - frontend and backend are separate

#### Production State (What You Need)
- **Frontend**: Next.js app making HTTP requests to backend API
- **Backend API**: FastAPI/Express server exposing REST endpoints
- **Backend Service**: Python script running in background (can be same server or separate)
- **Connection**: ✅ HTTP/WebSocket connection between frontend and backend API

### Connection Flow

#### 1. **REST API Communication** (Most Common)

```typescript
// Frontend (src/services/api.ts)
const response = await fetch('https://api.yourapp.com/api/portfolio', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
```

```python
# Backend API (FastAPI)
@app.get("/api/portfolio")
async def get_portfolio(token: str = Depends(verify_token)):
    # Fetch data from database or blockchain
    portfolio_data = await get_portfolio_from_db(token.user_id)
    return portfolio_data
```

**Request Flow:**
1. User action triggers API call in frontend
2. Frontend sends HTTP request to backend API
3. Backend validates authentication/authorization
4. Backend fetches/computes data (from DB, blockchain, or external APIs)
5. Backend returns JSON response
6. Frontend updates UI with received data

#### 2. **WebSocket Communication** (Real-time Updates)

```typescript
// Frontend - WebSocket connection
const ws = new WebSocket('wss://api.yourapp.com/ws/portfolio?token=xxx');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  // Update UI in real-time
  setPortfolioValue(update.totalValue);
};
```

```python
# Backend - WebSocket handler
@app.websocket("/ws/portfolio")
async def websocket_portfolio(websocket: WebSocket, token: str):
    await websocket.accept()
    # Subscribe to blockchain events or database changes
    # Push updates when portfolio changes
    while True:
        update = await get_latest_portfolio_update()
        await websocket.send_json(update)
        await asyncio.sleep(5)
```

### Authentication Flow

```typescript
// 1. User clicks "Connect Wallet" in frontend
const message = "Sign this message to authenticate";
const signature = await wallet.signMessage(message);

// 2. Frontend sends to backend
const response = await fetch('/api/auth/connect-wallet', {
  method: 'POST',
  body: JSON.stringify({
    walletAddress: address,
    signature: signature,
    message: message
  })
});

// 3. Backend verifies signature and returns JWT token
const { token } = await response.json();

// 4. Frontend stores token and includes in all future requests
localStorage.setItem('auth_token', token);
```

```python
# Backend - Verify signature and issue token
from web3 import Web3

@app.post("/api/auth/connect-wallet")
async def connect_wallet(request: WalletAuthRequest):
    # Verify signature
    is_valid = verify_signature(
        request.walletAddress,
        request.message,
        request.signature
    )
    
    if not is_valid:
        raise HTTPException(401, "Invalid signature")
    
    # Create JWT token
    token = create_jwt_token(request.walletAddress)
    return {"token": token, "user": {...}}
```

---

## Frontend Security Considerations

### ⚠️ Critical Security Rules for Frontend

#### 1. **Never Expose Private Keys or Secrets**

```typescript
// ❌ BAD - Never do this!
const PRIVATE_KEY = "0x1234567890abcdef..."; // Exposed to browser!
const API_SECRET = "secret_key_123"; // Anyone can see this!

// ✅ GOOD - Only use public data
const publicConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL, // Public endpoint
  contractAddress: "0x..." // Public contract address
};
```

**Why:** Everything in frontend code is visible to users. Any secrets can be extracted from browser DevTools.

#### 2. **Always Validate API Responses**

```typescript
// ❌ BAD - Trusting backend blindly
const response = await fetch('/api/portfolio');
const data = await response.json();
setPortfolio(data); // What if backend returns malicious data?

// ✅ GOOD - Validate response structure
interface PortfolioResponse {
  totalValue: number;
  pools: Pool[];
}

const response = await fetch('/api/portfolio');
const data: PortfolioResponse = await response.json();

// Validate data structure
if (!data || typeof data.totalValue !== 'number') {
  throw new Error('Invalid portfolio data');
}
setPortfolio(data);
```

#### 3. **Sanitize User Input**

```typescript
// ❌ BAD - XSS vulnerability
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ GOOD - Sanitize or use React's built-in escaping
<div>{userInput}</div> // React automatically escapes

// Or use a sanitization library
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

#### 4. **Protect Against CSRF Attacks**

```typescript
// ✅ GOOD - Use SameSite cookies and CSRF tokens
const response = await fetch('/api/pools/deposit', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-CSRF-Token': getCsrfToken(), // From cookie set by backend
  },
  credentials: 'same-origin', // Only send cookies to same origin
});
```

#### 5. **Handle Sensitive Data Carefully**

```typescript
// ❌ BAD - Storing sensitive data in localStorage
localStorage.setItem('privateKey', privateKey);
localStorage.setItem('password', password);

// ✅ GOOD - Only store tokens, never private keys
localStorage.setItem('auth_token', token); // OK - can be revoked
sessionStorage.setItem('temp_data', tempData); // Better for sensitive temp data

// For wallet connections, use wallet extensions (MetaMask, etc.)
// Never store or handle private keys in frontend code
```

#### 6. **Implement Rate Limiting on Frontend**

```typescript
// ✅ GOOD - Prevent spam requests
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second

async function fetchWithRateLimit(url: string) {
  const now = Date.now();
  if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
    throw new Error('Please wait before making another request');
  }
  lastRequestTime = now;
  return fetch(url);
}
```

#### 7. **Validate Blockchain Transactions Client-Side**

```typescript
// ✅ GOOD - Validate before sending to blockchain
async function depositToPool(amount: number, poolId: string) {
  // Validate amount
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }
  
  // Check balance
  const balance = await getBalance();
  if (balance < amount) {
    throw new Error('Insufficient balance');
  }
  
  // Show confirmation dialog
  const confirmed = await showConfirmDialog({
    message: `Deposit ${amount} USDC to ${poolId}?`,
    details: { gasEstimate: '...', fees: '...' }
  });
  
  if (!confirmed) return;
  
  // Then send transaction
  const tx = await contract.requestDeposit(amount);
  await tx.wait();
}
```

#### 8. **Handle Errors Gracefully**

```typescript
// ✅ GOOD - Don't expose internal errors to users
try {
  const data = await fetchPortfolio();
} catch (error) {
  // Log full error for debugging
  console.error('Portfolio fetch error:', error);
  
  // Show user-friendly message
  showErrorToast('Failed to load portfolio. Please try again.');
  
  // Don't expose:
  // - Stack traces
  // - Internal API endpoints
  // - Database errors
  // - Server details
}
```

#### 9. **Use Environment Variables Correctly**

```typescript
// ✅ GOOD - Only use NEXT_PUBLIC_ prefix for public variables
// .env.local (NOT committed to git)
NEXT_PUBLIC_API_URL=https://api.yourapp.com
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=998

// ❌ BAD - Don't prefix private secrets (they won't work anyway)
API_SECRET=secret123 // Won't be accessible in frontend
DATABASE_URL=postgres://... // Won't be accessible
```

#### 10. **Implement Content Security Policy (CSP)**

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // For Web3
              "connect-src 'self' https://api.yourapp.com wss://api.yourapp.com",
              "img-src 'self' data: https:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};
```

---

## Getting Data from Public APIs

### Three Types of API Calls in Your App

#### 1. **Frontend → Backend API** (Your Own API)

```typescript
// src/services/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class APIClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new APIClient();

// Usage
export const portfolioAPI = {
  getPortfolio: () => apiClient.get<PortfolioData>('/api/portfolio'),
  getPositions: () => apiClient.get('/api/positions'),
};
```

#### 2. **Backend → External Public APIs** (GlueX, etc.)

```python
# backend/services/gluex_client.py
import requests
from typing import Dict, List

class GlueXClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.gluex.xyz"
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })
    
    def get_historical_apy(self, vaults: List[str], timeframe: str = "7d") -> Dict:
        """Query GlueX Yields API"""
        try:
            response = self.session.post(
                f"{self.base_url}/yields/historical-apy",
                json={
                    "vaults": vaults,
                    "timeframe": timeframe
                },
                timeout=10  # Always set timeout
            )
            response.raise_for_status()  # Raise exception for bad status codes
            return response.json()
        except requests.RequestException as e:
            logger.error(f"GlueX API error: {e}")
            return {}
```

**Why Backend Calls External APIs:**
- ✅ Can use API keys securely (not exposed to browser)
- ✅ Can cache responses to reduce API costs
- ✅ Can aggregate data from multiple sources
- ✅ Can add rate limiting and retry logic

#### 3. **Frontend → Blockchain Directly** (Via RPC)

```typescript
// src/lib/blockchain.ts
import { ethers } from 'ethers';

// Connect to HyperLiquid RPC
const provider = new ethers.JsonRpcProvider(
  process.env.NEXT_PUBLIC_HYPERLIQUID_RPC_URL
);

// Read from contract (view functions - no gas needed)
export async function getTotalAssets(vaultAddress: string): Promise<bigint> {
  const contract = new ethers.Contract(
    vaultAddress,
    VAULT_ABI,
    provider
  );
  
  return await contract.totalAssets();
}

// Write to contract (requires wallet signature)
export async function requestDeposit(
  signer: ethers.Signer,
  vaultAddress: string,
  amount: bigint
): Promise<ethers.ContractTransactionResponse> {
  const contract = new ethers.Contract(
    vaultAddress,
    VAULT_ABI,
    signer  // Use signer for write operations
  );
  
  return await contract.requestDeposit(amount);
}
```

### Best Practices for API Calls

#### 1. **Error Handling**

```typescript
// ✅ GOOD - Comprehensive error handling
async function fetchPortfolio(): Promise<PortfolioData> {
  try {
    const response = await fetch('/api/portfolio');
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired - redirect to login
        redirectToLogin();
        throw new Error('Authentication required');
      }
      if (response.status === 429) {
        // Rate limited - retry after delay
        await delay(1000);
        return fetchPortfolio();
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return validatePortfolioData(data);
  } catch (error) {
    if (error instanceof NetworkError) {
      // Network issue - show retry option
      showRetryDialog();
    }
    throw error;
  }
}
```

#### 2. **Caching**

```typescript
// ✅ GOOD - Cache API responses
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

#### 3. **Loading States**

```typescript
// ✅ GOOD - Show loading states
function PortfolioPage() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const portfolio = await portfolioAPI.getPortfolio();
        setData(portfolio);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <EmptyState />;

  return <PortfolioView data={data} />;
}
```

#### 4. **Retry Logic**

```typescript
// ✅ GOOD - Retry failed requests
async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetcher();
    } catch (error) {
      lastError = error;
      
      // Don't retry on 4xx errors (except 429)
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }
      
      // Exponential backoff
      await delay(Math.pow(2, i) * 1000);
    }
  }
  
  throw lastError!;
}
```

---

## Production Architecture & Responsibilities

### Complete Production Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Browser (Frontend)                                   │  │
│  │  - Next.js React App                                  │  │
│  │  - User Interface                                     │  │
│  │  - Wallet Integration (MetaMask, etc.)               │  │
│  └────────┬─────────────────────────────────────────────┘  │
└───────────┼─────────────────────────────────────────────────┘
            │ HTTPS/WSS
            ▼
┌─────────────────────────────────────────────────────────────┐
│                      EDGE/LOAD BALANCER                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  CloudFlare / AWS CloudFront / NGINX                 │  │
│  │  - SSL Termination                                   │  │
│  │  - DDoS Protection                                   │  │
│  │  - Rate Limiting                                     │  │
│  │  - CDN (Static Assets)                               │  │
│  └────────┬─────────────────────────────────────────────┘  │
└───────────┼─────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API SERVER LAYER                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Backend API (FastAPI/Express)                        │  │
│  │  - REST Endpoints                                     │  │
│  │  - WebSocket Server                                   │  │
│  │  - Authentication/Authorization                       │  │
│  │  - Request Validation                                 │  │
│  │  - Business Logic                                     │  │
│  └────────┬─────────────────────────────────────────────┘  │
└───────────┼─────────────────────────────────────────────────┘
            │
            ├──────────────────┬──────────────────┬──────────┐
            ▼                  ▼                  ▼          ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ ┌──────┐
    │  Database    │  │    Cache     │  │ External APIs│ │Queue │
    │  PostgreSQL  │  │    Redis     │  │  (GlueX)     │ │Redis │
    │  - Users     │  │  - API Cache │  │  - Yields    │ │-Jobs │
    │  - Positions │  │  - Sessions  │  │  - Router    │ │      │
    │  - History   │  │              │  │              │ │      │
    └──────────────┘  └──────────────┘  └──────────────┘ └──────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKGROUND SERVICES LAYER                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Yield Optimizer Service (Python)                     │  │
│  │  - Monitors GlueX APIs                                │  │
│  │  - Calculates optimal allocations                     │  │
│  │  - Executes rebalancing transactions                  │  │
│  │  - Updates database                                   │  │
│  └────────┬─────────────────────────────────────────────┘  │
└───────────┼─────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                      BLOCKCHAIN LAYER                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  HyperLiquid Network                                  │  │
│  │  - Smart Contracts                                    │  │
│  │  - RPC Nodes                                          │  │
│  │  - Event Logs                                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Responsibilities by Component

#### **Frontend Responsibilities**

1. **User Interface**
   - Render UI components
   - Handle user interactions
   - Show loading/error states
   - Client-side validation

2. **Client-Side State Management**
   - Manage component state
   - Cache API responses (React Query, SWR)
   - Handle form inputs
   - Client-side routing

3. **Wallet Integration**
   - Connect user wallets
   - Request signatures for authentication
   - Initiate blockchain transactions
   - Display transaction status

4. **API Communication**
   - Make HTTP requests to backend API
   - Handle authentication tokens
   - Retry failed requests
   - Parse and validate responses

5. **Real-Time Updates**
   - Connect to WebSocket
   - Handle real-time data updates
   - Reconnect on disconnection

**What Frontend Should NOT Do:**
- ❌ Store private keys or secrets
- ❌ Perform complex business logic
- ❌ Directly query blockchain for all data (use backend API)
- ❌ Make sensitive API calls directly

#### **Backend API Responsibilities**

1. **Request Handling**
   - Validate incoming requests
   - Authenticate and authorize users
   - Parse request bodies
   - Return JSON responses

2. **Business Logic**
   - Process business rules
   - Calculate metrics and analytics
   - Aggregate data from multiple sources
   - Transform data for frontend

3. **Data Management**
   - Query database for user data
   - Update database records
   - Cache frequently accessed data
   - Handle data migrations

4. **External API Integration**
   - Call external APIs (GlueX, etc.)
   - Store API keys securely
   - Handle rate limiting
   - Cache external API responses

5. **Real-Time Communication**
   - Maintain WebSocket connections
   - Push updates to connected clients
   - Handle connection lifecycle

**What Backend API Should NOT Do:**
- ❌ Store private keys (use secure vaults)
- ❌ Make expensive computations synchronously (use background jobs)
- ❌ Trust client data without validation

#### **Background Services Responsibilities**

1. **Automated Tasks**
   - Run scheduled jobs
   - Monitor external APIs
   - Process queued jobs
   - Execute blockchain transactions

2. **Data Processing**
   - Calculate complex metrics
   - Aggregate historical data
   - Generate reports
   - Clean up old data

3. **Blockchain Interaction**
   - Monitor smart contract events
   - Execute rebalancing transactions
   - Track transaction status
   - Update database from events

**What Background Services Should NOT Do:**
- ❌ Handle user requests directly (use API server)
- ❌ Expose HTTP endpoints (if possible, keep internal)

#### **Database Responsibilities**

1. **Data Persistence**
   - Store user data
   - Store portfolio positions
   - Store transaction history
   - Store cached API responses

2. **Data Integrity**
   - Enforce constraints
   - Handle transactions
   - Maintain referential integrity
   - Backup and recovery

#### **External APIs Responsibilities** (GlueX, etc.)

1. **Data Provision**
   - Provide current APY rates
   - Provide historical data
   - Provide pool information
   - Provide router quotes

### Data Flow Examples

#### Example 1: User Views Portfolio

```
1. User opens dashboard
   ↓
2. Frontend calls GET /api/portfolio
   ↓
3. Backend API receives request
   ↓
4. Backend validates JWT token
   ↓
5. Backend queries database for user's positions
   ↓
6. Backend queries blockchain for current balances (optional - or use cached data)
   ↓
7. Backend queries GlueX API for current APYs (or uses cache)
   ↓
8. Backend aggregates all data
   ↓
9. Backend returns JSON to frontend
   ↓
10. Frontend renders portfolio UI
```

#### Example 2: User Deposits to Pool

```
1. User clicks "Deposit" button
   ↓
2. Frontend shows confirmation dialog
   ↓
3. User confirms, frontend calls MetaMask to sign transaction
   ↓
4. Transaction sent directly to blockchain (bypasses backend)
   ↓
5. Frontend shows "Transaction pending..."
   ↓
6. Background service detects deposit event from blockchain
   ↓
7. Background service updates database
   ↓
8. Backend API WebSocket pushes update to frontend
   ↓
9. Frontend updates UI with new position
```

#### Example 3: Automated Rebalancing

```
1. Background service runs optimization cycle (every 5 minutes)
   ↓
2. Service queries GlueX API for current yields
   ↓
3. Service calculates optimal allocation
   ↓
4. Service calls smart contract to rebalance
   ↓
5. Service waits for transaction confirmation
   ↓
6. Service updates database with new allocations
   ↓
7. Backend API WebSocket pushes update to all connected frontends
   ↓
8. Frontend updates portfolio display
```

### Deployment Considerations

#### Frontend Deployment
- **Platform**: Vercel, Netlify, AWS S3 + CloudFront
- **Build**: Static HTML/JS/CSS files
- **Environment**: Production API URL, contract addresses
- **SSL**: HTTPS required (no HTTP)

#### Backend API Deployment
- **Platform**: AWS ECS, Heroku, DigitalOcean, Railway
- **Requirements**: Node.js/Python runtime
- **Scaling**: Horizontal scaling (multiple instances behind load balancer)
- **Environment**: Database URL, API keys, JWT secret

#### Background Services Deployment
- **Platform**: AWS ECS, Kubernetes, separate server
- **Requirements**: Continuous running process
- **Monitoring**: Logs, alerts, health checks
- **Resilience**: Auto-restart on failure

#### Database Deployment
- **Platform**: AWS RDS, PostgreSQL on server, managed DB
- **Backup**: Automated daily backups
- **Security**: Encrypted at rest, network isolation
- **Scaling**: Read replicas for high read load

---

## Best Practices

### 1. **API Design**

```typescript
// ✅ GOOD - RESTful, consistent naming
GET    /api/portfolio          // Get user portfolio
GET    /api/positions          // Get user positions
POST   /api/pools/:id/deposit  // Deposit to pool
GET    /api/pools/:id          // Get pool details

// ❌ BAD - Inconsistent, unclear
GET    /getPortfolio
POST   /deposit-money
GET    /pool_info/:id
```

### 2. **Error Handling**

```typescript
// ✅ GOOD - Consistent error format
{
  "error": "INSUFFICIENT_BALANCE",
  "message": "Your balance is insufficient for this deposit",
  "details": {
    "required": 1000,
    "available": 500
  }
}

// ❌ BAD - Inconsistent error format
"Error: Not enough money"
// or
{ "status": "failed", "msg": "error" }
```

### 3. **Caching Strategy**

```typescript
// Cache tiers
1. Browser cache (public data, static assets)
2. CDN cache (static files, public APIs)
3. API cache (Redis) - frequently accessed data
4. Database query cache - expensive queries
5. External API cache - reduce API calls
```

### 4. **Security Checklist**

- ✅ All API endpoints use HTTPS
- ✅ JWT tokens expire (24 hours)
- ✅ Rate limiting on all endpoints
- ✅ Input validation on all requests
- ✅ CORS configured correctly
- ✅ No secrets in frontend code
- ✅ Content Security Policy headers
- ✅ SQL injection protection (use ORM)
- ✅ XSS protection (sanitize inputs)

### 5. **Performance Optimization**

- ✅ API response compression (gzip)
- ✅ Pagination for large lists
- ✅ Lazy loading of components
- ✅ Image optimization
- ✅ Code splitting
- ✅ Database query optimization
- ✅ Caching strategy

---

## Summary

### Key Takeaways

1. **Frontend**: Handles UI, user interactions, wallet connections. Never stores secrets.

2. **Backend API**: Handles business logic, authentication, data aggregation. Acts as secure intermediary.

3. **Background Services**: Handle automated tasks, blockchain monitoring, heavy computations.

4. **External APIs**: Called by backend (never directly by frontend for security).

5. **Blockchain**: Read operations from frontend (via RPC), write operations from user's wallet, monitoring from background services.

6. **Security**: Frontend is public - validate everything. Backend must validate all inputs. Never trust client data.

7. **Production**: Use HTTPS, implement rate limiting, monitor errors, use caching, scale horizontally.

---

**For your specific project:**

- ✅ Your backend `yield_optimizer.py` should be enhanced to also expose an HTTP API
- ✅ Frontend should replace `mockPortfolioData` with actual API calls
- ✅ Create a service layer in frontend for API communication
- ✅ Implement authentication flow (wallet signature → JWT token)
- ✅ Set up WebSocket for real-time portfolio updates



