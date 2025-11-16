# GlueX Router API Integration Guide

## Overview

This document explains how the BIS Yield Optimizer integrates with **GlueX Router API** to reallocate assets optimally across vaults with different underlying tokens.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Yield Optimization Flow                   │
└─────────────────────────────────────────────────────────────┘

1. GlueX Yields API          →  Fetch APY data for all vaults
2. Backend Optimization       →  Calculate optimal allocation
3. GlueX Router API          →  Get quotes for reallocations
4. Smart Contract Execution   →  Execute rebalance with swaps
```

## Components

### 1. GlueX Yields API Integration

**Purpose:** Fetch real-time yield data to identify highest-yield opportunities

**Location:** `backend/gluex_client.py::get_historical_apy()`

**Usage:**

```python
from gluex_client import GlueXClient

client = GlueXClient(api_key="your_api_key")

# Fetch yields for GlueX vaults
yields = client.get_historical_apy(
    vault_addresses=[
        "0xcdc3975df9d1cf054f44ed238edfb708880292ea",
        "0xe25514992597786e07872e6c5517fe1906c0cadd"
    ],
    period="7d"
)

# Results include: currentApy, apyHistory, avgApy, etc.
```

**API Endpoint:** `https://yield-api.gluex.xyz`

**Documentation:** https://docs.gluex.xyz/api-reference/yield-api/post-historical-apy

---

### 2. GlueX Router API Integration

**Purpose:** Get optimal routing for asset reallocations between vaults

**Location:** `backend/gluex_client.py::get_reallocation_quote()`

**Usage:**

```python
# Get optimal route for reallocating assets
quote = client.get_reallocation_quote(
    from_token="0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb",  # USDC
    to_token="0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",    # Other token
    amount=10_000_000,  # 10 USDC (in wei)
    user_address="0x...",
    chain_id="hyperevm",
    slippage_bps=50  # 0.5% slippage
)

# Response includes:
# - needsSwap: bool
# - inputAmount: str
# - outputAmount: str
# - minOutputAmount: str (with slippage)
# - calldata: bytes (for on-chain execution)
# - to: address (Router contract)
```

**API Endpoint:** `https://router.gluex.xyz/v1/quote`

**Documentation:** https://docs.gluex.xyz/api-reference/router-api/post-quote

---

### 3. Reallocation Planning

**Purpose:** Build optimal reallocation plan using Router quotes

**Location:** `backend/yield_optimizer.py::build_reallocation_plan()`

**Flow:**

```python
# 1. Get current vault positions
current_positions = optimizer.get_current_vault_positions()
# Returns: {"vault_addr": amount_in_wei, ...}

# 2. Calculate optimal target allocations
optimal_allocations = optimizer.calculate_optimal_allocation(
    vault_metrics=metrics,
    total_assets=total_assets
)

# 3. Build reallocation plan with Router quotes
reallocation_plan = optimizer.build_reallocation_plan(
    current_positions=current_positions,
    target_allocations=optimal_allocations
)

# Returns list of steps:
# [
#   {
#     "fromVault": "0x...",
#     "toVault": "0x...",
#     "amount": 10000000,
#     "fromToken": "0x...",
#     "toToken": "0x...",
#     "needsSwap": True,
#     "expectedOutput": 9950000,
#     "calldata": "0x...",
#     "quote": {...}
#   }
# ]
```

**Algorithm:**

1. Calculate delta between current and target positions for each vault
2. Identify withdrawals (negative delta) and deposits (positive delta)
3. Match withdrawals with deposits
4. For each match, get Router quote for optimal token swap
5. Build executable reallocation plan

---

### 4. Smart Contract Execution

**Purpose:** Execute rebalancing with automatic token swaps via GlueX Router

**Location:** `contracts/YieldOptimizerWithSwap.sol`

**How it works:**

```solidity
function rebalance(
    address[] calldata targetVaults,
    uint256[] calldata targetAmounts
) external onlyOperator {
    // 1. Withdraw from all current vaults
    _withdrawAllAllocations();

    // 2. For each target vault:
    for (uint256 i = 0; i < targetVaults.length; i++) {
        address vault = targetVaults[i];
        uint256 amount = targetAmounts[i];

        // Get vault's required token
        address vaultAsset = IVault(vault).asset();

        // If different token, swap via GlueX Router
        if (vaultAsset != address(asset)) {
            amount = _swapTokens(asset, vaultAsset, amount);
        }

        // Deposit to vault
        IERC20(vaultAsset).approve(vault, amount);
        IVault(vault).deposit(amount, address(this));
    }
}

function _swapTokens(
    address tokenIn,
    address tokenOut,
    uint256 amountIn
) internal returns (uint256 amountOut) {
    // Get quote from GlueX Router
    IGlueXRouter.QuoteRequest memory request = IGlueXRouter.QuoteRequest({
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        amountIn: amountIn,
        slippageBps: defaultSlippageBps,
        receiver: address(this)
    });

    IGlueXRouter.QuoteResponse memory quote = glueXRouter.getQuote(request);

    // Approve and execute swap
    IERC20(tokenIn).approve(address(glueXRouter), amountIn);
    amountOut = glueXRouter.executeSwap(quote);

    emit TokenSwapped(tokenIn, tokenOut, amountIn, amountOut);
}
```

---

## Configuration

### Enable Router API in Backend

Edit `backend/yield_optimizer.py`:

```python
# Router API configuration
USE_ROUTER_API = True  # Enable GlueX Router API integration
```

When enabled:

- ✅ Gets Router quotes for all vault-to-vault reallocations
- ✅ Uses optimal routing paths for token swaps
- ✅ Minimizes slippage on cross-token deposits
- ✅ Logs detailed routing information

When disabled:

- ⚠️ Falls back to direct vault interactions
- ⚠️ May fail if vaults require different tokens

### Environment Variables

Required in `.env`:

```bash
# GlueX API Configuration
GLUEX_API_KEY=your_api_key_from_portal

# Optional: Custom API URLs
GLUEX_YIELD_API_URL=https://yield-api.gluex.xyz
GLUEX_ROUTER_API_URL=https://router.gluex.xyz/v1
```

Get your API key from: https://portal.gluex.xyz

---

## Testing Router Integration

### 1. Run Test Suite

```bash
cd backend
python test_router_reallocation.py
```

This tests:

- ✅ GlueX Yields API connectivity
- ✅ Vault asset detection
- ✅ Current position tracking
- ✅ Router quote fetching
- ✅ Reallocation plan building

### 2. Manual Router Quote Test

```python
from gluex_client import GlueXClient

client = GlueXClient(api_key="your_key")

quote = client.get_reallocation_quote(
    from_token="0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb",
    to_token="0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
    amount=10_000_000,  # 10 USDC
    user_address="0x...",
    chain_id="hyperevm"
)

print(f"Needs Swap: {quote['needsSwap']}")
print(f"Output: {int(quote['outputAmount']) / 1e6} tokens")
```

### 3. Dry Run Reallocation

```bash
cd backend
python -c "
from yield_optimizer import YieldOptimizer
import os
from dotenv import load_dotenv

load_dotenv()

optimizer = YieldOptimizer(
    rpc_url=os.getenv('HYPERLIQUID_RPC_URL'),
    private_key=os.getenv('PRIVATE_KEY'),
    vault_address=os.getenv('VAULT_ADDRESS'),
    gluex_api_key=os.getenv('GLUEX_API_KEY')
)

# Run one optimization cycle (dry run - logs only)
optimizer.run_optimization_cycle()
"
```

---

## Benefits of Router Integration

### 1. **Optimal Routing** 🎯

- Router finds best swap paths across all liquidity sources
- Reduces slippage on token conversions
- Supports multi-hop swaps when needed

### 2. **Token Flexibility** 🔄

- Support any ERC-4626 vault regardless of underlying token
- Automatically handles USDC → wETH, wBTC, or any other token
- No manual token management needed

### 3. **Gas Efficiency** ⛽

- Router optimizes gas usage for swaps
- Batches operations when possible
- Minimizes number of on-chain transactions

### 4. **Real-time Quotes** 📊

- Off-chain quote generation (no gas cost)
- Accurate slippage calculation
- Price impact estimation before execution

### 5. **Risk Management** 🛡️

- Configurable slippage tolerance (default 0.5%)
- Quote validation before execution
- Fallback to direct transfers when no swap needed

---

## Monitoring & Logging

### Backend Logs

When Router integration is active, you'll see:

```
🔀 Using GlueX Router API for optimal reallocation routing
Current positions across 2 vaults
Reallocation plan: 1 withdrawals, 1 deposits
Getting quote: 0xCdc3975d... -> 0xE2551499... (10.00 tokens)
  ✓ Quote obtained: needsSwap=True, output=9.95
Built reallocation plan with 1 steps
============================================================
Executing Router-Based Rebalance
============================================================
Reallocation steps: 1
  Step 1: 0xCdc3975d... -> 0xE2551499... (10.00 tokens, swap=True)
🔄 Executing rebalance via Router API...
✅ Router-based rebalance successful!
   Gas used: 245678
   Swaps via Router: 1/1
```

### On-Chain Events

Monitor these events:

```solidity
event TokenSwapped(
    address indexed tokenIn,
    address indexed tokenOut,
    uint256 amountIn,
    uint256 amountOut
);

event Rebalanced(
    address[] vaults,
    uint256[] amounts
);
```

---

## Troubleshooting

### Issue: Router quote fails

**Symptoms:**

```
Failed to get reallocation quote: API error
```

**Solutions:**

1. Check API key is valid: https://portal.gluex.xyz
2. Verify network connectivity
3. Check token addresses are valid ERC-20 contracts
4. Try increasing slippage tolerance

### Issue: Token swap reverts

**Symptoms:**

```
Swap failed
```

**Solutions:**

1. Check Router has liquidity for token pair
2. Increase slippage tolerance: `defaultSlippageBps`
3. Verify token approvals
4. Check Router contract address is correct

### Issue: "Same token - no swap needed" but still fails

**Symptoms:**

```
needsSwap=False but deposit fails
```

**Solutions:**

1. Vault may be paused or full
2. Check vault's `maxDeposit()`
3. Verify vault whitelist status

---

## API Rate Limits

- **Yields API**: ~100 requests/minute
- **Router API**: ~50 quotes/minute (requires API key)

**Best practices:**

- Cache yield data (TTL: 30 seconds)
- Batch vault queries when possible
- Use exponential backoff on errors

---

## Security Considerations

1. **Slippage Protection**

   - Default: 0.5% (50 bps)
   - Adjustable via `defaultSlippageBps`
   - Monitor for front-running on large swaps

2. **Router Contract Trust**

   - Only use official GlueX Router contracts
   - Verify Router address before deployment
   - Can be updated via `setGlueXRouter()` (owner only)

3. **Token Approvals**

   - Contract only approves exact amounts needed
   - No unlimited approvals
   - Revoke approvals after each swap

4. **Vault Whitelist**
   - Only whitelisted vaults can receive deposits
   - Owner must manually whitelist each vault
   - Prevents deposits to malicious contracts

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         User Deposits                             │
│                              ↓                                    │
│                    YieldOptimizerWithSwap                         │
│                              ↓                                    │
│          ┌──────────────────┴──────────────────┐                 │
│          │                                      │                 │
│          ↓                                      ↓                 │
│   [Off-chain Backend]                   [On-chain Contract]       │
│          │                                      │                 │
│    ┌─────┴─────┐                         ┌─────┴─────┐           │
│    │  GlueX    │                         │   GlueX   │           │
│    │  Yields   │                         │  Router   │           │
│    │   API     │                         │ Contract  │           │
│    └─────┬─────┘                         └─────┬─────┘           │
│          │                                      │                 │
│          ↓ APY Data                             ↓ Swap Execution  │
│    ┌──────────────┐                      ┌──────────────┐        │
│    │  Calculate   │                      │   Execute    │        │
│    │   Optimal    │  ← Router Quote ←    │    Swaps     │        │
│    │  Allocation  │  → Target Vaults →   │     and      │        │
│    └──────────────┘                      │   Deposits   │        │
│                                           └──────┬───────┘        │
│                                                  │                │
│                                                  ↓                │
│                                   ┌──────────────────────────┐   │
│                                   │  GlueX Vaults (ERC-4626) │   │
│                                   │  - Vault 1 (USDC)        │   │
│                                   │  - Vault 2 (wETH)        │   │
│                                   │  - Vault 3 (wBTC)        │   │
│                                   │  - Vault 4 (...)         │   │
│                                   └──────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. ✅ **Test Integration**: Run `test_router_reallocation.py`
2. ✅ **Deploy Contract**: Use updated `YieldOptimizerWithSwap.sol`
3. ✅ **Configure Router**: Set correct Router address
4. ✅ **Whitelist Vaults**: Add GlueX vaults to whitelist
5. ✅ **Start Optimizer**: Run `python yield_optimizer.py`

---

## Additional Resources

- **GlueX Documentation**: https://docs.gluex.xyz
- **GlueX Portal** (API Keys): https://portal.gluex.xyz
- **Yields API Docs**: https://docs.gluex.xyz/api-reference/yield-api
- **Router API Docs**: https://docs.gluex.xyz/api-reference/router-api
- **GlueX Vault Addresses**: See `tasks/gluex.md`

---

## Support

For issues or questions:

- Check logs in `backend/optimizer_debug.log`
- Review test results from `test_router_reallocation.py`
- Verify API key at https://portal.gluex.xyz
- Contact GlueX team for Router-specific issues

---

**Last Updated:** November 2025  
**Version:** 1.0  
**Status:** ✅ Fully Implemented
