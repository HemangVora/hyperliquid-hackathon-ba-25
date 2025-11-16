# Ultra-Minimal Deployment Guide

## Problem

Hyperliquid has a low block gas limit. Deploying both SwapModule and YieldOptimizer in one transaction exceeds this limit.

## Solution: Deploy One Contract at a Time

### Step 1: Deploy SwapModule Only

```bash
export GLUEX_ROUTER_ADDRESS=0xe95F6EAeaE1E4d650576Af600b33D9F7e5f9f7fd
export PRIVATE_KEY=<YOUR_PRIVATE_KEY>

forge script DeploySwapModuleOnly \
  --rpc-url hyperliquid_mainnet \
  --broadcast
```

**Save the SwapModule address from the output!**

### Step 2: Deploy YieldOptimizer Only

```bash
export ASSET_ADDRESS=0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb
export SWAP_MODULE_ADDRESS=<FROM_STEP_1>
export PRIVATE_KEY=<YOUR_PRIVATE_KEY>

forge script DeployOptimizerOnly \
  --rpc-url hyperliquid_mainnet \
  --broadcast
```

**Save the YieldOptimizer address from the output!**

### Step 3: Authorize Optimizer in SwapModule

```bash
export SWAP_MODULE_ADDRESS=<FROM_STEP_1>
export OPTIMIZER_ADDRESS=<FROM_STEP_2>
export PRIVATE_KEY=<YOUR_PRIVATE_KEY>

forge script AuthorizeOptimizer \
  --rpc-url hyperliquid_mainnet \
  --broadcast
```

### Step 4: Whitelist Vaults (Optional - Batch)

If whitelisting all 5 vaults exceeds gas limit, whitelist one at a time:

```bash
export VAULT_ADDRESS=<YOUR_OPTIMIZER_ADDRESS>
export PRIVATE_KEY=<YOUR_PRIVATE_KEY>

# Whitelist each vault individually
cast send $VAULT_ADDRESS \
  "setVaultWhitelist(address,bool)" \
  0xE25514992597786E07872e6C5517FE1906C0CAdD \
  true \
  --rpc-url hyperliquid_mainnet \
  --private-key $PRIVATE_KEY
```

Or try the batch script:

```bash
forge script ConfigureYieldOptimizerWithSwap \
  --rpc-url hyperliquid_mainnet \
  --broadcast
```

## Complete Script

```bash
#!/bin/bash
# Ultra-minimal deployment for Hyperliquid

# Configuration
export ASSET_ADDRESS=0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb
export GLUEX_ROUTER_ADDRESS=0xe95F6EAeaE1E4d650576Af600b33D9F7e5f9f7fd
export PRIVATE_KEY=<YOUR_PRIVATE_KEY>

echo "Step 1: Deploying SwapModule..."
forge script DeploySwapModuleOnly \
  --rpc-url hyperliquid_mainnet \
  --broadcast

echo ""
echo "Enter SwapModule address from above:"
read SWAP_MODULE_ADDRESS
export SWAP_MODULE_ADDRESS

echo ""
echo "Step 2: Deploying YieldOptimizer..."
forge script DeployOptimizerOnly \
  --rpc-url hyperliquid_mainnet \
  --broadcast

echo ""
echo "Enter YieldOptimizer address from above:"
read OPTIMIZER_ADDRESS
export OPTIMIZER_ADDRESS

echo ""
echo "Step 3: Authorizing Optimizer..."
forge script AuthorizeOptimizer \
  --rpc-url hyperliquid_mainnet \
  --broadcast

echo ""
echo "Deployment Complete!"
echo "SwapModule: $SWAP_MODULE_ADDRESS"
echo "YieldOptimizer: $OPTIMIZER_ADDRESS"
```

## Gas Comparison

| Approach          | Contracts per TX | Estimated Gas | Status           |
| ----------------- | ---------------- | ------------- | ---------------- |
| Full Deploy       | 2 + config       | ~4.6M         | ❌ Exceeds limit |
| Split Deploy      | 2                | ~4.1M         | ❌ Exceeds limit |
| **Ultra-Minimal** | **1**            | **~2M each**  | **✅ Works!**    |

## Why This Works

Hyperliquid's block gas limit is around 3-4M gas. By deploying:

1. SwapModule alone (~2M gas) ✅
2. YieldOptimizer alone (~2M gas) ✅
3. Authorization alone (~50K gas) ✅

Each transaction fits comfortably within the limit!

## Troubleshooting

### Still Getting Gas Limit Error?

Try even smaller operations:

```bash
# Set lower gas limit
--gas-limit 2000000
```

### Need to Whitelist Vaults One by One?

```bash
VAULTS=(
  0xE25514992597786E07872e6C5517FE1906C0CAdD
  0xCdc3975df9D1cf054F44ED238Edfb708880292EA
  0x8F9291606862eEf771a97e5B71e4B98fd1Fa216a
  0x9f75Eac57d1c6F7248bd2AEDe58C95689f3827f7
  0x63Cf7EE583d9954FeBF649aD1c40C97a6493b1Be
)

for vault in "${VAULTS[@]}"; do
  echo "Whitelisting $vault..."
  cast send $OPTIMIZER_ADDRESS \
    "setVaultWhitelist(address,bool)" \
    $vault \
    true \
    --rpc-url hyperliquid_mainnet \
    --private-key $PRIVATE_KEY
  sleep 2
done
```

## Summary

Deploy one contract at a time to stay under Hyperliquid's gas limit. This is the most reliable approach for chains with low block gas limits.
