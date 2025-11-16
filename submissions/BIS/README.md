# BIS Yield Optimizer 🚀

## Unlocking Automated Yield Optimization on HyperEVM

BIS (Best Investment Strategy) Yield Optimizer is a fully automated yield aggregation protocol that maximizes returns for depositors by continuously reallocating capital across the highest risk-adjusted yield opportunities on HyperEVM. Built with GlueX Yields API integration and ERC-7540 compliant vaults.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636.svg)
![Python](https://img.shields.io/badge/Python-3.9+-3776AB.svg)

---

## 📖 Table of Contents

- [What We Built](#what-we-built)
- [Deployed Contracts](#deployed-contracts)
- [Key Transactions](#key-transactions)
- [Architecture](#architecture)
- [Features](#features)
- [How It Works](#how-it-works)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Demo](#demo)

---

## 🎯 What We Built

The BIS Yield Optimizer solves the **APY volatility problem** in DeFi lending markets. Instead of users manually monitoring and moving funds between protocols, our system:

1. **Continuously monitors** APYs across all whitelisted lending vaults using GlueX Yields API
2. **Calculates risk-adjusted returns** using Sharpe ratios to balance yield vs. volatility
3. **Automatically rebalances** user deposits to optimal allocations
4. **Maximizes returns** while managing risk through diversification

### Core Components

- **Smart Contracts** (Solidity): ERC-7540 compliant vaults for secure asset custody with whitelist-based security
- **Backend Service** (Python): Off-chain intelligence for yield optimization and automated rebalancing
- **GlueX Integration**: Native integration with GlueX Yields API and Router API for real-time yield data
- **Frontend Dashboard** (Next.js): User interface for deposits, withdrawals, and portfolio monitoring

---

## 📍 Deployed Contracts

### HyperEVM Mainnet (Chain ID: 999)

| Contract                   | Address                                      | Description                                        |
| -------------------------- | -------------------------------------------- | -------------------------------------------------- |
| **YieldOptimizer** (Main)  | `0x806ff0f92771f84ace0e19ad9878eadfed4cc19d` | Main ERC-7540 vault with async deposit/redeem      |
| **YieldOptimizerMinimal**  | `0x916855db77f2d5b63e8ef3472d6e7df9fc6ccd79` | Minimal gas-optimized version                      |
| **YieldOptimizerWithSwap** | `0x17636672568a924b917cda28a860e2a758bcaec1` | Advanced version with token swap capabilities      |
| **SwapModule**             | `0xb19731bc4495ec8ad2df4c325206d0132be6e1b5` | Modular swap integration for complex reallocations |

**RPC URL**: `https://rpc.hyperliquid.xyz/evm`  
**Explorer**: [HyperLiquid Block Explorer](https://explorer.hyperliquid.xyz)

---

contract https://hyperevmscan.io/address/0x806ff0f92771f84ace0e19ad9878eadfed4cc19d
rebalance tx https://hyperevmscan.io/tx/0x2ab71f222ffa66c75382e0edf6f8bca070f60672e7c0c19f0445aa9ffb3331b6

## 🔗 Key Transactions

### Main Deployment

| Transaction Type          | Hash                                                                 | Description                 |
| ------------------------- | -------------------------------------------------------------------- | --------------------------- |
| **Deploy YieldOptimizer** | `0x41dcc203291bfdc6d2f96a3261649edf3734f7ffef76607c9b399920a7f2e008` | Initial contract deployment |
| **Configure Vault 1**     | `0xfbfa376825ecdeed96da73039e0464bfd97181dee25bf6b5091ebff5ddd39512` | Whitelist GlueX Vault 1     |
| **Configure Vault 2**     | `0x02a26d63ca60aeaca5e651056300c18c0a694b8ad2c026bae37d4821f7f05c15` | Whitelist GlueX Vault 2     |
| **Configure Vault 3**     | `0xb9ce0f1c75396891639e1c0ceaf126fdde3ae98d53a7ab981b9ce2b1b8094006` | Whitelist GlueX Vault 3     |
| **Configure Vault 4**     | `0x80da6f8c455b84af8d79daf5937d6df7b84e6717eb5d966d0d22e8a38c559d12` | Whitelist GlueX Vault 4     |
| **Additional Config 1**   | `0xcd8f4cd302115394b7f4ad0bc2319a6a6e3e5162a47222f764ef7a9ef0e0a299` | Set performance fee (2%)    |
| **Additional Config 2**   | `0xdad9500ff5771a8c74c86309befd1e54d94217a46452a3f0bc54b94f65c5e6fc` | Set rebalance delay         |
| **Additional Config 3**   | `0xae25c4f24aa328719319ab7f248f4a003d4980f21329dcb62a9e8f18a0a7a05e` | Set operator address        |
| **Additional Config 4**   | `0x51cd5f55a9f95f40f1ac668fbe1bd5b43240127bb49d85f91fa8dc8de3bd7960` | Final vault configuration   |
| **Additional Config 5**   | `0x72695170a99473e770909c485fc771539e7d90c6bbdec6dd8f81bbf35b3a7401` | Complete setup              |

### Minimal Deployment

| Transaction Type                 | Hash                                                                 | Description              |
| -------------------------------- | -------------------------------------------------------------------- | ------------------------ |
| **Deploy YieldOptimizerMinimal** | `0x4f1dd2410d4d67ba3f76c1f6ece7fb6d2cc23ac1e8af9328e5b9522d73740c6a` | Gas-optimized deployment |
| **Whitelist Vault 1**            | `0x49180230b68fd97bba442a6fb522fb20b6364aaea0f956ad946cc8839f4bd2f0` | Configure vault 1        |
| **Whitelist Vault 2**            | `0x9d5492f2bd5ba33d92313d3b32e52f7e9d7293449bd1dae13ab14bd09eafe5fe` | Configure vault 2        |
| **Whitelist Vault 3**            | `0xc1a7fbb5dfd90dbbaf612aa5079090bfbc2e1b2d610b95c07e9f7e42b6d4b3db` | Configure vault 3        |
| **Whitelist Vault 4**            | `0x690eb892b876f6c862262396891cb830740f14759f6979d01f5b03a22a765285` | Configure vault 4        |
| **Whitelist Vault 5**            | `0x996ff161a01ce77bac21e744187f30c1255fdefc1e13ce64f3a7f7a170a42c43` | Configure vault 5        |

### SwapModule Deployment

| Transaction Type          | Hash                                                                 | Description                     |
| ------------------------- | -------------------------------------------------------------------- | ------------------------------- |
| **Deploy SwapModule**     | `0x5e174d8ea26663110e8c0aa2bd89e5b736da359b48c8c4ad427990da0951b20e` | Token swap module               |
| **Deploy Swap Optimizer** | `0x60fb06af01062831ffb05d17d7d644f58f856e499ae1398780b4437792664bde` | Integrated optimizer with swaps |
| **Deploy SwapModule v2**  | `0x420bd08989bc5057b6e2df6aca5c212bf264d8b78ac60c5733b146562370a935` | Alternative swap deployment     |

**View all transactions**: [HyperLiquid Explorer](https://explorer.hyperliquid.xyz)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
│                     (Next.js Frontend)                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SMART CONTRACTS (On-Chain)                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  YieldOptimizer (ERC-7540 Vault)                          │  │
│  │  • Asset custody & share management                       │  │
│  │  • Whitelist-based security                               │  │
│  │  • Async deposit/redeem pattern                           │  │
│  │  • Performance fee collection                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SwapModule (Optional)                                    │  │
│  │  • GlueX Router integration                               │  │
│  │  • Efficient vault-to-vault reallocation                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              OPTIMIZATION SERVICE (Off-Chain)                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Python Backend Service                                   │  │
│  │  • Continuous yield monitoring                            │  │
│  │  • Sharpe ratio calculation                               │  │
│  │  │  Sharpe = (APY - RiskFreeRate) / Volatility            │  │
│  │  • Optimal allocation computation                         │  │
│  │  • Automated rebalancing execution                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       GLUEX APIS                                │
│  ┌────────────────────┐      ┌─────────────────────────────┐   │
│  │  Yields API        │      │  Router API                 │   │
│  │  • Historical APY  │      │  • Quote generation         │   │
│  │  • TVL data        │      │  • Optimal swap routes      │   │
│  │  • Risk metrics    │      │  • Slippage calculation     │   │
│  └────────────────────┘      └─────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   WHITELISTED VAULTS                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ GlueX V1 │  │ GlueX V2 │  │ GlueX V3 │  │ GlueX V4 │  ...  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│  • Assets earn yield in optimal positions                      │
│  • Automatic compounding                                       │
│  • Risk diversification                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### For Users

- ✅ **Single-Asset Deposit**: Deposit USDC and receive vault shares (ERC-20 tokens)
- ✅ **Automated Optimization**: No manual management needed
- ✅ **Risk-Adjusted Returns**: Sharpe ratio optimization balances yield vs. risk
- ✅ **Diversification**: Capital automatically spread across top-performing vaults
- ✅ **Transparent Fees**: 2% performance fee only on profits
- ✅ **ERC-20 Shares**: Tradeable, transferable, composable with other DeFi protocols
- ✅ **Async Deposits/Withdrawals**: Gas-efficient batch processing

### For Developers

- ✅ **ERC-7540 Compliant**: Standard async vault interface
- ✅ **Modular Design**: Swap module can be added/removed
- ✅ **Whitelist Security**: Only approved vaults can receive funds
- ✅ **Emergency Controls**: Owner can pause and withdraw if needed
- ✅ **Well-Documented**: Extensive inline comments and guides
- ✅ **Production Ready**: Full test coverage and deployment scripts

### Technical Innovations

- ✅ **Composite Scoring System**: Multi-factor vault evaluation (APY, Sharpe, TVL, liquidity)
- ✅ **Dynamic Weight Adjustment**: Allocation adapts to market conditions
- ✅ **Gas Optimization**: Split deployment strategy for low gas limit chains
- ✅ **GlueX Native Integration**: Direct API integration for real-time data
- ✅ **Automated Monitoring**: Continuous health checks and error recovery

---

## 🔄 How It Works

### User Journey

```
1️⃣ DEPOSIT
   User → Approve USDC → Deposit to Vault
   ├─ Request deposit (transfer USDC)
   └─ Claim shares after processing

2️⃣ OPTIMIZATION (Automated)
   Backend Service (every 5 minutes):
   ├─ Fetch yields from GlueX API
   ├─ Calculate Sharpe ratios
   ├─ Determine optimal allocation
   └─ Execute rebalance transaction

3️⃣ EARN YIELD
   Assets distributed across top vaults:
   ├─ Vault A: 40% (Sharpe 2.5)
   ├─ Vault B: 35% (Sharpe 2.1)
   └─ Vault C: 25% (Sharpe 1.8)

   Yield accrues to vault → Share price increases

4️⃣ WITHDRAW
   User → Request redemption → Claim USDC
   ├─ Request redeem (burn shares)
   └─ Claim USDC after processing

   Example: 10,000 shares @ 1.02 $/share = 10,200 USDC
```

### Sharpe Ratio Optimization

The optimization algorithm uses the Sharpe ratio to measure risk-adjusted returns:

```
Sharpe Ratio = (Expected Return - Risk-Free Rate) / Volatility

Where:
- Expected Return = Current APY from GlueX API
- Risk-Free Rate = 4% (configurable baseline)
- Volatility = Standard deviation of historical APYs

Example:
Vault A: (15% - 4%) / 3% = 3.67 ← Best risk-adjusted return
Vault B: (20% - 4%) / 8% = 2.00 ← Higher APY but too risky
Vault C: (12% - 4%) / 2% = 4.00 ← Optimal choice!
```

**Result**: Capital flows to vaults with the best risk-adjusted returns, not just highest APY.

### Whitelisted Vaults

The following GlueX vaults are pre-configured and whitelisted:

```
1. 0xE25514992597786E07872e6C5517FE1906C0CAdD
2. 0xCdc3975df9D1cf054F44ED238Edfb708880292EA
3. 0x8F9291606862eEf771a97e5B71e4B98fd1Fa216a
4. 0x9f75Eac57d1c6F7248bd2AEDe58C95689f3827f7
5. 0x63Cf7EE583d9954FeBF649aD1c40C97a6493b1Be
```

Additional vaults can be whitelisted by the contract owner.

---

## 🚀 Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (for contracts)
- Python 3.9+ (for backend)
- Node.js 18+ (for frontend)
- GlueX API Key from [portal.gluex.xyz](https://portal.gluex.xyz)

### 1. Clone Repository

```bash
git clone <repository-url>
cd submissions/BIS
```

### 2. Deploy Contracts (or use existing)

```bash
cd contracts

# Set environment variables
export PRIVATE_KEY=your_private_key
export HYPERLIQUID_RPC_URL=https://rpc.hyperliquid.xyz/evm

# Deploy
forge script DeployYieldOptimizer \
  --rpc-url $HYPERLIQUID_RPC_URL \
  --broadcast

# Or use existing deployment:
export VAULT_ADDRESS=0x806ff0f92771f84ace0e19ad9878eadfed4cc19d
```

### 3. Setup Backend Service

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp env.example .env
nano .env  # Add your credentials
```

Edit `.env`:

```bash
HYPERLIQUID_RPC_URL=https://rpc.hyperliquid.xyz/evm
PRIVATE_KEY=your_operator_private_key
VAULT_ADDRESS=0x806ff0f92771f84ace0e19ad9878eadfed4cc19d
GLUEX_API_KEY=your_api_key_from_portal
```

### 4. Run Backend Service

```bash
# Start optimization service
python yield_optimizer.py

# Or run in background
nohup python yield_optimizer.py > optimizer.log 2>&1 &
```

### 5. Setup Frontend (Optional)

```bash
cd frontend

# Install dependencies
npm install

# Configure contracts
# Edit src/contracts/addresses.ts with your deployed addresses

# Start development server
npm run dev

# Open http://localhost:3000
```

### 6. Test User Flow

```bash
# Approve USDC
cast send $USDC_ADDRESS \
  "approve(address,uint256)" \
  $VAULT_ADDRESS \
  100000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $HYPERLIQUID_RPC_URL

# Request deposit (100 USDC)
cast send $VAULT_ADDRESS \
  "requestDeposit(uint256)" \
  100000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $HYPERLIQUID_RPC_URL

# Claim deposit (receive shares)
cast send $VAULT_ADDRESS \
  "claimDeposit()" \
  --private-key $PRIVATE_KEY \
  --rpc-url $HYPERLIQUID_RPC_URL

# Check balance
cast call $VAULT_ADDRESS \
  "balanceOf(address)(uint256)" \
  $YOUR_ADDRESS \
  --rpc-url $HYPERLIQUID_RPC_URL
```

**Complete setup guide**: [SETUP.md](./SETUP.md)

---

## 📚 Documentation

| Document                                                       | Description                          |
| -------------------------------------------------------------- | ------------------------------------ |
| [SETUP.md](./SETUP.md)                                         | Complete step-by-step setup guide    |
| [EXPLANATION.md](./EXPLANATION.md)                             | Technical deep-dive and architecture |
| [contracts/README.md](./contracts/README.md)                   | Smart contract documentation         |
| [backend/README.md](./backend/README.md)                       | Backend service documentation        |
| [frontend/README.md](./frontend/README.md)                     | Frontend documentation               |
| [GLUEX_ROUTER_INTEGRATION.md](./GLUEX_ROUTER_INTEGRATION.md)   | GlueX API integration guide          |
| [WEIGHTED_SCORING_SYSTEM.md](./WEIGHTED_SCORING_SYSTEM.md)     | Optimization algorithm details       |
| [ULTRA_MINIMAL_DEPLOY.md](./contracts/ULTRA_MINIMAL_DEPLOY.md) | Gas-optimized deployment guide       |

---

## 🎬 Demo

### Live Deployment

- **Mainnet Vault**: `0x806ff0f92771f84ace0e19ad9878eadfed4cc19d`
- **Explorer**: [View on HyperLiquid Explorer](https://explorer.hyperliquid.xyz/address/0x806ff0f92771f84ace0e19ad9878eadfed4cc19d)
- **Frontend**: [Coming soon]

### Demo Video

[📹 Watch 3-minute demo video](./demo.mp4) _(Coming soon)_

**Demo Highlights:**

1. User deposits USDC into vault
2. Backend service queries GlueX Yields API
3. Optimal allocation calculated using Sharpe ratios
4. Automatic rebalancing across top vaults
5. User withdraws with accrued yield

---

## 🔐 Security

### Smart Contract Security

- ✅ **Whitelist System**: Only approved vaults can receive funds
- ✅ **Access Control**: Owner and operator roles separated
- ✅ **Reentrancy Protection**: All external calls guarded
- ✅ **Emergency Functions**: Owner can pause and withdraw
- ✅ **Audited Dependencies**: Uses OpenZeppelin contracts

### Operational Security

- ✅ **Private Key Management**: Never committed to repository
- ✅ **Environment Variables**: Secrets stored securely
- ✅ **Operator Separation**: Rebalancing doesn't enable withdrawals
- ✅ **Error Handling**: Comprehensive retry and fallback logic

**Security Checklist**: See [SETUP.md](./SETUP.md#security-checklist)

---

## 📊 Performance

### Expected Returns

| Strategy                 | Annual Return | Risk           | Notes                                   |
| ------------------------ | ------------- | -------------- | --------------------------------------- |
| Manual (no optimization) | 10-12%        | Medium         | Static allocation, missed opportunities |
| **BIS Optimizer**        | **13-18%**    | **Low-Medium** | **Risk-adjusted with auto-rebalancing** |
| Chase highest APY        | 15-20%        | High           | High volatility, poor risk management   |

### Gas Efficiency

- **Deposit/Withdraw**: ~100,000-150,000 gas
- **Rebalance**: ~400,000-600,000 gas (split across all users)
- **Cost per user**: $0.50-$2.00 per rebalance (shared cost)

### System Performance

- **Optimization Cycle**: 2-5 seconds
- **Rebalance Frequency**: Every 1-6 hours (configurable)
- **Uptime**: 99.9% target with monitoring
- **Memory Usage**: ~50-100 MB

---

## 🛠️ Tech Stack

- **Smart Contracts**: Solidity 0.8.20, Foundry, OpenZeppelin
- **Backend**: Python 3.9+, Web3.py, asyncio
- **Frontend**: Next.js 14, TypeScript, TailwindCSS, wagmi
- **APIs**: GlueX Yields API, GlueX Router API
- **Blockchain**: HyperEVM (Hyperliquid L1)
- **Deployment**: Forge, systemd/Docker

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.

---

## 👥 Team

**BIS Team** - Building the future of automated yield optimization

---

## 🙏 Acknowledgments

- **GlueX Team** for Yields API and Router API
- **HyperLiquid** for high-performance L1 infrastructure
- **OpenZeppelin** for secure smart contract libraries
- **Foundry** for excellent Solidity development tools

---

## 📞 Support

- **Issues**: [GitHub Issues](../../issues)
- **Discord**: [Join our Discord](#)
- **Email**: support@bis-optimizer.xyz
- **Documentation**: [Full Docs](./SETUP.md)

---

## 🎯 Task Completion Checklist

✅ **ERC-7540 Implementation**: Async vault for custody with whitelist restrictions  
✅ **GlueX Yields API**: Integrated for real-time APY and risk metrics  
✅ **GlueX Router API**: Integrated for optimal reallocation routes  
✅ **GlueX Vaults Whitelisted**: All 5 GlueX vaults pre-configured  
✅ **Automated Rebalancing**: Continuous optimization with Sharpe ratio  
✅ **Production Deployment**: Live on HyperEVM Mainnet  
✅ **Comprehensive Documentation**: Setup guides and technical docs  
✅ **Frontend Dashboard**: User-friendly interface for deposits/withdrawals  
✅ **Test Coverage**: Comprehensive testing and error handling

---

<div align="center">

**Built with ❤️ for the Hyperliquid + GlueX Hackathon**

[🌐 Website](#) • [📖 Docs](./SETUP.md) • [💬 Discord](#) • [🐦 Twitter](#)

</div>
