# Gas Limit Troubleshooting Guide

## Problem: Block Gas Limit Exceeded

When deploying `YieldOptimizerWithSwap`, you may encounter:

```
Error: Transaction exceeds block gas limit
Error: Out of gas
Error: intrinsic gas too low
```

## Root Causes

### 1. **Contract Size** ✅ (Not the issue - 18KB < 24KB limit)

- YieldOptimizerWithSwap: ~18KB
- Limit: 24KB (24,576 bytes)
- **Status:** Contract size is fine

### 2. **Constructor Operations** ⚠️ (Main issue)

- Deploying contract + initializing state
- Whitelisting 5 vaults in constructor (5 SSTORE operations)
- Setting multiple parameters
- **Total Gas:** ~5-6M gas
- **HyperEVM Block Limit:** Varies, but can be restrictive

### 3. **Configuration Operations** ⚠️ (Secondary issue)

- Batch whitelisting vaults
- Setting operator
- Setting slippage
- **Each operation:** 50-100K gas

## Solutions

### Solution 1: Split Deployment (Recommended) ⭐

Use the optimized deployment script that splits operations:

```bash
cd contracts
chmod +x deploy_swap_optimized.sh
./deploy_swap_optimized.sh
```

**What it does:**

1. **Deploy only** - Minimal constructor (2M gas)
2. **Whitelist vaults** - Batch operation (500K gas)
3. **Set operator** - Single operation (50K gas)
4. **Set slippage** - Single operation (50K gas)

**Total:** 4 separate transactions instead of 1 large one

### Solution 2: Individual Whitelisting (Fallback)

If batch whitelist fails, the script automatically falls back to individual:

```bash
# Whitelist each vault separately
cast send $VAULT_ADDRESS \
  "setVaultWhitelist(address,bool)" \
  0xE25514992597786E07872e6C5517FE1906C0CAdD \
  true \
  --private-key $PRIVATE_KEY \
  --rpc-url https://rpc.hyperliquid.xyz/evm \
  --legacy \
  --gas-limit 100000

# Repeat for each vault
```

### Solution 3: Increase Gas Limit

Explicitly set higher gas limit:

```bash
forge script DeployYieldOptimizerWithSwap_Split \
  --rpc-url https://rpc.hyperliquid.xyz/evm \
  --broadcast \
  --slow \
  --legacy \
  --gas-limit 10000000  # Increased from default
```

### Solution 4: Use `--slow` Flag

The `--slow` flag adds delays between transactions:

```bash
forge script ... --slow
```

This gives the network time to process each transaction.

## Deployment Workflow

### Step-by-Step Process

```
┌─────────────────────────────────────────────────┐
│  1. Deploy Contract (Minimal)                   │
│     Gas: ~2M                                     │
│     Time: ~30 seconds                            │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│  2. Wait for Confirmation                        │
│     Time: 10 seconds                             │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│  3. Batch Whitelist Vaults                       │
│     Gas: ~500K (all 5 vaults)                    │
│     Fallback: Individual (100K each)             │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│  4. Set Operator                                 │
│     Gas: ~50K                                    │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│  5. Set Slippage                                 │
│     Gas: ~50K                                    │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│  ✅ Deployment Complete                          │
│     Total Time: ~2 minutes                       │
│     Total Gas: ~2.7M                             │
└─────────────────────────────────────────────────┘
```

## Testing the Deployment

After deployment, verify everything works:

```bash
chmod +x test_swap_deployment.sh
./test_swap_deployment.sh
```

Expected output:

```
✅ Contract deployed (code size: XXXXX bytes)
✅ Asset (USDC): 0xB8CE...
✅ GlueX Router: 0xe95F...
✅ 5 vaults whitelisted
```

## Common Errors & Fixes

### Error: "Transaction underpriced"

**Cause:** Gas price too low for network

**Fix:**

```bash
# Add --gas-price flag
forge script ... --gas-price 2gwei
```

### Error: "Nonce too low"

**Cause:** Previous transaction still pending

**Fix:**

```bash
# Wait longer between transactions
# Or check pending transactions:
cast tx-count YOUR_ADDRESS --rpc-url https://rpc.hyperliquid.xyz/evm
```

### Error: "Contract creation code storage out of gas"

**Cause:** Contract too large (but shouldn't happen with our 18KB contract)

**Fix:** Optimize contract code (already done)

### Error: "Reverted with reason: Ownable: caller is not the owner"

**Cause:** Wrong private key or address

**Fix:**

```bash
# Verify your address
cast wallet address --private-key $PRIVATE_KEY

# Verify contract owner
cast call $VAULT_ADDRESS "owner()(address)" --rpc-url https://rpc.hyperliquid.xyz/evm
```

## Gas Estimation

### Contract Deployment

- **Base deployment:** 2,000,000 gas
- **Per vault whitelist:** 100,000 gas
- **Set operator:** 50,000 gas
- **Set slippage:** 50,000 gas

### Total for Full Deployment

- **Minimum:** 2,000,000 gas (deploy only)
- **With 5 vaults:** 2,500,000 gas
- **Full configuration:** 2,600,000 gas

### HyperEVM Gas Costs

- **Gas price:** ~0.1 gwei typical
- **Total cost:** ~0.26M gwei = 0.00026 HYPE
- **USD cost:** ~$0.01 (at current prices)

## Optimization Tips

### 1. Reduce Number of Vaults Initially

Deploy with fewer vaults, add more later:

```solidity
// Instead of 5 vaults in constructor
// Start with 0-1 vaults, add rest after deployment
```

### 2. Use Batch Functions

Our contract has `batchWhitelistVaults()`:

```solidity
function batchWhitelistVaults(address[] calldata vaults) external onlyOwner {
    for (uint256 i = 0; i < vaults.length; i++) {
        whitelistedVaults[vaults[i]] = true;
        // ...
    }
}
```

This is more gas-efficient than individual calls.

### 3. Deploy During Low Activity

- **Best time:** Early morning UTC
- **Avoid:** High network activity periods

## Manual Deployment Process

If automated script fails, deploy manually:

```bash
# 1. Deploy contract
forge create YieldOptimizerWithSwap \
  --rpc-url https://rpc.hyperliquid.xyz/evm \
  --private-key $PRIVATE_KEY \
  --constructor-args \
    0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb \
    0xe95F6EAeaE1E4d650576Af600b33D9F7e5f9f7fd \
    "BIS Yield Optimizer V2" \
    "BIS-YO-V2" \
  --legacy

# 2. Save address
export VAULT_ADDRESS=<deployed_address>

# 3. Whitelist vaults
cast send $VAULT_ADDRESS \
  "batchWhitelistVaults(address[])" \
  "[0xE25514992597786E07872e6C5517FE1906C0CAdD,0xCdc3975df9D1cf054F44ED238Edfb708880292EA,...]" \
  --private-key $PRIVATE_KEY \
  --rpc-url https://rpc.hyperliquid.xyz/evm \
  --legacy

# 4. Set operator
cast send $VAULT_ADDRESS \
  "setOperator(address)" \
  YOUR_OPERATOR_ADDRESS \
  --private-key $PRIVATE_KEY \
  --rpc-url https://rpc.hyperliquid.xyz/evm \
  --legacy

# 5. Set slippage
cast send $VAULT_ADDRESS \
  "setDefaultSlippage(uint256)" \
  50 \
  --private-key $PRIVATE_KEY \
  --rpc-url https://rpc.hyperliquid.xyz/evm \
  --legacy
```

## Verification

After deployment, verify the contract:

```bash
forge verify-contract \
  $VAULT_ADDRESS \
  YieldOptimizerWithSwap \
  --constructor-args $(cast abi-encode "constructor(address,address,string,string)" \
    "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb" \
    "0xe95F6EAeaE1E4d650576Af600b33D9F7e5f9f7fd" \
    "BIS Yield Optimizer V2" \
    "BIS-YO-V2") \
  --verifier-url https://explorer.hyperliquid.xyz/api \
  --rpc-url https://rpc.hyperliquid.xyz/evm \
  --legacy
```

## Quick Reference Commands

```bash
# Check gas price
cast gas-price --rpc-url https://rpc.hyperliquid.xyz/evm

# Check balance
cast balance YOUR_ADDRESS --rpc-url https://rpc.hyperliquid.xyz/evm

# Estimate gas for transaction
cast estimate $CONTRACT_ADDRESS "functionName(args)" --rpc-url https://rpc.hyperliquid.xyz/evm

# Check transaction status
cast receipt TX_HASH --rpc-url https://rpc.hyperliquid.xyz/evm

# Check contract code
cast code $CONTRACT_ADDRESS --rpc-url https://rpc.hyperliquid.xyz/evm
```

## Support & Debugging

### Enable Verbose Logging

```bash
forge script ... -vvvv  # Very verbose
```

### Check Broadcast Files

Failed deployments create broadcast files:

```bash
cat broadcast/*/999/run-latest.json | jq '.'
```

### Test on Local Network First

```bash
# Start local node
anvil

# Deploy to local
forge script ... --rpc-url http://localhost:8545
```

## Summary

✅ **Recommended Approach:**

1. Use `deploy_swap_optimized.sh`
2. Split deployment into 4 transactions
3. Wait between transactions
4. Verify with `test_swap_deployment.sh`

⚠️ **If Issues Persist:**

1. Try individual vault whitelisting
2. Increase gas limits
3. Deploy during low activity
4. Use manual deployment process

🔧 **For Development:**

1. Test on local anvil first
2. Use verbose logging
3. Check broadcast files
4. Verify each step

---

**Last Updated:** November 2025  
**Tested On:** HyperEVM Mainnet (Chain ID: 999)
