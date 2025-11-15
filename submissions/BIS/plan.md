# 🏆 GlueX Yield Optimization - 2-Day Hackathon Plan

**Prize:** $3,000 | **Team:** 3 Members | **Timeline:** 48 Hours

---

## 📋 TEAM ROLES

- **Member 1**: Frontend (React/Next.js + TypeScript + ethers.js)
- **Member 2**: Smart Contracts (Solidity + Foundry + ERC-7540)
- **Member 3**: Backend (Python + FastAPI + GlueX APIs)

---

## 🎯 PROJECT OVERVIEW

**Goal:** Build an automated yield optimization vault that monitors HyperEVM markets via GlueX Yields API and reallocates funds to maximize returns.

**Core Features:**
- ERC-7540 async deposit/withdrawal vault
- Real-time APY monitoring via GlueX APIs
- Automated reallocation using GlueX Router
- User dashboard with performance analytics

---

## 📡 API CONTRACTS (Define First!)

### Backend → Frontend API
```typescript
// GET /api/v1/vault/stats
{
  tvl: number,
  currentAPY: number,
  totalUsers: number,
  totalYieldGenerated: number
}

// GET /api/v1/yields/current
{
  protocols: Array<{
    name: string,
    address: string,
    apy: number,
    tvl: number,
    allocation: number  // % of our vault
  }>
}

// GET /api/v1/reallocations/history
{
  reallocations: Array<{
    id: string,
    timestamp: number,
    fromProtocol: string,
    toProtocol: string,
    amount: string,
    apyFrom: number,
    apyTo: number,
    gasCost: string,
    txHash: string
  }>
}

// GET /api/v1/user/{address}/position
{
  deposited: string,
  shares: string,
  currentValue: string,
  yieldEarned: string,
  depositTimestamp: number
}
```

### Smart Contract Events
```solidity
event DepositRequested(address indexed user, uint256 assets, uint256 timestamp);
event DepositFulfilled(address indexed user, uint256 shares, uint256 timestamp);
event RedeemRequested(address indexed user, uint256 shares, uint256 timestamp);
event Reallocated(address fromProtocol, address toProtocol, uint256 amount);
event PerformanceFeeCollected(uint256 amount);
```

### Environment Variables
```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_HYPEREVM_RPC=https://api.hyperliquid-testnet.xyz/evm

# Backend (.env)
GLUEX_API_KEY=your_api_key
GLUEX_YIELDS_API=https://yield-api.gluex.xyz
GLUEX_ROUTER_API=https://router.gluex.xyz/v1
HYPEREVM_RPC=https://api.hyperliquid-testnet.xyz/evm
PRIVATE_KEY=0x...
VAULT_ADDRESS=0x...

# Smart Contracts (.env)
HYPEREVM_RPC_URL=https://api.hyperliquid-testnet.xyz/evm
PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=...
```

---

# DAY 1: BUILD CORE FUNCTIONALITY (16 hours)

## 🚀 HOUR 0-2: SETUP & ARCHITECTURE

### All Team - Coordination
- [ ] **Kickoff meeting (15 min)**
  - Confirm API contracts above
  - Agree on folder structure
  - Set up communication (Discord/Telegram)
  - Define integration test points

- [ ] **GitHub Setup**
  - [ ] Create branches: `frontend`, `contracts`, `backend`
  - [ ] Set up mono-repo structure or separate repos
  - [ ] Add `.gitignore` for each component

### FRONTEND Tasks
- [ ] **Initialize Next.js Project (30 min)**
  ```bash
  npx create-next-app@latest gluex-yield-app --typescript --tailwind --app
  cd gluex-yield-app
  npm install ethers wagmi viem @rainbow-me/rainbowkit recharts react-hot-toast
  ```

- [ ] **Folder Structure (15 min)**
  ```
  /app
    /page.tsx          # Main dashboard
    /layout.tsx        # Root layout with wallet provider
  /components
    /VaultStats.tsx
    /DepositCard.tsx
    /APYComparison.tsx
    /ReallocationFeed.tsx
  /lib
    /api.ts            # Backend API calls
    /contracts.ts      # Contract ABIs and addresses
    /wagmi.ts          # Wagmi config
  /hooks
    /useVault.ts       # Vault contract interactions
  ```

- [ ] **Wagmi + RainbowKit Setup (45 min)**
  - Configure HyperEVM chain
  - Set up wallet providers
  - Create connect button component

**Acceptance Criteria:**
- ✅ Can run `npm run dev` successfully
- ✅ Can connect wallet on HyperEVM testnet
- ✅ Basic layout renders

---

### SMART CONTRACTS Tasks
- [ ] **Initialize Foundry Project (20 min)**
  ```bash
  forge init yield-vault
  cd yield-vault
  forge install OpenZeppelin/openzeppelin-contracts
  forge install foundry-rs/forge-std
  ```

- [ ] **Project Structure (15 min)**
  ```
  /src
    /YieldOptimizationVault.sol     # Main ERC-7540 vault
    /GlueXAdapter.sol                # GlueX integration
    /interfaces
      /IERC7540.sol
      /IGlueXRouter.sol
  /test
    /YieldVault.t.sol
    /GlueXAdapter.t.sol
  /script
    /Deploy.s.sol
  ```

- [ ] **Configure foundry.toml (15 min)**
  ```toml
  [profile.default]
  src = "src"
  out = "out"
  libs = ["lib"]
  solc_version = "0.8.20"

  [rpc_endpoints]
  hyperevm = "${HYPEREVM_RPC_URL}"

  [etherscan]
  hyperevm = { key = "${ETHERSCAN_API_KEY}" }
  ```

- [ ] **Create Interface Files (30 min)**
  - IERC7540.sol (copy from EIP-7540 spec)
  - IGlueXRouter.sol (basic interface)

**Acceptance Criteria:**
- ✅ `forge build` compiles successfully
- ✅ `forge test` runs (even if no tests yet)

---

### BACKEND Tasks
- [ ] **Initialize FastAPI Project (30 min)**
  ```bash
  mkdir gluex-backend && cd gluex-backend
  python -m venv venv
  source venv/bin/activate  # or venv\Scripts\activate on Windows
  pip install fastapi uvicorn web3 httpx python-dotenv sqlalchemy
  ```

- [ ] **Project Structure (20 min)**
  ```
  /app
    /main.py              # FastAPI app
    /config.py            # Environment config
    /api
      /routes
        /yields.py
        /vault.py
        /reallocations.py
    /services
      /gluex_client.py    # GlueX API wrapper
      /blockchain.py      # Web3 interactions
    /engine
      /optimizer.py       # Yield optimization logic
    /models
      /schemas.py         # Pydantic models
  ```

- [ ] **Basic FastAPI Setup (30 min)**
  ```python
  # main.py
  from fastapi import FastAPI
  from fastapi.middleware.cors import CORSMiddleware

  app = FastAPI(title="GlueX Yield Optimizer API")

  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],
      allow_methods=["*"],
      allow_headers=["*"],
  )

  @app.get("/health")
  async def health():
      return {"status": "ok"}
  ```

- [ ] **Test Server Runs (10 min)**
  ```bash
  uvicorn app.main:app --reload
  # Visit http://localhost:8000/docs
  ```

**Acceptance Criteria:**
- ✅ FastAPI server runs on port 8000
- ✅ Can access /docs endpoint
- ✅ CORS configured for frontend

---

## ⚙️ HOUR 2-8: CORE IMPLEMENTATION SPRINT

### FRONTEND Tasks (6 hours)

#### Task F1: Wallet Connection & Network Handling (1 hour)
- [ ] Create `lib/wagmi.ts` with HyperEVM config
  ```typescript
  import { createConfig, http } from 'wagmi'
  import { hyperEVM } from './chains'

  export const config = createConfig({
    chains: [hyperEVM],
    transports: {
      [hyperEVM.id]: http(process.env.NEXT_PUBLIC_HYPEREVM_RPC)
    }
  })
  ```
- [ ] Add RainbowKit provider in `layout.tsx`
- [ ] Create connect button component
- [ ] Test wallet connection + network switch

**Time:** 1 hour | **Dependency:** None

---

#### Task F2: Deposit Interface (2 hours)
- [ ] Create `components/DepositCard.tsx`
  ```typescript
  export function DepositCard() {
    const [amount, setAmount] = useState('')
    const { address } = useAccount()
    const { data: balance } = useBalance({ address })

    const handleDeposit = async () => {
      // 1. Approve token
      // 2. Call requestDeposit on vault
      // 3. Show transaction status
    }

    return (
      <div className="card">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount to deposit"
        />
        <button onClick={handleDeposit}>Deposit</button>
      </div>
    )
  }
  ```

- [ ] Implement token approval flow
- [ ] Implement `requestDeposit` transaction
- [ ] Add loading states and error handling
- [ ] Add transaction status notifications (react-hot-toast)

**Time:** 2 hours | **Dependency:** F1, Vault deployed

---

#### Task F3: Vault Stats Dashboard (1.5 hours)
- [ ] Create `components/VaultStats.tsx`
  ```typescript
  export function VaultStats() {
    const { data: stats } = useSWR('/api/v1/vault/stats', fetcher)

    return (
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="TVL" value={`$${stats?.tvl}`} />
        <StatCard label="Current APY" value={`${stats?.currentAPY}%`} />
        <StatCard label="Users" value={stats?.totalUsers} />
        <StatCard label="Yield Generated" value={`$${stats?.totalYieldGenerated}`} />
      </div>
    )
  }
  ```

- [ ] Create reusable StatCard component
- [ ] Fetch data from backend API
- [ ] Add loading skeletons
- [ ] Format numbers nicely (with commas, decimals)

**Time:** 1.5 hours | **Dependency:** Backend API running

---

#### Task F4: APY Comparison Table (1.5 hours)
- [ ] Create `components/APYComparison.tsx`
  ```typescript
  export function APYComparison() {
    const { data: yields } = useSWR('/api/v1/yields/current', fetcher)

    return (
      <table className="w-full">
        <thead>
          <tr>
            <th>Protocol</th>
            <th>APY</th>
            <th>TVL</th>
            <th>Our Allocation</th>
          </tr>
        </thead>
        <tbody>
          {yields?.protocols.map(p => (
            <tr key={p.address}>
              <td>{p.name}</td>
              <td className={p.allocation > 0 ? 'text-green-500' : ''}>
                {p.apy}%
              </td>
              <td>${p.tvl}</td>
              <td>{p.allocation}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }
  ```

- [ ] Style table with Tailwind
- [ ] Highlight current allocation
- [ ] Sort by APY (highest first)
- [ ] Add refresh button

**Time:** 1.5 hours | **Dependency:** Backend API

---

### SMART CONTRACTS Tasks (6 hours)

#### Task SC1: ERC-7540 Vault Core (3 hours)
- [ ] Create `YieldOptimizationVault.sol`
  ```solidity
  // SPDX-License-Identifier: MIT
  pragma solidity ^0.8.20;

  import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
  import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
  import "@openzeppelin/contracts/access/Ownable.sol";
  import "./interfaces/IERC7540.sol";

  contract YieldOptimizationVault is ERC4626, IERC7540, Ownable {

      struct DepositRequest {
          uint256 assets;
          uint256 requestTime;
          bool fulfilled;
      }

      struct RedeemRequest {
          uint256 shares;
          uint256 requestTime;
          bool fulfilled;
      }

      mapping(address => DepositRequest) public depositRequests;
      mapping(address => RedeemRequest) public redeemRequests;

      event DepositRequested(address indexed user, uint256 assets);
      event DepositFulfilled(address indexed user, uint256 shares);
      event RedeemRequested(address indexed user, uint256 shares);
      event RedeemFulfilled(address indexed user, uint256 assets);

      constructor(
          IERC20 _asset,
          string memory _name,
          string memory _symbol
      ) ERC4626(_asset) ERC20(_name, _symbol) Ownable(msg.sender) {}

      // ERC-7540 Request Functions
      function requestDeposit(
          uint256 assets,
          address receiver,
          address owner
      ) external returns (uint256 requestId) {
          require(assets > 0, "Zero assets");

          // Transfer assets from user to vault
          IERC20(asset()).transferFrom(msg.sender, address(this), assets);

          depositRequests[receiver] = DepositRequest({
              assets: assets,
              requestTime: block.timestamp,
              fulfilled: false
          });

          emit DepositRequested(receiver, assets);
          return uint256(uint160(receiver));
      }

      function requestRedeem(
          uint256 shares,
          address receiver,
          address owner
      ) external returns (uint256 requestId) {
          require(shares > 0, "Zero shares");
          require(balanceOf(owner) >= shares, "Insufficient shares");

          // Transfer shares from user to vault
          _transfer(owner, address(this), shares);

          redeemRequests[receiver] = RedeemRequest({
              shares: shares,
              requestTime: block.timestamp,
              fulfilled: false
          });

          emit RedeemRequested(receiver, shares);
          return uint256(uint160(receiver));
      }

      // Owner functions to fulfill requests
      function fulfillDeposit(address user) external onlyOwner {
          DepositRequest storage request = depositRequests[user];
          require(!request.fulfilled, "Already fulfilled");
          require(request.assets > 0, "No request");

          uint256 shares = previewDeposit(request.assets);
          _mint(user, shares);

          request.fulfilled = true;
          emit DepositFulfilled(user, shares);
      }

      function fulfillRedeem(address user) external onlyOwner {
          RedeemRequest storage request = redeemRequests[user];
          require(!request.fulfilled, "Already fulfilled");
          require(request.shares > 0, "No request");

          uint256 assets = previewRedeem(request.shares);
          _burn(address(this), request.shares);
          IERC20(asset()).transfer(user, assets);

          request.fulfilled = true;
          emit RedeemFulfilled(user, assets);
      }

      function totalAssets() public view override returns (uint256) {
          // Return total assets under management
          return IERC20(asset()).balanceOf(address(this));
      }
  }
  ```

- [ ] Add NatSpec comments
- [ ] Test compilation: `forge build`

**Time:** 3 hours | **Dependency:** None

---

#### Task SC2: Basic Tests (1.5 hours)
- [ ] Create `test/YieldVault.t.sol`
  ```solidity
  // SPDX-License-Identifier: MIT
  pragma solidity ^0.8.20;

  import "forge-std/Test.sol";
  import "../src/YieldOptimizationVault.sol";
  import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

  contract MockERC20 is ERC20 {
      constructor() ERC20("Mock USDC", "USDC") {
          _mint(msg.sender, 1000000 * 10**18);
      }

      function mint(address to, uint256 amount) external {
          _mint(to, amount);
      }
  }

  contract YieldVaultTest is Test {
      YieldOptimizationVault public vault;
      MockERC20 public usdc;
      address public user = address(0x1);

      function setUp() public {
          usdc = new MockERC20();
          vault = new YieldOptimizationVault(
              IERC20(address(usdc)),
              "Yield Vault",
              "yvUSDC"
          );

          // Give user some USDC
          usdc.mint(user, 1000 * 10**18);
      }

      function testRequestDeposit() public {
          vm.startPrank(user);
          usdc.approve(address(vault), 100 * 10**18);
          vault.requestDeposit(100 * 10**18, user, user);
          vm.stopPrank();

          (uint256 assets, , bool fulfilled) = vault.depositRequests(user);
          assertEq(assets, 100 * 10**18);
          assertFalse(fulfilled);
      }

      function testFulfillDeposit() public {
          // Request deposit
          vm.startPrank(user);
          usdc.approve(address(vault), 100 * 10**18);
          vault.requestDeposit(100 * 10**18, user, user);
          vm.stopPrank();

          // Fulfill as owner
          vault.fulfillDeposit(user);

          // Check shares minted
          assertGt(vault.balanceOf(user), 0);
      }
  }
  ```

- [ ] Run tests: `forge test -vvv`
- [ ] Aim for 80%+ coverage

**Time:** 1.5 hours | **Dependency:** SC1

---

#### Task SC3: GlueX Integration Adapter (1.5 hours)
- [ ] Create `GlueXAdapter.sol`
  ```solidity
  // SPDX-License-Identifier: MIT
  pragma solidity ^0.8.20;

  import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
  import "@openzeppelin/contracts/access/Ownable.sol";

  interface IGlueXRouter {
      function swap(
          address fromToken,
          address toToken,
          uint256 amount,
          bytes calldata routeData
      ) external returns (uint256);
  }

  contract GlueXAdapter is Ownable {
      address public vault;
      address public glueXRouter;

      mapping(address => bool) public supportedProtocols;

      event Reallocated(
          address indexed fromProtocol,
          address indexed toProtocol,
          uint256 amount
      );

      constructor(address _vault, address _glueXRouter) Ownable(msg.sender) {
          vault = _vault;
          glueXRouter = _glueXRouter;
      }

      modifier onlyVault() {
          require(msg.sender == vault, "Only vault");
          _;
      }

      function addProtocol(address protocol) external onlyOwner {
          supportedProtocols[protocol] = true;
      }

      function depositToProtocol(
          address protocol,
          address token,
          uint256 amount
      ) external onlyVault {
          require(supportedProtocols[protocol], "Unsupported protocol");

          // Simple implementation: just hold for now
          // In production: call protocol's deposit function
          IERC20(token).transferFrom(vault, address(this), amount);
      }

      function withdrawFromProtocol(
          address protocol,
          address token,
          uint256 amount
      ) external onlyVault returns (uint256) {
          require(supportedProtocols[protocol], "Unsupported protocol");

          // Simple implementation: transfer back
          IERC20(token).transfer(vault, amount);
          return amount;
      }

      function reallocate(
          address fromProtocol,
          address toProtocol,
          address token,
          uint256 amount
      ) external onlyVault {
          // 1. Withdraw from current protocol
          withdrawFromProtocol(fromProtocol, token, amount);

          // 2. Deposit to new protocol
          depositToProtocol(toProtocol, token, amount);

          emit Reallocated(fromProtocol, toProtocol, amount);
      }
  }
  ```

**Time:** 1.5 hours | **Dependency:** SC1

---

### BACKEND Tasks (6 hours)

#### Task BE1: GlueX API Client (2 hours)
- [ ] Create `services/gluex_client.py`
  ```python
  import httpx
  from typing import Dict, List, Optional
  from app.config import settings

  class GlueXClient:
      def __init__(self):
          self.yields_api = settings.GLUEX_YIELDS_API
          self.router_api = settings.GLUEX_ROUTER_API
          self.api_key = settings.GLUEX_API_KEY
          self.client = httpx.AsyncClient()

      async def get_current_apys(self) -> Dict[str, float]:
          """Fetch current APY for all HyperEVM protocols"""
          try:
              # Mock data for now - replace with real API call
              return {
                  "protocol_a": 15.5,
                  "protocol_b": 22.3,
                  "protocol_c": 18.7,
                  "protocol_d": 12.1
              }

              # Real implementation:
              # response = await self.client.get(
              #     f"{self.yields_api}/current-apy",
              #     params={"chain": "hyperevm"}
              # )
              # return response.json()
          except Exception as e:
              print(f"Error fetching APYs: {e}")
              return {}

      async def get_historical_apy(
          self,
          protocol_address: str,
          days: int = 7
      ) -> List[Dict]:
          """Fetch historical APY data"""
          try:
              response = await self.client.get(
                  f"{self.yields_api}/historical-apy",
                  params={
                      "lp_token": protocol_address,
                      "chain": "hyperevm",
                      "days": days
                  }
              )
              return response.json()
          except Exception as e:
              print(f"Error fetching historical APY: {e}")
              return []

      async def get_swap_quote(
          self,
          from_token: str,
          to_token: str,
          amount: int,
          user_address: str
      ) -> Optional[Dict]:
          """Get swap quote from GlueX Router"""
          try:
              response = await self.client.post(
                  f"{self.router_api}/quote",
                  headers={"x-api-key": self.api_key},
                  json={
                      "inputToken": from_token,
                      "outputToken": to_token,
                      "inputAmount": str(amount),
                      "userAddress": user_address,
                      "chainID": "hyperevm",
                      "isPermit2": False
                  }
              )
              return response.json()
          except Exception as e:
              print(f"Error getting swap quote: {e}")
              return None

  # Singleton instance
  gluex_client = GlueXClient()
  ```

- [ ] Create `config.py` for settings
  ```python
  from pydantic_settings import BaseSettings

  class Settings(BaseSettings):
      GLUEX_API_KEY: str = ""
      GLUEX_YIELDS_API: str = "https://yield-api.gluex.xyz"
      GLUEX_ROUTER_API: str = "https://router.gluex.xyz/v1"
      HYPEREVM_RPC: str = "https://api.hyperliquid-testnet.xyz/evm"

      class Config:
          env_file = ".env"

  settings = Settings()
  ```

- [ ] Test API calls manually

**Time:** 2 hours | **Dependency:** None

---

#### Task BE2: FastAPI Endpoints (2 hours)
- [ ] Create `api/routes/yields.py`
  ```python
  from fastapi import APIRouter
  from app.services.gluex_client import gluex_client

  router = APIRouter(prefix="/api/v1/yields", tags=["yields"])

  @router.get("/current")
  async def get_current_yields():
      """Get current APYs for all protocols"""
      apys = await gluex_client.get_current_apys()

      # Transform to expected format
      protocols = [
          {
              "name": f"Protocol {key[-1].upper()}",
              "address": f"0x{'0'*39}{key[-1]}",  # Mock address
              "apy": apy,
              "tvl": 1000000,  # Mock TVL
              "allocation": 0  # Will be updated with real data
          }
          for key, apy in apys.items()
      ]

      return {"protocols": protocols}
  ```

- [ ] Create `api/routes/vault.py`
  ```python
  from fastapi import APIRouter
  from app.services.blockchain import get_vault_stats

  router = APIRouter(prefix="/api/v1/vault", tags=["vault"])

  @router.get("/stats")
  async def vault_stats():
      """Get vault statistics"""
      # Mock data for now
      return {
          "tvl": 150000,
          "currentAPY": 18.5,
          "totalUsers": 12,
          "totalYieldGenerated": 2500
      }
  ```

- [ ] Create `api/routes/reallocations.py`
  ```python
  from fastapi import APIRouter

  router = APIRouter(prefix="/api/v1/reallocations", tags=["reallocations"])

  @router.get("/history")
  async def reallocation_history(limit: int = 50):
      """Get reallocation history"""
      # Mock data
      return {
          "reallocations": [
              {
                  "id": "1",
                  "timestamp": 1699876543,
                  "fromProtocol": "Protocol A",
                  "toProtocol": "Protocol B",
                  "amount": "50000",
                  "apyFrom": 15.5,
                  "apyTo": 22.3,
                  "gasCost": "2.5",
                  "txHash": "0xabc123..."
              }
          ]
      }
  ```

- [ ] Register routes in `main.py`
  ```python
  from app.api.routes import yields, vault, reallocations

  app.include_router(yields.router)
  app.include_router(vault.router)
  app.include_router(reallocations.router)
  ```

- [ ] Test all endpoints at `/docs`

**Time:** 2 hours | **Dependency:** BE1

---

#### Task BE3: Yield Optimizer Logic (2 hours)
- [ ] Create `engine/optimizer.py`
  ```python
  from typing import Optional, Dict
  from dataclasses import dataclass

  @dataclass
  class ReallocationPlan:
      from_protocol: str
      to_protocol: str
      amount: int
      apy_delta: float
      expected_yield_gain: float
      estimated_gas_cost: float
      roi: float

  class YieldOptimizer:
      def __init__(
          self,
          min_apy_delta: float = 2.0,  # Minimum 2% APY improvement
          min_roi_days: int = 7         # Must break even in 7 days
      ):
          self.min_apy_delta = min_apy_delta
          self.min_roi_days = min_roi_days

      async def should_reallocate(
          self,
          current_protocol: str,
          current_apy: float,
          alternatives: Dict[str, float],
          tvl: int,
          estimated_gas_cost: float = 5.0  # USD
      ) -> Optional[ReallocationPlan]:
          """
          Determine if reallocation is profitable

          Criteria:
          1. APY delta > min_apy_delta
          2. Gas cost < yield gain over min_roi_days
          3. Target protocol has sufficient liquidity
          """

          # Find best alternative
          best_protocol = None
          best_apy = current_apy

          for protocol, apy in alternatives.items():
              if protocol != current_protocol and apy > best_apy:
                  best_apy = apy
                  best_protocol = protocol

          if not best_protocol:
              return None

          # Calculate APY delta
          apy_delta = best_apy - current_apy

          if apy_delta < self.min_apy_delta:
              return None

          # Calculate expected yield gain
          daily_gain = (tvl * (apy_delta / 100)) / 365
          total_gain = daily_gain * self.min_roi_days

          # Check ROI
          if total_gain < estimated_gas_cost:
              return None

          roi = (total_gain - estimated_gas_cost) / estimated_gas_cost

          return ReallocationPlan(
              from_protocol=current_protocol,
              to_protocol=best_protocol,
              amount=tvl,
              apy_delta=apy_delta,
              expected_yield_gain=total_gain,
              estimated_gas_cost=estimated_gas_cost,
              roi=roi
          )

      async def calculate_roi(
          self,
          apy_delta: float,
          amount: int,
          gas_cost_usd: float,
          time_horizon_days: int = 7
      ) -> float:
          """Calculate ROI of a reallocation"""
          daily_yield_gain = (amount * (apy_delta / 100)) / 365
          total_gain = daily_yield_gain * time_horizon_days

          if gas_cost_usd == 0:
              return float('inf')

          return (total_gain - gas_cost_usd) / gas_cost_usd

  # Singleton
  optimizer = YieldOptimizer()
  ```

- [ ] Add unit tests for optimizer logic
- [ ] Test with mock data

**Time:** 2 hours | **Dependency:** BE1

---

## 🔗 HOUR 8-12: INTEGRATION & FIRST E2E TEST

### INTEGRATION Tasks (All Team)

#### Task INT1: Deploy Smart Contracts to Testnet (1 hour - SC)
- [ ] Create `script/Deploy.s.sol`
  ```solidity
  // SPDX-License-Identifier: MIT
  pragma solidity ^0.8.20;

  import "forge-std/Script.sol";
  import "../src/YieldOptimizationVault.sol";
  import "../src/GlueXAdapter.sol";

  contract DeployScript is Script {
      function run() external {
          uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
          vm.startBroadcast(deployerPrivateKey);

          // Deploy mock USDC (or use existing)
          MockERC20 usdc = new MockERC20();

          // Deploy vault
          YieldOptimizationVault vault = new YieldOptimizationVault(
              IERC20(address(usdc)),
              "GlueX Yield Vault",
              "gyvUSDC"
          );

          // Deploy adapter
          GlueXAdapter adapter = new GlueXAdapter(
              address(vault),
              address(0) // GlueX router address
          );

          vm.stopBroadcast();

          console.log("USDC:", address(usdc));
          console.log("Vault:", address(vault));
          console.log("Adapter:", address(adapter));
      }
  }
  ```

- [ ] Deploy: `forge script script/Deploy.s.sol --rpc-url hyperevm --broadcast --verify`
- [ ] Save contract addresses to `.env` files
- [ ] Verify contracts on explorer

**Time:** 1 hour | **Owner:** Smart Contracts

---

#### Task INT2: Connect Frontend to Contracts (1.5 hours - Frontend)
- [ ] Create `lib/contracts.ts`
  ```typescript
  export const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}`
  export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`

  export const VAULT_ABI = [
    // Add ABI from compiled contract
    "function requestDeposit(uint256 assets, address receiver, address owner) external returns (uint256)",
    "function fulfillDeposit(address user) external",
    "function balanceOf(address account) external view returns (uint256)",
    "function totalAssets() external view returns (uint256)"
  ] as const
  ```

- [ ] Create `hooks/useVault.ts`
  ```typescript
  import { useContractWrite, useWaitForTransaction } from 'wagmi'
  import { VAULT_ADDRESS, VAULT_ABI } from '@/lib/contracts'

  export function useRequestDeposit() {
    const { write, data } = useContractWrite({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'requestDeposit'
    })

    const { isLoading } = useWaitForTransaction({
      hash: data?.hash
    })

    return { requestDeposit: write, isLoading }
  }
  ```

- [ ] Update `DepositCard.tsx` to use real contract calls
- [ ] Test deposit flow on testnet

**Time:** 1.5 hours | **Owner:** Frontend

---

#### Task INT3: Backend Blockchain Integration (1.5 hours - Backend)
- [ ] Create `services/blockchain.py`
  ```python
  from web3 import Web3
  from app.config import settings
  import json

  w3 = Web3(Web3.HTTPProvider(settings.HYPEREVM_RPC))

  # Load contract ABI
  VAULT_ABI = json.loads('''[...]''')  # Copy from Foundry out/

  vault_contract = w3.eth.contract(
      address=settings.VAULT_ADDRESS,
      abi=VAULT_ABI
  )

  async def get_vault_stats():
      """Fetch on-chain vault statistics"""
      total_assets = vault_contract.functions.totalAssets().call()
      total_supply = vault_contract.functions.totalSupply().call()

      return {
          "tvl": total_assets / 10**18,  # Assuming 18 decimals
          "totalShares": total_supply / 10**18
      }

  async def execute_reallocation(plan: ReallocationPlan):
      """Execute reallocation on-chain"""
      account = w3.eth.account.from_key(settings.PRIVATE_KEY)

      # Build transaction
      tx = vault_contract.functions.reallocate(
          plan.from_protocol,
          plan.to_protocol,
          int(plan.amount)
      ).build_transaction({
          'from': account.address,
          'nonce': w3.eth.get_transaction_count(account.address),
          'gas': 500000,
          'gasPrice': w3.eth.gas_price
      })

      # Sign and send
      signed_tx = w3.eth.account.sign_transaction(tx, settings.PRIVATE_KEY)
      tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)

      return tx_hash.hex()
  ```

- [ ] Test reading from deployed vault
- [ ] Verify data matches frontend

**Time:** 1.5 hours | **Owner:** Backend

---

#### Task INT4: First E2E Test (1 hour - All)
**Goal:** Complete one full deposit flow from frontend → contracts → backend

- [ ] **Frontend:** User connects wallet
- [ ] **Frontend:** User deposits 100 USDC
- [ ] **Contracts:** requestDeposit event emitted
- [ ] **Backend:** Detect deposit event (manually for now)
- [ ] **Contracts:** Owner fulfills deposit
- [ ] **Frontend:** User sees shares in wallet
- [ ] **Backend:** API returns correct vault stats

**Checkpoint:** Take screenshot of successful deposit!

**Time:** 1 hour | **Owner:** All

---

## 🎨 HOUR 12-16: ADVANCED FEATURES & POLISH

### FRONTEND Tasks

#### Task F5: Reallocation Activity Feed (1 hour)
- [ ] Create `components/ReallocationFeed.tsx`
  ```typescript
  export function ReallocationFeed() {
    const { data } = useSWR('/api/v1/reallocations/history', fetcher)

    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
        {data?.reallocations.map(r => (
          <div key={r.id} className="border p-3 rounded">
            <div className="flex justify-between">
              <span>
                {r.fromProtocol} → {r.toProtocol}
              </span>
              <span className="text-green-500">
                +{(r.apyTo - r.apyFrom).toFixed(2)}% APY
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Amount: ${parseInt(r.amount).toLocaleString()} |
              Gas: ${r.gasCost}
            </div>
            <a
              href={`https://explorer.hyperliquid.com/tx/${r.txHash}`}
              target="_blank"
              className="text-blue-500 text-xs"
            >
              View TX
            </a>
          </div>
        ))}
      </div>
    )
  }
  ```

**Time:** 1 hour | **Dependency:** Backend API

---

#### Task F6: User Position Display (1 hour)
- [ ] Create `components/UserPosition.tsx`
  ```typescript
  export function UserPosition() {
    const { address } = useAccount()
    const { data: position } = useSWR(
      address ? `/api/v1/user/${address}/position` : null,
      fetcher
    )

    if (!address) return <div>Connect wallet to see your position</div>

    return (
      <div className="card">
        <h3>Your Position</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>Deposited</label>
            <p>${position?.deposited}</p>
          </div>
          <div>
            <label>Current Value</label>
            <p className="text-green-500">${position?.currentValue}</p>
          </div>
          <div>
            <label>Yield Earned</label>
            <p className="text-green-500">+${position?.yieldEarned}</p>
          </div>
          <div>
            <label>Shares</label>
            <p>{position?.shares}</p>
          </div>
        </div>
      </div>
    )
  }
  ```

**Time:** 1 hour | **Dependency:** Backend API

---

#### Task F7: Basic Charts (1.5 hours)
- [ ] Install recharts: `npm install recharts`
- [ ] Create `components/APYChart.tsx`
  ```typescript
  import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'

  export function APYChart({ data }) {
    return (
      <LineChart width={600} height={300} data={data}>
        <XAxis dataKey="timestamp" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="apy" stroke="#8884d8" />
      </LineChart>
    )
  }
  ```

- [ ] Fetch historical APY data
- [ ] Display 7-day APY trend

**Time:** 1.5 hours | **Dependency:** Backend historical data

---

#### Task F8: UI Polish & Responsiveness (1.5 hours)
- [ ] Add loading skeletons for all components
- [ ] Add error boundaries
- [ ] Mobile responsive check (test on phone)
- [ ] Add toast notifications for all transactions
- [ ] Improve color scheme and spacing
- [ ] Add favicon and meta tags

**Time:** 1.5 hours | **Dependency:** None

---

### SMART CONTRACTS Tasks

#### Task SC4: Reallocation Function (2 hours)
- [ ] Add to `YieldOptimizationVault.sol`
  ```solidity
  address public currentProtocol;
  GlueXAdapter public adapter;

  function setAdapter(address _adapter) external onlyOwner {
      adapter = GlueXAdapter(_adapter);
  }

  function reallocate(
      address newProtocol,
      uint256 amount
  ) external onlyOwner {
      require(amount <= totalAssets(), "Insufficient assets");

      // Withdraw from current protocol
      if (currentProtocol != address(0)) {
          adapter.withdrawFromProtocol(
              currentProtocol,
              asset(),
              amount
          );
      }

      // Deposit to new protocol
      IERC20(asset()).approve(address(adapter), amount);
      adapter.depositToProtocol(newProtocol, asset(), amount);

      emit Reallocated(currentProtocol, newProtocol, amount);
      currentProtocol = newProtocol;
  }

  event Reallocated(
      address indexed fromProtocol,
      address indexed toProtocol,
      uint256 amount
  );
  ```

- [ ] Test reallocation flow
- [ ] Update tests

**Time:** 2 hours | **Dependency:** SC3

---

#### Task SC5: Security & Gas Optimization (1 hour)
- [ ] Add reentrancy guards
- [ ] Check for integer overflow/underflow
- [ ] Verify all external calls
- [ ] Run gas report: `forge test --gas-report`
- [ ] Optimize expensive operations

**Time:** 1 hour | **Dependency:** All SC tasks

---

#### Task SC6: Events & Logging (1 hour)
- [ ] Add comprehensive events
- [ ] Add indexed parameters
- [ ] Test event emission in tests
- [ ] Document all events

**Time:** 1 hour | **Dependency:** All SC tasks

---

### BACKEND Tasks

#### Task BE4: Auto-Reallocation Job (2 hours)
- [ ] Create `jobs/reallocator.py`
  ```python
  import asyncio
  from app.services.gluex_client import gluex_client
  from app.services.blockchain import execute_reallocation
  from app.engine.optimizer import optimizer

  async def reallocation_job():
      """Background job to monitor and execute reallocations"""
      while True:
          try:
              print("Checking for reallocation opportunities...")

              # 1. Fetch current APYs
              apys = await gluex_client.get_current_apys()

              # 2. Get current vault state
              # (Simplified: assume we're in protocol_a)
              current_protocol = "protocol_a"
              current_apy = apys.get(current_protocol, 0)
              tvl = 150000  # Get from contract

              # 3. Check if reallocation is profitable
              plan = await optimizer.should_reallocate(
                  current_protocol=current_protocol,
                  current_apy=current_apy,
                  alternatives=apys,
                  tvl=tvl
              )

              if plan:
                  print(f"Executing reallocation: {plan}")
                  # Execute on-chain
                  tx_hash = await execute_reallocation(plan)
                  print(f"Reallocation executed: {tx_hash}")

                  # Store in database
                  # await save_reallocation(plan, tx_hash)
              else:
                  print("No profitable reallocation found")

          except Exception as e:
              print(f"Error in reallocation job: {e}")

          # Check every 5 minutes
          await asyncio.sleep(300)

  # Start job
  if __name__ == "__main__":
      asyncio.run(reallocation_job())
  ```

- [ ] Test job manually
- [ ] Run for 30 minutes to verify stability

**Time:** 2 hours | **Dependency:** BE3, blockchain integration

---

#### Task BE5: Database Setup (Optional - 1 hour)
- [ ] Create SQLite database
  ```python
  # models/database.py
  from sqlalchemy import create_engine, Column, Integer, String, Float
  from sqlalchemy.ext.declarative import declarative_base
  from sqlalchemy.orm import sessionmaker

  Base = declarative_base()

  class Reallocation(Base):
      __tablename__ = "reallocations"

      id = Column(Integer, primary_key=True)
      from_protocol = Column(String)
      to_protocol = Column(String)
      amount = Column(String)
      apy_from = Column(Float)
      apy_to = Column(Float)
      gas_cost = Column(Float)
      tx_hash = Column(String)
      timestamp = Column(Integer)

  engine = create_engine('sqlite:///./vault.db')
  Base.metadata.create_all(engine)
  SessionLocal = sessionmaker(bind=engine)
  ```

- [ ] Store reallocations in DB
- [ ] Query from DB in API endpoints

**Time:** 1 hour | **Dependency:** BE4 (Optional)

---

#### Task BE6: API Polish (1 hour)
- [ ] Add request validation with Pydantic
- [ ] Add rate limiting
- [ ] Add API documentation in /docs
- [ ] Error handling and logging
- [ ] Add health check endpoints

**Time:** 1 hour | **Dependency:** All BE tasks

---

## **END OF DAY 1 MILESTONE CHECK** ✅

- [ ] Users can deposit USDC into vault ✓
- [ ] Frontend shows real APY data from GlueX ✓
- [ ] Smart contracts deployed and verified on HyperEVM ✓
- [ ] Backend has reallocation logic working ✓
- [ ] At least 1 manual or automated reallocation demonstrated ✓

---

# DAY 2: POLISH, TESTING & DEMO (16 hours)

## 🐛 HOUR 0-4: BUG FIXES & TESTING

### All Team: Bug Bash
- [ ] **Test all user flows** (1 hour)
  - Connect wallet
  - Deposit (small amount)
  - Request withdrawal
  - View stats
  - View APY comparison

- [ ] **Fix Critical Bugs** (2 hours)
  - Transaction failures
  - API errors
  - UI breaking issues
  - Contract security issues

- [ ] **Edge Case Testing** (1 hour)
  - Zero amounts
  - Insufficient balance
  - Network disconnection
  - API rate limits
  - Large numbers

---

### FRONTEND Bug Fixes
- [ ] Handle wallet disconnection
- [ ] Add network mismatch warning
- [ ] Fix mobile layout issues
- [ ] Improve error messages
- [ ] Add loading states for all async operations
- [ ] Test with different wallets (MetaMask, WalletConnect)

---

### SMART CONTRACTS Testing
- [ ] Run full test suite: `forge test -vvv`
- [ ] Check test coverage: `forge coverage`
- [ ] Security checklist:
  - [ ] Reentrancy protection
  - [ ] Access control on all admin functions
  - [ ] Integer overflow checks
  - [ ] Proper use of `transfer` vs `transferFrom`
  - [ ] Event emission for all state changes
- [ ] Test with extreme values
- [ ] Gas optimization review

---

### BACKEND Bug Fixes
- [ ] Handle GlueX API failures gracefully
- [ ] Add retry logic for failed requests
- [ ] Improve error logging
- [ ] Test with mock API responses
- [ ] Verify all endpoints work

---

## 🚀 HOUR 4-8: ADVANCED FEATURES & DIFFERENTIATION

### FRONTEND Advanced Features

#### Task F9: Withdraw Interface (1 hour)
- [ ] Create `components/WithdrawCard.tsx`
  ```typescript
  export function WithdrawCard() {
    const [shares, setShares] = useState('')
    const { data: userShares } = useContractRead({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'balanceOf',
      args: [address]
    })

    const handleWithdraw = async () => {
      // 1. Request redeem
      // 2. Wait for cooldown (if any)
      // 3. Claim tokens
    }

    return (
      <div className="card">
        <h3>Withdraw</h3>
        <p>Your shares: {userShares?.toString()}</p>
        <input
          type="number"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          placeholder="Shares to redeem"
        />
        <button onClick={handleWithdraw}>Withdraw</button>
      </div>
    )
  }
  ```

**Time:** 1 hour

---

#### Task F10: Performance Dashboard (1.5 hours)
- [ ] Create `components/PerformanceDashboard.tsx`
  ```typescript
  export function PerformanceDashboard() {
    const { data: performance } = useSWR('/api/v1/analytics/performance')

    return (
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Total Yield"
          value={`$${performance?.totalYield}`}
          change="+12.5%"
        />
        <MetricCard
          label="vs Hold Strategy"
          value={`+${performance?.outperformance}%`}
          change="Better"
        />
        <MetricCard
          label="Reallocations"
          value={performance?.reallocationCount}
        />
      </div>
    )
  }
  ```

**Time:** 1.5 hours

---

#### Task F11: Strategy Selector (Optional - 1 hour)
- [ ] Add user preference for conservative/aggressive
- [ ] Display different thresholds
- [ ] Store preference in localStorage or on-chain

**Time:** 1 hour (Optional)

---

### SMART CONTRACTS Advanced Features

#### Task SC7: Emergency Functions (1 hour)
- [ ] Add pause mechanism
  ```solidity
  import "@openzeppelin/contracts/utils/Pausable.sol";

  contract YieldOptimizationVault is ERC4626, Pausable {
      function pause() external onlyOwner {
          _pause();
      }

      function unpause() external onlyOwner {
          _unpause();
      }

      function emergencyWithdraw() external onlyOwner whenPaused {
          // Withdraw all assets from protocols
          // Allow users to claim proportional shares
      }
  }
  ```

**Time:** 1 hour

---

#### Task SC8: Fee Mechanism (1.5 hours)
- [ ] Add performance fee
  ```solidity
  uint256 public performanceFee = 200; // 2% (basis points)
  address public treasury;

  function collectPerformanceFee() internal {
      uint256 currentValue = totalAssets();
      uint256 profit = currentValue > lastRecordedValue
          ? currentValue - lastRecordedValue
          : 0;

      uint256 fee = (profit * performanceFee) / 10000;

      if (fee > 0) {
          IERC20(asset()).transfer(treasury, fee);
          emit PerformanceFeeCollected(fee);
      }

      lastRecordedValue = currentValue;
  }
  ```

- [ ] Test fee calculation
- [ ] Add fee collection to reallocation flow

**Time:** 1.5 hours

---

### BACKEND Advanced Features

#### Task BE7: Advanced Optimization (1.5 hours)
- [ ] Multi-factor scoring system
  ```python
  class AdvancedOptimizer(YieldOptimizer):
      async def calculate_protocol_score(
          self,
          protocol: str,
          apy: float,
          historical_data: List[Dict]
      ) -> float:
          """
          Score = (APY * 0.4) + (Stability * 0.3) + (Liquidity * 0.2) + (History * 0.1)
          """
          # APY score
          apy_score = apy / 100

          # Stability score (lower volatility = higher score)
          volatility = self._calculate_volatility(historical_data)
          stability_score = 1 / (1 + volatility)

          # Liquidity score (mock for now)
          liquidity_score = 0.8

          # Historical performance score
          history_score = 0.7

          total_score = (
              apy_score * 0.4 +
              stability_score * 0.3 +
              liquidity_score * 0.2 +
              history_score * 0.1
          )

          return total_score

      def _calculate_volatility(self, data: List[Dict]) -> float:
          """Calculate APY volatility"""
          if len(data) < 2:
              return 0

          apys = [d['apy'] for d in data]
          mean = sum(apys) / len(apys)
          variance = sum((x - mean) ** 2 for x in apys) / len(apys)
          return variance ** 0.5
  ```

**Time:** 1.5 hours

---

#### Task BE8: Performance Analytics API (1 hour)
- [ ] Create endpoint for performance metrics
  ```python
  @router.get("/api/v1/analytics/performance")
  async def get_performance_analytics():
      """Calculate vault performance vs hold strategy"""

      # Get historical data
      initial_value = 100000
      current_value = 112500

      # Calculate hold strategy
      avg_market_apy = 15.0
      days_active = 30
      hold_value = initial_value * (1 + (avg_market_apy / 100) * (days_active / 365))

      # Calculate outperformance
      vault_return = ((current_value - initial_value) / initial_value) * 100
      hold_return = ((hold_value - initial_value) / initial_value) * 100
      outperformance = vault_return - hold_return

      return {
          "totalYield": current_value - initial_value,
          "vaultReturn": vault_return,
          "holdReturn": hold_return,
          "outperformance": outperformance,
          "reallocationCount": 5,  # From database
          "avgAPY": 18.5
      }
  ```

**Time:** 1 hour

---

## 🧪 HOUR 8-12: INTEGRATION TESTING & OPTIMIZATION

### E2E Test Suite (All Team - 2 hours)

#### Test Flow 1: Complete User Journey
- [ ] **Step 1:** New user connects wallet
- [ ] **Step 2:** User deposits 100 USDC
- [ ] **Step 3:** Transaction confirmed
- [ ] **Step 4:** Shares appear in wallet
- [ ] **Step 5:** Dashboard shows user position
- [ ] **Step 6:** Backend detects better APY
- [ ] **Step 7:** Reallocation executes
- [ ] **Step 8:** Activity feed updates
- [ ] **Step 9:** User's value increases
- [ ] **Step 10:** User requests withdrawal
- [ ] **Step 11:** Withdrawal fulfilled
- [ ] **Step 12:** USDC returned to wallet

**Record this flow for demo video!**

---

#### Test Flow 2: Multi-User Scenario
- [ ] User A deposits 1000 USDC
- [ ] User B deposits 500 USDC
- [ ] Reallocation happens
- [ ] Both users see proportional gains
- [ ] User A withdraws 50%
- [ ] User B's position unaffected

---

#### Test Flow 3: Error Handling
- [ ] Attempt deposit with insufficient balance → Error shown
- [ ] Disconnect wallet mid-transaction → Graceful handling
- [ ] Backend API down → Frontend shows fallback
- [ ] Invalid amounts → Validation messages

---

### Performance Optimization (2 hours)

#### Frontend Optimization
- [ ] Run Lighthouse audit
- [ ] Optimize bundle size
- [ ] Add loading skeletons
- [ ] Implement code splitting
- [ ] Optimize images (if any)

---

#### Backend Optimization
- [ ] Add caching for frequently accessed data
  ```python
  from functools import lru_cache
  from datetime import datetime, timedelta

  # Simple in-memory cache
  cache = {}

  async def get_cached_apys():
      cache_key = "current_apys"

      if cache_key in cache:
          cached_data, timestamp = cache[cache_key]
          if datetime.now() - timestamp < timedelta(minutes=5):
              return cached_data

      # Fetch fresh data
      apys = await gluex_client.get_current_apys()
      cache[cache_key] = (apys, datetime.now())

      return apys
  ```

- [ ] Optimize database queries
- [ ] Add connection pooling
- [ ] Test API response times (aim for <200ms)

---

#### Smart Contract Gas Optimization
- [ ] Review gas report
- [ ] Optimize storage usage
- [ ] Batch operations where possible
- [ ] Use `calldata` instead of `memory` for external functions

---

## 📝 HOUR 12-14: DOCUMENTATION

### Task DOC1: README.md (45 min - All)
```markdown
# GlueX Yield Optimization Vault

> Automated yield optimization protocol for HyperEVM markets

## 🎯 Overview

Our vault automatically monitors APYs across HyperEVM lending markets using GlueX APIs and reallocates user deposits to maximize returns. Built with ERC-7540 async vault standard for optimal user experience.

## 🏗️ Architecture

```
User → Frontend (Next.js) → Backend (FastAPI) → Smart Contracts (Solidity)
                              ↓
                      GlueX Yields API
                      GlueX Router API
```

## ✨ Features

- **Automated Reallocation**: Smart algorithm moves funds only when profitable
- **Transparent**: See exactly why each reallocation happens
- **Gas Optimized**: Considers gas costs vs yield gains
- **ERC-7540 Compliant**: Async deposits/withdrawals for better UX
- **Multi-Protocol**: Supports all major HyperEVM lending markets

## 🚀 Quick Start

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with contract addresses
npm run dev
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with API keys and contract addresses
uvicorn app.main:app --reload
```

### Smart Contracts
```bash
cd contracts
forge install
cp .env.example .env
# Edit .env with RPC URL and private key
forge build
forge test
```

## 📋 Smart Contract Addresses (HyperEVM Testnet)

- **Vault**: `0x...`
- **GlueX Adapter**: `0x...`
- **USDC**: `0x...`

## 🧪 Testing

### Run All Tests
```bash
# Smart Contracts
forge test -vvv

# Backend (if implemented)
pytest

# Frontend (if implemented)
npm test
```

## 🎥 Demo

Watch our 3-minute demo: [YouTube Link]

## 📊 How It Works

1. **Monitor**: Backend fetches APYs from GlueX every 5 minutes
2. **Analyze**: Optimization engine calculates if reallocation is profitable
3. **Execute**: If ROI > threshold, execute reallocation on-chain
4. **Notify**: Frontend updates in real-time

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind, ethers.js
- **Smart Contracts**: Solidity 0.8.20, Foundry, OpenZeppelin
- **Backend**: Python 3.11, FastAPI, web3.py
- **APIs**: GlueX Yields API, GlueX Router API

## 🏆 Built For

Hyperliquid Hackathon - GlueX Challenge
Built in 48 hours by [Team Name]

## 📄 License

MIT
```

**Time:** 45 min

---

### Task DOC2: Code Documentation (45 min - All)
- [ ] Add NatSpec to all smart contract functions
- [ ] Add docstrings to Python functions
- [ ] Add JSDoc to TypeScript functions
- [ ] Comment complex logic

---

### Task DOC3: Architecture Diagram (30 min - Any)
- [ ] Create diagram using Excalidraw or draw.io
- [ ] Show data flow
- [ ] Include all components
- [ ] Add to README

---

## 🎬 HOUR 14-16: DEMO VIDEO & SUBMISSION

### Task DEMO1: Record Demo Video (2 hours - All)

**Script (3 minutes):**

**[0:00-0:30] Problem Statement**
- Open with: "DeFi yields are volatile"
- Show GlueX Yields API with fluctuating APYs
- Explain: "Manual reallocation is expensive and time-consuming"

**[0:30-1:00] Solution Introduction**
- Show landing page
- Explain: "Our vault automates yield optimization"
- Show architecture diagram briefly

**[1:00-2:00] Live Demo**
1. Connect wallet [10 sec]
2. Show dashboard with APYs [15 sec]
3. Deposit USDC [20 sec]
4. Show reallocation logic (backend logs or frontend) [20 sec]
5. Watch reallocation execute [15 sec]
6. Show updated earnings [10 sec]

**[2:00-2:40] Technical Highlights**
- "Built on ERC-7540 for async operations"
- "Integrated with GlueX Yields and Router APIs"
- "Smart reallocation considers gas costs and APY stability"
- Quick code snippets (optimization logic, contract)

**[2:40-3:00] Impact & Conclusion**
- "Unlocks automated yield optimization for all HyperEVM users"
- Show stats (TVL, users, yield generated)
- "Built in 48 hours for Hyperliquid Hackathon"
- Team credits

---

**Recording Checklist:**
- [ ] Use OBS or Loom
- [ ] 1080p resolution minimum
- [ ] Clear audio (use good microphone)
- [ ] Rehearse script 2-3 times
- [ ] Add background music (low volume)
- [ ] Smooth transitions
- [ ] No dead air or long pauses
- [ ] Show real functionality (not mocks)

---

**Editing Checklist:**
- [ ] Trim any mistakes
- [ ] Add text overlays for key points
- [ ] Add team member names/roles
- [ ] Add GitHub link at end
- [ ] Export in high quality
- [ ] Upload to YouTube (unlisted)

---

### Task DEMO2: Final Submission (30 min)

**Submission Checklist:**
- [ ] GitHub repo is public
- [ ] README is complete with setup instructions
- [ ] All code is committed and pushed
- [ ] .env.example files included
- [ ] Demo video uploaded and linked in README
- [ ] Contract addresses documented
- [ ] Screenshots added to README (optional but good)
- [ ] Remove any TODOs or console.logs
- [ ] Test that fresh clone works:
  ```bash
  git clone [your-repo]
  cd [your-repo]
  # Follow README instructions
  # Should work!
  ```

**Submit to Hackathon:**
- [ ] Fill out submission form
- [ ] Include GitHub URL
- [ ] Include demo video URL
- [ ] Include deployed contract addresses
- [ ] Include live demo URL (if frontend is deployed)
- [ ] Submit before deadline!

---

### Task DEMO3: Deploy (Optional - 30 min)

If time permits, deploy frontend:
- [ ] Deploy to Vercel (easiest for Next.js)
  ```bash
  vercel --prod
  ```
- [ ] Add live demo URL to README
- [ ] Test deployed version works

---

## 🎯 WINNING DIFFERENTIATION CHECKLIST

Make sure you have:

### Technical Excellence
- [ ] **ERC-7540 properly implemented** (not just ERC-4626)
- [ ] **Real GlueX API integration** (not just mocked)
- [ ] **Smart reallocation logic** (not just APY chasing)
- [ ] **Gas optimization** (consider costs in decisions)
- [ ] **Good test coverage** (80%+)

### User Experience
- [ ] **Clean UI** (professional, not buggy)
- [ ] **Clear explanations** (users understand what's happening)
- [ ] **Real-time updates** (WebSocket or polling)
- [ ] **Transparent operations** (show why reallocations happen)

### Demo Quality
- [ ] **Working prototype** (not just mockups)
- [ ] **Clear narration** (easy to understand)
- [ ] **Live functionality** (actually execute transactions)
- [ ] **Professional presentation** (polished video)

### Documentation
- [ ] **Easy to run** (setup instructions work)
- [ ] **Well commented** (code is readable)
- [ ] **Architecture clear** (diagram helps)

---

## 🚨 EMERGENCY FALLBACKS

### If GlueX APIs Don't Work
- [ ] Use mock data with realistic values
- [ ] Document in README that real integration is ready
- [ ] Show the integration code anyway
- [ ] Explain in demo video

### If HyperEVM RPC Issues
- [ ] Test on local fork
- [ ] Use backup RPC endpoint
- [ ] Deploy to different testnet if needed

### If Team Member Blocked
- [ ] Pair program for 30 min
- [ ] Simplify the feature
- [ ] Move to next priority
- [ ] Don't waste >1 hour debugging alone

---

## 💡 PRO TIPS

### Time Management
- **Set alarms** for each 4-hour block
- **Quick standups** every 4 hours (5 min max)
- **No perfectionism** - ship working > perfect
- **Cut scope** if behind - focus on core features

### Communication
- **Share progress** in group chat frequently
- **Ask for help** when stuck (don't waste 2 hours alone)
- **Celebrate wins** - motivates the team!
- **Stay positive** - it's a marathon!

### Common Pitfalls to Avoid
- ❌ Spending 4 hours on animations (focus on function!)
- ❌ Perfect database design (SQLite or in-memory is fine)
- ❌ 100% test coverage (80% is great, beyond wastes time)
- ❌ Too many features poorly (better: 5 features well done)

### What Judges Love
- ✅ **It actually works** (live demo beats everything)
- ✅ **Solves the problem** (yield optimization)
- ✅ **Clean architecture** (easy to understand)
- ✅ **Good code quality** (readable, maintainable)
- ✅ **Attention to detail** (polish matters)

---

## 📞 QUICK REFERENCE

### API Endpoints
```
Backend (http://localhost:8000):
GET  /api/v1/vault/stats
GET  /api/v1/yields/current
GET  /api/v1/reallocations/history
GET  /api/v1/user/{address}/position
GET  /api/v1/analytics/performance
```

### Contract Functions
```solidity
// User functions
requestDeposit(uint256 assets, address receiver, address owner)
requestRedeem(uint256 shares, address receiver, address owner)

// Owner functions
fulfillDeposit(address user)
fulfillRedeem(address user)
reallocate(address newProtocol, uint256 amount)
```

### GlueX APIs
```
Yields: https://yield-api.gluex.xyz/
  - /historical-apy
  - /diluted-apy

Router: https://router.gluex.xyz/v1/quote
  - POST with x-api-key header
```

---

## 🏁 FINAL CHECKLIST

Before submission:

### Functionality
- [ ] Deposit works
- [ ] Withdrawal works
- [ ] APY data displays
- [ ] At least 1 reallocation executed
- [ ] Dashboard shows stats
- [ ] No critical bugs

### Code Quality
- [ ] No console.logs in production
- [ ] No TODOs remaining
- [ ] Code is formatted
- [ ] Comments added
- [ ] Tests pass

### Documentation
- [ ] README complete
- [ ] Setup instructions work
- [ ] Contract addresses documented
- [ ] Architecture diagram included

### Demo
- [ ] Video under 3 minutes
- [ ] Shows real functionality
- [ ] Professional quality
- [ ] Uploaded and linked

### Submission
- [ ] GitHub repo public
- [ ] Form filled out
- [ ] Submitted before deadline

---

## 🎉 YOU'VE GOT THIS!

Remember:
- **Focus on core functionality first**
- **Ship working code, iterate later**
- **Help each other when stuck**
- **Have fun building!**

**Good luck team! Let's win this $3,000! 🏆**

---

*Last updated: Pre-Hackathon*
*Estimated total time: 32 hours (16 hours/day × 2 days)*
*Recommended: Work 16 hours Day 1, 14 hours Day 2, leave 2 hours buffer*
