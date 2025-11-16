# YieldOptimizer with Token Swapping - Deployment Guide

## Overview

The enhanced `YieldOptimizerWithSwap` contract automatically swaps tokens via GlueX Router when depositing to vaults that require different assets. This eliminates the token mismatch issue.

## Key Features

1. **Automatic Token Detection**: Checks each vault's required token before deposit
2. **GlueX Router Integration**: Uses GlueX Router for efficient token swaps
3. **Bi-directional Swapping**: Swaps USDC → Vault Token on deposit, Vault Token → USDC on withdrawal
4. **Configurable Slippage**: Default 0.5% slippage protection, adjustable by owner
5. **Error Handling**: Comprehensive error handling for failed swaps

## Prerequisites

Ensure you have:

- Private key with HYPE for gas
- USDC balance for testing
- GlueX Router address
- Asset (USDC) address

## Environment Setup

Create/update `.env` file:

```bash
# Required
PRIVATE_KEY=your_private_key_without_0x_prefix
ASSET_ADDRESS=0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb  # USDC
GLUEX_ROUTER_ADDRESS=0xe95F6EAeaE1E4d650576Af600b33D9F7e5f9f7fd

# Optional
OPERATOR_ADDRESS=0x...  # Defaults to deployer if not set
```

## Deployment Steps

### Step 1: Deploy Contract

```bash
cd /Users/hemangvora/Documents/OpenSource/hyperliquid-hackathon-ba-25/submissions/BIS/contracts

# Load environment variables
export $(cat .env | xargs)

# Deploy
forge script DeployYieldOptimizerWithSwap \
    --rpc-url https://rpc.hyperliquid.xyz/evm \
    --broadcast \
    --slow \
    --legacy \
    --skip '*/certora/*' --skip '*/test/*' --skip '*/mocks/*' --skip '*/draft-*' --skip '*/signers/*' --skip '*/RLP.sol'
```

### Step 2: Extract Contract Address

```bash
# Get deployed contract address
VAULT_ADDRESS=$(jq -r '.transactions[0].contractAddress' \
    broadcast/DeployYieldOptimizerWithSwap.s.sol/999/run-latest.json)

echo "Deployed at: $VAULT_ADDRESS"
```

### Step 3: Verify Deployment

```bash
# Check owner
cast call $VAULT_ADDRESS "owner()" --rpc-url https://rpc.hyperliquid.xyz/evm

# Check operator
cast call $VAULT_ADDRESS "operator()" --rpc-url https://rpc.hyperliquid.xyz/evm

# Check whitelisted vaults count
cast call $VAULT_ADDRESS "getWhitelistedVaults()" --rpc-url https://rpc.hyperliquid.xyz/evm

# Check slippage setting
cast call $VAULT_ADDRESS "defaultSlippageBps()" --rpc-url https://rpc.hyperliquid.xyz/evm
```

## Testing the Contract

### Test 1: Deposit USDC

```bash
# Approve USDC
cast send 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb \
    "approve(address,uint256)" \
    $VAULT_ADDRESS \
    10000000 \
    --private-key $PRIVATE_KEY \
    --rpc-url https://rpc.hyperliquid.xyz/evm \
    --legacy

# Request deposit (10 USDC = 10,000,000 with 6 decimals)
cast send $VAULT_ADDRESS \
    "requestDeposit(uint256)" \
    10000000 \
    --private-key $PRIVATE_KEY \
    --rpc-url https://rpc.hyperliquid.xyz/evm \
    --legacy

# Claim deposit to receive vault shares
cast send $VAULT_ADDRESS \
    "claimDeposit()" \
    --private-key $PRIVATE_KEY \
    --rpc-url https://rpc.hyperliquid.xyz/evm \
    --legacy
```

### Test 2: Rebalance with Multi-Token Vaults

```bash
# Prepare rebalance call
# This will automatically swap USDC to required tokens for each vault

# Example: Allocate 2 USDC each to 5 different vaults
cast send $VAULT_ADDRESS \
    "rebalance(address[],uint256[])" \
    "[0xE25514992597786E07872e6C5517FE1906C0CAdD,0xCdc3975df9D1cf054F44ED238Edfb708880292EA,0x8F9291606862eEf771a97e5B71e4B98fd1Fa216a,0x9f75Eac57d1c6F7248bd2AEDe58C95689f3827f7,0x63Cf7EE583d9954FeBF649aD1c40C97a6493b1Be]" \
    "[2000000,2000000,2000000,2000000,2000000]" \
    --private-key $PRIVATE_KEY \
    --rpc-url https://rpc.hyperliquid.xyz/evm \
    --legacy \
    --gas-limit 5000000
```

### Test 3: Check Allocations

```bash
# Get current allocations
cast call $VAULT_ADDRESS "getCurrentAllocations()" --rpc-url https://rpc.hyperliquid.xyz/evm

# Check total assets
cast call $VAULT_ADDRESS "totalAssets()" --rpc-url https://rpc.hyperliquid.xyz/evm
```

## Contract Functions

### User Functions

- `requestDeposit(uint256 assets)` - Request to deposit USDC
- `requestRedeem(uint256 shares)` - Request to redeem shares
- `claimDeposit()` - Claim processed deposit
- `claimRedeem()` - Claim processed redemption

### Operator Functions

- `rebalance(address[] vaults, uint256[] amounts)` - Rebalance with auto-swap

### Admin Functions

- `setVaultWhitelist(address vault, bool status)` - Add/remove vaults
- `setOperator(address operator)` - Set operator address
- `setDefaultSlippage(uint256 bps)` - Set slippage tolerance (max 1000 = 10%)
- `setPerformanceFee(uint256 fee)` - Set performance fee
- `setRebalanceDelay(uint256 delay)` - Set minimum delay between rebalances
- `emergencyWithdraw(address vault)` - Emergency withdrawal from vault

## Important Notes

### Gas Considerations

- Swapping adds extra gas cost (~100-300k gas per swap)
- Multi-vault rebalances may require 3-5M gas limit
- Use `--gas-limit` flag if transactions fail with out-of-gas

### Slippage Protection

- Default: 0.5% (50 bps)
- Adjustable via `setDefaultSlippage()`
- Transactions revert if slippage exceeds limit

### Token Price Considerations

- The `totalAssets()` function approximates cross-token values
- For accurate accounting, consider integrating a price oracle
- Currently assumes 1:1 value ratio (acceptable for stablecoins)

### GlueX Router Requirements

- Must be a valid GlueX Router address
- Router must support all token pairs used by vaults
- Ensure router has sufficient liquidity for swaps

## Troubleshooting

### "Swap failed" Error

- Check GlueX Router address is correct
- Verify router supports the token pair
- Increase slippage tolerance if needed
- Check if router has sufficient liquidity

### "Deposit failed" After Swap

- Vault may be paused or have deposit limits
- Check vault's `maxDeposit()` limit
- Verify token approval to vault

### Out of Gas

- Increase gas limit: `--gas-limit 5000000`
- Reduce number of vaults in single rebalance
- Consider batching operations

## Backend Integration

Update `backend/.env`:

```bash
VAULT_ADDRESS=0x...  # Your new contract address
```

The backend Python code should work without changes, but for optimal multi-token support, consider:

1. Adding token price data to scoring
2. Implementing token-specific allocation strategies
3. Monitoring swap costs and optimizing rebalance frequency

## Comparison: Old vs New Contract

| Feature             | YieldOptimizer | YieldOptimizerWithSwap |
| ------------------- | -------------- | ---------------------- |
| Single Token Vaults | ✅             | ✅                     |
| Multi-Token Vaults  | ❌             | ✅                     |
| Automatic Swapping  | ❌             | ✅                     |
| Slippage Protection | ❌             | ✅                     |
| Gas Cost            | Lower          | Higher (+swap gas)     |
| Vault Compatibility | Limited        | All vaults             |

## Next Steps

1. ✅ Deploy contract
2. ✅ Test deposits
3. ✅ Test rebalancing with multi-token vaults
4. Update backend configuration
5. Monitor gas costs and optimize
6. Consider adding price oracles for accurate cross-token accounting

## Support

For issues or questions:

- Check transaction on HyperEVM explorer
- Review event logs for detailed error messages
- Verify all environment variables are set correctly
