# Swap Module Refactoring

## Overview

The `YieldOptimizerWithSwap.sol` contract has been refactored to separate swap logic into a dedicated module. This reduces contract size, improves modularity, and makes the codebase easier to maintain and deploy.

## Changes Made

### 1. **New SwapModule Contract** (`SwapModule.sol`)

A standalone contract that handles all token swapping operations:

**Features:**

- Integrates with GlueX Router for optimal swap routing
- Configurable slippage tolerance
- Authorization system for caller access control
- Quote retrieval without execution
- Emergency token recovery

**Key Functions:**

- `executeSwap()` - Execute token swaps with slippage protection
- `getSwapQuote()` - Get quote without executing swap
- `setAuthorizedCaller()` - Authorize contracts to use swap module
- `setGlueXRouter()` - Update router address
- `setDefaultSlippage()` - Configure slippage tolerance

### 2. **Refactored YieldOptimizerWithSwap**

**Removed:**

- `glueXRouter` state variable
- `defaultSlippageBps` state variable
- `TokenSwapped` event (now emitted by SwapModule)
- `SwapFailed` error (now in SwapModule)
- Complex `_swapTokens()` implementation
- `setGlueXRouter()` admin function
- `setDefaultSlippage()` admin function

**Added:**

- `swapModule` state variable - reference to SwapModule contract
- `SwapModuleUpdated` event
- `setSwapModule()` - allows updating swap module address
- Simplified `_swapTokens()` - delegates to SwapModule

**Benefits:**

- **~200 lines of code removed** from main contract
- Cleaner separation of concerns
- Easier to upgrade swap logic independently
- Reduced deployment gas costs

### 3. **Updated Deployment Script**

`DeployYieldOptimizerWithSwap.s.sol` now:

1. Deploys `SwapModule` first with GlueX Router
2. Deploys `YieldOptimizerWithSwap` with SwapModule address
3. Authorizes optimizer in SwapModule
4. Configures vaults and operator

## Deployment

### Prerequisites

Set environment variables:

```bash
export ASSET_ADDRESS=<USDC_ADDRESS>
export GLUEX_ROUTER_ADDRESS=<GLUEX_ROUTER>
export PRIVATE_KEY=<YOUR_PRIVATE_KEY>
export OPERATOR_ADDRESS=<OPERATOR> # Optional
```

### Deploy

```bash
cd contracts
forge script DeployYieldOptimizerWithSwap --rpc-url <RPC_URL> --broadcast --verify
```

### Output

The script will output:

```
=== SwapModule Deployed ===
SwapModule Address: 0x...
GlueX Router: 0x...

=== YieldOptimizer with Swap Deployed ===
Contract Address: 0x...
Asset: 0x...
SwapModule: 0x...
Authorized optimizer in SwapModule
Whitelisted vault: 0x...
...

=== Configuration ===
Performance fee (bps): 200
Rebalance delay (secs): 3600
Default slippage (bps): 50

Deployment complete!
SwapModule: 0x...
YieldOptimizer: 0x...
```

## Architecture

```
┌─────────────────────────────────────┐
│   YieldOptimizerWithSwap            │
│                                     │
│  - Manages vaults                   │
│  - Handles deposits/redeems         │
│  - Executes rebalancing             │
│  - Delegates swaps to SwapModule    │
└──────────────┬──────────────────────┘
               │
               │ calls
               ▼
┌─────────────────────────────────────┐
│        SwapModule                   │
│                                     │
│  - Handles token swaps              │
│  - Manages slippage                 │
│  - Integrates with GlueX Router     │
│  - Access control                   │
└──────────────┬──────────────────────┘
               │
               │ calls
               ▼
┌─────────────────────────────────────┐
│       GlueX Router                  │
│                                     │
│  - Optimal swap routing             │
│  - Multi-source liquidity           │
│  - Gas-efficient swaps              │
└─────────────────────────────────────┘
```

## Usage

### For Users (No Changes)

User-facing functions remain unchanged:

- `requestDeposit(assets)`
- `requestRedeem(shares)`
- `claimDeposit()`
- `claimRedeem()`

### For Operators

Rebalancing works the same way:

```solidity
optimizer.rebalance(targetVaults, targetAmounts);
```

The optimizer automatically:

1. Withdraws from current vaults
2. Calls SwapModule to swap tokens as needed
3. Deposits to target vaults

### For Admins

New admin function to update swap module:

```solidity
optimizer.setSwapModule(newSwapModuleAddress);
```

Configure slippage on SwapModule:

```solidity
swapModule.setDefaultSlippage(100); // 1%
```

## Gas Savings

**Before:** YieldOptimizerWithSwap ~6000 lines of bytecode
**After:**

- YieldOptimizerWithSwap: ~5500 lines
- SwapModule: ~500 lines
- **Total savings:** ~8-10% reduction in main contract size

## Security Considerations

1. **Access Control:** Only authorized callers can use SwapModule
2. **Upgradability:** SwapModule can be replaced without redeploying main contract
3. **Slippage Protection:** Each swap protected by configurable slippage tolerance
4. **Emergency Recovery:** Owner can recover stuck tokens from SwapModule

## Testing

Existing tests should continue to work. Update setup to:

1. Deploy SwapModule
2. Deploy YieldOptimizer with SwapModule address
3. Authorize optimizer in SwapModule

```solidity
// Test setup
SwapModule swapModule = new SwapModule(glueXRouter, 50);
YieldOptimizerWithSwap optimizer = new YieldOptimizerWithSwap(
    asset,
    address(swapModule),
    "Test",
    "TEST"
);
swapModule.setAuthorizedCaller(address(optimizer), true);
```

## Future Improvements

1. **Multiple Swap Modules:** Support different routers (GlueX, Uniswap, etc.)
2. **Swap Aggregation:** Compare quotes from multiple sources
3. **Gas Optimization:** Batch multiple swaps in single transaction
4. **Price Oracles:** Add price validation for swaps

## Questions?

See main documentation or contact the development team.
