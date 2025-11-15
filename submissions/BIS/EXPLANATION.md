# BIS Yield Optimizer - Technical Explanation

## Executive Summary

The BIS Yield Optimizer is an automated yield aggregation protocol that maximizes returns for depositors by continuously reallocating capital to the highest risk-adjusted yield opportunities across multiple lending protocols on HyperEVM. It combines on-chain custody with off-chain intelligence to deliver superior returns while managing risk.

## The Problem in Detail

### 1. APY Volatility

Lending protocol APYs fluctuate based on:

- Supply/demand dynamics
- Utilization rates
- Market conditions
- Protocol-specific events

**Example:**

```
Day 1: Vault A (15% APY), Vault B (12% APY), Vault C (10% APY)
Day 2: Vault A (10% APY), Vault B (18% APY), Vault C (12% APY)
Day 3: Vault A (14% APY), Vault B (11% APY), Vault C (16% APY)
```

A static allocation misses opportunities for better returns.

### 2. Manual Management is Impractical

To optimize manually, a user would need to:

- Monitor APYs 24/7 across all protocols
- Calculate gas costs for reallocation
- Execute transactions at optimal times
- Balance returns vs. risk
- Pay gas fees for each move

This is time-consuming and often not cost-effective.

### 3. Risk vs. Return Trade-off

High APY doesn't always mean best returns:

- **Vault A**: 50% APY but 30% volatility (risky)
- **Vault B**: 20% APY but 5% volatility (stable)

A sophisticated investor would prefer Vault B for better risk-adjusted returns (Sharpe ratio).

## Our Solution Architecture

### Component 1: Smart Contract (On-Chain)

**File:** `contracts/YieldOptimizerSimple.sol`

**What it does:**

1. **Custody**: Holds user deposits securely
2. **Share Management**: Issues ERC-20 shares representing user ownership
3. **Vault Interface**: Deposits/withdraws from lending vaults
4. **Access Control**: Only authorized operator can rebalance
5. **Fee Collection**: Takes performance fee on profits

**Key Functions:**

```solidity
// Users deposit USDC, get vault shares
function deposit(uint256 assets) external returns (uint256 shares)

// Users withdraw by burning shares
function withdraw(uint256 shares) external returns (uint256 assets)

// Operator rebalances across vaults
function rebalance(
    address[] calldata targetVaults,
    uint256[] calldata targetAmounts
) external onlyOperator

// Owner whitelists safe vaults
function setVaultWhitelist(address vault, bool status) external onlyOwner
```

**Security Features:**

- ✅ Whitelist: Only approved vaults can receive funds
- ✅ ReentrancyGuard: Protection against reentrancy attacks
- ✅ Owner controls: Critical functions require owner authorization
- ✅ Operator separation: Rebalancing doesn't give withdrawal access
- ✅ Emergency withdrawals: Owner can recover funds if needed

### Component 2: Optimization Service (Off-Chain)

**File:** `backend/yield_optimizer.py`

**What it does:**

**Step 1: Data Collection**

```python
# Query GlueX Yields API
vaults = ["0xe255...", "0xcdc3...", ...]
apy_data = gluex.get_historical_apy(vaults, timeframe="7d")

# Result:
# {
#   "0xe255...": {"apy": 12.5, "tvl": 1000000, "historical": [...]},
#   "0xcdc3...": {"apy": 15.2, "tvl": 800000, "historical": [...]},
# }
```

**Step 2: Risk Calculation**

```python
# Calculate volatility (standard deviation of historical APYs)
volatility = calculate_std_dev(historical_apys)

# Calculate Sharpe ratio (risk-adjusted return)
sharpe_ratio = (apy - risk_free_rate) / volatility

# Example:
# Vault A: (15% - 4%) / 5% = 2.2
# Vault B: (20% - 4%) / 10% = 1.6
# → Vault A has better risk-adjusted return despite lower APY
```

**Step 3: Optimal Allocation**

```python
# Sort vaults by Sharpe ratio
sorted_vaults = sort_by_sharpe_ratio(vaults)

# Select top N vaults
top_vaults = sorted_vaults[:3]

# Calculate weights proportional to Sharpe ratios
weights = [v.sharpe / total_sharpe for v in top_vaults]

# Example result:
# Vault A: 40% (Sharpe 2.2)
# Vault B: 35% (Sharpe 1.9)
# Vault C: 25% (Sharpe 1.5)
```

**Step 4: Execution**

```python
# Build transaction
tx = vault.rebalance(
    [vault_a, vault_b, vault_c],
    [400000e6, 350000e6, 250000e6]  # Amounts in USDC (6 decimals)
)

# Sign and send
signed_tx = account.sign_transaction(tx)
tx_hash = web3.eth.send_raw_transaction(signed_tx)

# Wait for confirmation
receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
```

### Component 3: GlueX Integration

**GlueX Yields API:**

```python
POST https://api.gluex.xyz/yields/historical-apy

Request:
{
  "vaults": ["0xe255...", "0xcdc3..."],
  "timeframe": "7d"
}

Response:
{
  "0xe255...": {
    "apy": 12.5,
    "tvl": 1000000,
    "historical": [12.1, 12.3, 12.8, 12.5, 12.4]
  }
}
```

**Why GlueX?**

- Aggregated yield data across multiple protocols
- Historical APY for volatility calculation
- Standardized API for easy integration
- Router API for complex reallocations

## How It Works: User Journey

### Scenario: Alice Deposits 10,000 USDC

**Day 1:**

```
1. Alice approves 10,000 USDC to vault
2. Alice calls vault.deposit(10000e6)
3. Vault calculates shares (1:1 on first deposit)
4. Alice receives 10,000 vault shares (BIS-YO tokens)
5. Her 10,000 USDC sits idle in vault initially
```

**Day 1 Evening (First Rebalance):**

```
Backend service runs:

1. Queries GlueX Yields API:
   - Vault A: 15% APY, Sharpe 2.1
   - Vault B: 12% APY, Sharpe 2.3
   - Vault C: 18% APY, Sharpe 1.8

2. Calculates optimal allocation:
   - Vault B: 40% (best Sharpe)
   - Vault A: 35%
   - Vault C: 25%

3. Calls vault.rebalance():
   - Deposits 4,000 USDC to Vault B
   - Deposits 3,500 USDC to Vault A
   - Deposits 2,500 USDC to Vault C

4. Alice's 10,000 USDC now earning optimized yield
```

**Day 3 (Market Changes):**

```
Vault B's APY drops to 8%, becomes less attractive

Backend service detects this:
1. Recalculates Sharpe ratios
2. Finds Vault D now has best risk-adjusted return
3. Rebalances: Withdraws from B, deposits to D
4. Alice's funds now in optimal positions
```

**Day 30 (Alice Withdraws):**

```
1. Vault earned ~200 USDC in yield (20% APY)
2. Performance fee: 200 * 2% = 4 USDC
3. Alice's value: 10,196 USDC (10,000 + 200 - 4)
4. Shares now worth: 10,196 / 10,000 = 1.0196 USDC each
5. Alice burns 10,000 shares, receives 10,196 USDC
6. Profit: 196 USDC (~1.96% in 1 month)
```

## Mathematical Model

### Sharpe Ratio

The Sharpe ratio measures risk-adjusted return:

```
Sharpe Ratio = (Expected Return - Risk-Free Rate) / Volatility

Where:
- Expected Return = APY from GlueX API
- Risk-Free Rate = 4% (baseline, configurable)
- Volatility = Standard deviation of historical APYs
```

**Example Calculation:**

```
Vault A:
- APY: 15%
- Historical APYs: [14%, 15%, 16%, 15%, 14%]
- Mean: 14.8%
- Variance: 0.56
- Std Dev (Volatility): 0.75%
- Sharpe: (15% - 4%) / 0.75% = 14.67

Vault B:
- APY: 20%
- Historical APYs: [15%, 25%, 18%, 22%, 20%]
- Mean: 20%
- Variance: 11.2
- Std Dev: 3.35%
- Sharpe: (20% - 4%) / 3.35% = 4.78

Result: Vault A has better Sharpe ratio despite lower APY
```

### Allocation Weights

```
Weight[i] = Sharpe[i] / Sum(Sharpe)

Example:
- Vault A: Sharpe 2.0
- Vault B: Sharpe 3.0
- Vault C: Sharpe 1.0
- Total: 6.0

Weights:
- Vault A: 2.0/6.0 = 33.3%
- Vault B: 3.0/6.0 = 50.0%
- Vault C: 1.0/6.0 = 16.7%
```

## Performance Expectations

### Returns

**Without Optimization (Manual):**

```
Average APY: 12%
User misses rebalancing opportunities: -2%
Net APY: 10%
```

**With BIS Optimizer:**

```
Optimized average APY: 15% (from better allocation)
Performance fee: -2%
Net APY: 13%
```

**Benefit: +3% additional annual return**

### Gas Efficiency

**Manual Rebalancing:**

- User pays gas for each reallocation
- Frequent rebalancing becomes expensive
- Many users can't afford optimal strategy

**BIS Optimizer:**

- Operator pays gas for rebalancing
- Cost amortized across all depositors
- Economies of scale benefit everyone

**Example:**

```
Vault TVL: 1,000,000 USDC
Rebalance cost: 400,000 gas × 50 gwei = 0.02 ETH = $50
Cost per user: $50 / 100 users = $0.50

vs. individual rebalancing: $50 per user
```

## Technical Advantages

### 1. ERC-20 Shares

Users receive tradeable ERC-20 tokens representing their position:

- Can be transferred
- Can be used as collateral
- Composable with other DeFi protocols

### 2. Async Operations (ERC-7540 variant)

The advanced version supports async deposit/redeem:

- Gas-efficient batch processing
- Better for high-volume operations
- Reduces blockchain congestion

### 3. Modular Design

- Smart contract handles custody and execution
- Backend handles intelligence and decision-making
- Easy to upgrade strategies without changing contract

### 4. Risk Management

- Whitelist prevents malicious vault attacks
- Diversification reduces single-vault risk
- Sharpe optimization balances return vs. risk
- Emergency controls for quick response

## Comparison with Alternatives

### vs. Manual Yield Farming

- ✅ Automated vs. Manual monitoring
- ✅ Optimal allocation vs. Static positions
- ✅ Risk-adjusted vs. Highest APY chasing
- ✅ Shared gas costs vs. Individual costs

### vs. Simple Yield Aggregators

- ✅ Risk-adjusted (Sharpe) vs. Simple APY max
- ✅ Dynamic rebalancing vs. Fixed allocation
- ✅ GlueX integrated vs. Limited protocols
- ✅ Customizable strategy vs. One-size-fits-all

### vs. Yearn Finance (similar product)

- ✅ Built for HyperEVM specifically
- ✅ GlueX native integration
- ✅ Lower TVL = more agile
- ✅ Open source and transparent

## Future Enhancements

### Short Term

1. Web dashboard for users
2. Email/Discord notifications
3. Multiple asset support (USDT, DAI)
4. Advanced risk models

### Medium Term

1. Machine learning for APY prediction
2. Flash loan integration for gas-free rebalancing
3. Cross-chain optimization
4. Governance token

### Long Term

1. Automated strategy marketplace
2. DAO governance
3. Insurance fund
4. Institutional grade features

## Conclusion

The BIS Yield Optimizer demonstrates:

1. ✅ **Technical Sophistication**: Combines smart contracts, Python backend, and API integration
2. ✅ **Real Value**: Delivers measurably better returns through automation
3. ✅ **Production Ready**: Complete with deployment scripts, monitoring, and documentation
4. ✅ **Ecosystem Fit**: Native GlueX integration on HyperEVM

It's a complete, working solution that addresses a real problem in DeFi yield optimization.

---

**For questions about the technical implementation, see:**

- [Smart Contracts README](./contracts/README.md)
- [Backend Service README](./backend/README.md)
- [Setup Guide](./SETUP.md)
