# Step-by-Step Deployment Guide

## Problem

The deployment exceeds the block gas limit because the contract is too large for a single transaction.

## Solution

Split the deployment into multiple transactions:

1. Deploy the contract (minimal bytecode)
2. Configure vaults separately
3. Set parameters separately

---

## Option 1: Automated Deployment (Recommended)

```bash
cd /Users/hemangvora/Documents/OpenSource/hyperliquid-hackathon-ba-25/submissions/BIS/contracts

# Make sure PRIVATE_KEY is set
export PRIVATE_KEY=your_private_key

# Run the automated deployment script
./deploy.sh
```

This will automatically:

- Deploy the contract
- Whitelist all vaults
- Set performance fee
- Set rebalance delay
- Set operator

---

## Option 2: Manual Step-by-Step Deployment

### Step 1: Deploy Contract Only

```bash
cd /Users/hemangvora/Documents/OpenSource/hyperliquid-hackathon-ba-25/submissions/BIS/contracts

export PRIVATE_KEY=your_private_key
export RPC_URL=https://rpc.hyperliquid.xyz/evm

# Deploy with legacy transactions and optimized gas
forge script DeployYieldOptimizer \
    --rpc-url $RPC_URL \
    --broadcast \
    --slow \
    --legacy
```

**Expected Output:**

```
Contract Address: 0x...
```

Save this address! You'll need it for the next steps.

### Step 2: Set the Deployed Address

```bash
export VAULT_ADDRESS=0xYourDeployedAddress
```

### Step 3: Whitelist Vaults (One at a Time)

Whitelist each vault separately to avoid gas limit issues:

```bash
# Vault 1
cast send $VAULT_ADDRESS \
    "setVaultWhitelist(address,bool)" \
    0xE25514992597786E07872e6C5517FE1906C0CAdD \
    true \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --legacy

# Vault 2
cast send $VAULT_ADDRESS \
    "setVaultWhitelist(address,bool)" \
    0xCdc3975df9D1cf054F44ED238Edfb708880292EA \
    true \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --legacy

# Vault 3
cast send $VAULT_ADDRESS \
    "setVaultWhitelist(address,bool)" \
    0x8F9291606862eEf771a97e5B71e4B98fd1Fa216a \
    true \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --legacy

# Vault 4
cast send $VAULT_ADDRESS \
    "setVaultWhitelist(address,bool)" \
    0x9f75Eac57d1c6F7248bd2AEDe58C95689f3827f7 \
    true \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --legacy

# Vault 5
cast send $VAULT_ADDRESS \
    "setVaultWhitelist(address,bool)" \
    0x63Cf7EE583d9954FeBF649aD1c40C97a6493b1Be \
    true \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --legacy
```

### Step 4: Set Performance Fee (2%)

```bash
cast send $VAULT_ADDRESS \
    "setPerformanceFee(uint256)" \
    200 \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --legacy
```

### Step 5: Set Rebalance Delay (1 hour = 3600 seconds)

```bash
cast send $VAULT_ADDRESS \
    "setRebalanceDelay(uint256)" \
    3600 \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --legacy
```

### Step 6: Set Operator Address

```bash
# Use your operator address (can be same as deployer)
OPERATOR_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)

cast send $VAULT_ADDRESS \
    "setOperator(address)" \
    $OPERATOR_ADDRESS \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --legacy
```

---

## Verification

After deployment, verify everything is configured correctly:

```bash
# Check owner
cast call $VAULT_ADDRESS "owner()(address)" --rpc-url $RPC_URL

# Check operator
cast call $VAULT_ADDRESS "operator()(address)" --rpc-url $RPC_URL

# Check whitelisted vaults
cast call $VAULT_ADDRESS "getWhitelistedVaults()(address[])" --rpc-url $RPC_URL

# Check performance fee
cast call $VAULT_ADDRESS "performanceFee()(uint256)" --rpc-url $RPC_URL

# Check rebalance delay
cast call $VAULT_ADDRESS "rebalanceDelay()(uint256)" --rpc-url $RPC_URL

# Check total assets (should be 0 initially)
cast call $VAULT_ADDRESS "totalAssets()(uint256)" --rpc-url $RPC_URL
```

---

## Update Backend Configuration

After successful deployment:

```bash
cd ../backend

# Update .env file
echo "VAULT_ADDRESS=$VAULT_ADDRESS" >> .env

# Or manually edit .env
nano .env
```

---

## Troubleshooting

### Still Getting "Exceeds Gas Limit"?

Try adding explicit gas limits:

```bash
forge script DeployYieldOptimizer \
    --rpc-url $RPC_URL \
    --broadcast \
    --slow \
    --legacy \
    --gas-limit 8000000
```

### Transaction Failed?

Check your balance:

```bash
cast balance $(cast wallet address --private-key $PRIVATE_KEY) --rpc-url $RPC_URL
```

### Need to Retry?

If a step fails, you can retry just that step. Each step is independent.

---

## Quick Deploy (All-in-One Command)

```bash
cd /Users/hemangvora/Documents/OpenSource/hyperliquid-hackathon-ba-25/submissions/BIS/contracts && \
export PRIVATE_KEY=your_key && \
./deploy.sh
```

---

## Next Steps

1. ✅ Deploy contract
2. ✅ Configure vaults
3. ✅ Set parameters
4. ✅ Update backend .env
5. 🚀 Start backend service: `cd ../backend && python yield_optimizer.py`
6. 💰 Test deposit: See SETUP.md for user flow testing
