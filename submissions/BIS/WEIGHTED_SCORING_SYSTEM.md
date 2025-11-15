# BIS Yield Optimizer - Weighted Scoring System

## Overview

This document describes the enhanced weighted scoring system implemented for the BIS Yield Optimizer. The system replaces the simple Sharpe ratio approach with a comprehensive composite score that evaluates staking pools across five key dimensions.

## Design Goals

Based on user preferences for **balanced risk-return** with **conservative switching**, the system prioritizes:
- **Stability** over pure returns
- **Liquidity** as a critical safety factor (20% weight)
- **Track record** as a moderate consideration (5-10% weight)
- **Conservative rebalancing** (only when >25% better, 24-hour minimum)

## Composite Score Formula

```
Total Score =
  (40%) APY Component +
  (25%) Risk Component +
  (20%) Liquidity Component +
  (10%) Safety Component +
  (5%) Gas Efficiency Component
```

### 1. APY Component (40% Weight)

**What it measures:** Expected annual yield

**Formula:**
```python
apy_normalized = min(current_apy / 50.0, 1.0)  # Cap at 50%
apy_component = apy_normalized × 0.40
```

**Example:**
- 15% APY → 15/50 = 0.30 → 0.30 × 0.40 = **0.120**
- 25% APY → 25/50 = 0.50 → 0.50 × 0.40 = **0.200**

**Rationale:**
- Primary value driver but capped at 50% to prevent unrealistic APYs from dominating
- 40% weight provides balanced consideration alongside risk factors

---

### 2. Risk Component (25% Weight)

**What it measures:** Consistency and stability of returns

**Sub-components:**
- **Volatility (60%):** Standard deviation of historical APY
- **Max Drawdown (40%):** Largest peak-to-trough decline

**Formula:**
```python
volatility_normalized = 1 - min(volatility / 0.10, 1.0)  # 10% max
drawdown_normalized = 1 - min(max_drawdown / 20.0, 1.0)  # 20% max

risk_score = (
    0.60 × volatility_normalized +
    0.40 × drawdown_normalized
)
risk_component = risk_score × 0.25
```

**Example:**
- Low volatility (0.75%), low drawdown (1.96%):
  - Volatility normalized: 1 - (0.0075/0.10) = 0.925
  - Drawdown normalized: 1 - (1.96/20) = 0.902
  - Risk score: 0.60×0.925 + 0.40×0.902 = 0.916
  - Component: 0.916 × 0.25 = **0.229**

**Rationale:**
- Volatility captures short-term instability
- Max drawdown captures worst-case scenarios
- 25% total weight reflects balanced approach (not too conservative)

---

### 3. Liquidity Component (20% Weight) ⭐ **CRITICAL**

**What it measures:** Ability to enter/exit positions without slippage

**TVL Tier Scoring:**
```
≥ $5M:   1.0   (Excellent)
$1M-5M:  0.85  (Good)
$500K-1M: 0.65 (Acceptable)
$100K-500K: 0.40 (Risky)
< $100K:  0.10 (Avoid)
```

**Concentration Penalty:**
```
Our position > 20% of pool TVL: 0.5× penalty (major)
Our position > 10% of pool TVL: 0.8× penalty (moderate)
Our position ≤ 10% of pool TVL: No penalty
```

**Hard Filter:**
- **Minimum TVL:** $250,000 (pools below this are excluded entirely)
- **Maximum Concentration:** 20% (never allocate >20% of a pool's TVL)

**Example:**
- $3M TVL pool, $1M our vault:
  - Base score: 0.85 (good tier)
  - Concentration: $1M / $3M = 33% (no violation yet, but high)
  - Penalty: 1.0 (no penalty in this case)
  - Component: 0.85 × 1.0 × 0.20 = **0.170**

**Rationale:**
- User marked liquidity as "Critical"
- Prevents getting trapped in illiquid pools
- 20% weight reflects high importance
- Hard minimums ensure safety

---

### 4. Safety Component (10% Weight)

**What it measures:** Pool reliability and collapse risk

**Sub-components:**

**A. Track Record (50% of safety score):**
```python
if pool_age ≥ 90 days:   age_score = 1.0  # 3+ months
elif pool_age ≥ 30 days: age_score = 0.75 # 1-3 months
elif pool_age ≥ 7 days:  age_score = 0.50 # 1 week - 1 month
else:                    age_score = 0.20 # < 1 week

data_score = min(historical_data_points / 30.0, 1.0)
track_record = (age_score + data_score) / 2
```

**B. Stability Pattern (30% of safety score):**
```python
# Red flags:
- Recent spike: APY > 2× mean in last 3 days → score = 0.3
- Recent crash: APY < 0.5× mean in last 3 days → score = 0.3

# Green flag:
- Positive trend + volatility < 2% → score = 1.0

# Default:
- Acceptable stability → score = 0.7
```

**C. Contract Safety (20% of safety score):**
```python
is_whitelisted → score = 1.0
not_whitelisted → score = 0.0
```

**Combined:**
```python
safety_score = (
    0.50 × track_record +
    0.30 × stability_pattern +
    0.20 × contract_safety
)
safety_component = safety_score × 0.10
```

**Example:**
- 60-day pool, stable pattern, whitelisted:
  - Track record: (0.75 + 0.67) / 2 = 0.71
  - Stability: 0.7 (acceptable)
  - Contract: 1.0 (whitelisted)
  - Safety score: 0.50×0.71 + 0.30×0.70 + 0.20×1.0 = 0.765
  - Component: 0.765 × 0.10 = **0.077**

**Rationale:**
- User wanted "moderate" consideration of track record
- 10% weight provides influence without dominating
- Whitelist provides baseline safety assurance

---

### 5. Gas Efficiency Component (5% Weight)

**What it measures:** Transaction cost optimization

**Tier Scoring:**
```
≤ 100K gas:  1.0   (Efficient)
≤ 200K gas:  0.75  (Acceptable)
≤ 300K gas:  0.50  (Expensive)
> 300K gas:  0.25  (Very expensive)
```

**Formula:**
```python
gas_component = gas_score × 0.05
```

**Rationale:**
- Low weight (5%) due to conservative switching strategy
- With 24-hour rebalancing, gas is less critical
- Still considered for large-scale operations

---

## Conservative Switching Logic

The system only rebalances when **ALL** of these conditions are met:

### 1. Time Constraint
- **Minimum:** 24 hours since last rebalance
- Prevents excessive transaction costs

### 2. Score Improvement Threshold
- **Minimum:** New allocation must be >25% better
- Formula: `(optimal_score - current_score) / current_score > 0.25`

### 3. Gas Cost ROI
- **Minimum:** Expected benefit must be 3× gas cost
- Formula: `improvement × total_assets > 3 × gas_cost`

### 4. Liquidity Checks
- All target pools must have TVL ≥ $250,000
- Our position must not exceed 20% of any pool's TVL

### 5. Asset Availability
- Vault must have assets to rebalance

**Result:** System rebalances conservatively, only when significantly beneficial

---

## Example Comparison

### Scenario: 4 Pools Evaluated

| Pool | APY | TVL | Volatility | Age | Old Sharpe | **New Composite** |
|------|-----|-----|------------|-----|------------|-------------------|
| A - Stable/Liquid | 15% | $3M | 0.75% | 60d | 14.67 | **0.5460** |
| B - Volatile/High-APY | 25% | $400K | 4.5% | 10d | 4.67 | **0.4193** |
| C - Low Liquidity | 20% | $150K | 2.0% | 5d | - | **FILTERED** |
| D - Excellent | 18% | $8M | 1.0% | 91d | 14.00 | **0.6574** ⭐ |

### Winner: Pool D
Despite having only 18% APY (vs Pool B's 25%), Pool D wins because:
- ✅ Excellent liquidity ($8M TVL) → 0.160 liquidity component
- ✅ Low volatility (1.0%) and drawdown (3.83%) → 0.216 risk component
- ✅ Proven track record (91 days) → 1.0 safety score
- ✅ Highest composite score: **0.6574**

### Loser: Pool C
Filtered out entirely for TVL below $250K threshold

---

## Implementation Files

### Backend
- **`backend/yield_optimizer.py`**: Main implementation
  - Lines 32-70: Configuration constants
  - Lines 314-331: `_calculate_max_drawdown()`
  - Lines 333-370: `_calculate_liquidity_score()`
  - Lines 372-404: `_calculate_track_record_score()`
  - Lines 406-451: `_calculate_stability_pattern_score()`
  - Lines 495-579: `_calculate_composite_score()`
  - Lines 620-690: `calculate_optimal_allocation()` (updated)
  - Lines 692-779: `should_rebalance()` (new)
  - Lines 843-905: `run_optimization_cycle()` (updated)

### Smart Contract
- **`contracts/YieldOptimizerSimple.sol`**: Line 101
  - Changed `rebalanceDelay` from `1 hours` to `24 hours`

### Testing
- **`backend/test_composite_scoring.py`**: Validation script
  - Run: `python test_composite_scoring.py`
  - Demonstrates scoring with 4 example pools
  - Validates filtering, ranking, and component calculations

---

## Configuration Parameters

All parameters are configurable via constants in `yield_optimizer.py`:

```python
# Liquidity constraints
MIN_TVL = 250_000  # Minimum pool TVL in USDC
MAX_CONCENTRATION = 0.20  # Maximum 20% of pool TVL

# Rebalancing constraints
MIN_REBALANCE_HOURS = 24  # Conservative switching
SCORE_IMPROVEMENT_THRESHOLD = 0.25  # Must be 25% better
GAS_ROI_MULTIPLE = 3.0  # Benefit must be 3x gas cost

# Scoring parameters
APY_CAP = 50.0  # Cap for normalization
RISK_FREE_RATE = 4.0  # Risk-free rate in %
MAX_VOLATILITY = 10.0  # Max volatility for normalization
MAX_DRAWDOWN_CAP = 20.0  # Max drawdown for normalization

# Composite weights
WEIGHT_APY = 0.40
WEIGHT_RISK = 0.25
WEIGHT_LIQUIDITY = 0.20
WEIGHT_SAFETY = 0.10
WEIGHT_GAS = 0.05
```

---

## Key Benefits

### 1. **Balanced Risk-Return**
- 40% APY weight prevents pure yield-chasing
- 25% risk weight ensures stability consideration
- System favors consistent returns over volatile spikes

### 2. **Liquidity Protection**
- 20% weight on liquidity (user's "critical" requirement)
- Hard $250K TVL minimum prevents illiquid traps
- 20% concentration limit prevents market impact

### 3. **Conservative Switching**
- 24-hour minimum prevents overtrading
- 25% improvement threshold ensures meaningful changes
- Gas ROI check prevents unprofitable rebalancing

### 4. **Transparency**
- Each component score is calculated and logged
- Clear breakdown shows why pools rank as they do
- Users can see exact contribution of each factor

### 5. **Flexibility**
- All weights are configurable constants
- Easy to adjust based on market conditions
- Can be tuned for different risk profiles

---

## Comparison: Old vs New System

| Aspect | Old (Sharpe Ratio) | New (Composite Score) |
|--------|-------------------|----------------------|
| **Primary Metric** | Sharpe Ratio | 5-factor composite |
| **APY Consideration** | ~50% implicit | 40% explicit |
| **Risk Assessment** | Volatility only | Volatility + Drawdown |
| **Liquidity** | ❌ Not considered | ✅ 20% weight + hard minimum |
| **Track Record** | ❌ Not considered | ✅ Part of 10% safety score |
| **Gas Costs** | ❌ Not considered | ✅ 5% weight + ROI check |
| **Rebalance Frequency** | 1 hour minimum | 24 hours minimum |
| **Switching Threshold** | Time only | Time + 25% improvement + gas ROI |
| **Pool Selection** | Top 3 by Sharpe | Top 3 by composite score |
| **Filtering** | Whitelist only | Whitelist + TVL + concentration |

---

## Validation Results

Running `test_composite_scoring.py` demonstrates:

✅ **Pool C filtered** for TVL < $250K
✅ **Pool D wins** despite moderate APY (balanced excellence)
✅ **Pool B penalized** for high volatility and low liquidity
✅ **Component scores sum** to total composite score
✅ **Ranking aligns** with risk-adjusted value

**Test Output:**
```
1. Pool D - Excellent All-Around
   Score: 0.6574 | APY: 18.00% | TVL: $8,000,000

2. Pool A - Stable High-Liquidity
   Score: 0.5460 | APY: 15.00% | TVL: $3,000,000

3. Pool B - Volatile High-APY
   Score: 0.4193 | APY: 25.00% | TVL: $400,000
```

---

## Future Enhancements

### Short Term
1. **Gas Tracking**: Build historical database of actual gas costs per vault
2. **Current Allocations**: Track actual positions for better should_rebalance logic
3. **Dynamic Thresholds**: Adjust MIN_TVL based on total vault size

### Medium Term
1. **Audit Status**: Integrate external audit data into safety score
2. **On-Chain Age**: Fetch actual vault deployment timestamp
3. **Slippage Estimation**: Calculate expected slippage for large deposits

### Long Term
1. **Machine Learning**: Train ML model to predict APY stability
2. **Risk Profiles**: Allow users to choose aggressive/balanced/conservative
3. **Historical Performance**: Track and optimize based on actual returns

---

## Conclusion

The weighted scoring system successfully implements a **balanced risk-return** strategy with **conservative switching** logic. By evaluating pools across five key dimensions, the system:

- ✅ Prioritizes stable, liquid pools over pure yield
- ✅ Filters out risky low-liquidity pools automatically
- ✅ Rebalances only when significantly beneficial
- ✅ Provides transparency into decision-making
- ✅ Maintains flexibility for future optimization

**The system is production-ready and aligned with user preferences.**
