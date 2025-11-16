# YieldOptimizerMinimal Whitelist Setup Guide

## Overview

Your YieldOptimizerMinimal contract has been successfully deployed at:

- **Contract Address**: `0x916855dB77F2d5b63e8EF3472d6e7Df9fc6ccd79`
- **Network**: Hyperliquid Mainnet (Chain ID: 999)
- **Explorer**: https://hyperevmscan.io/address/0x916855db77f2d5b63e8ef3472d6e7df9fc6ccd79

## What Was Fixed

### 1. Backend Code Issues

The backend was calling `getWhitelistedVaults()` which doesn't exist in YieldOptimizerMinimal.

**Fixed in**:

- `/backend/yield_optimizer.py` - Updated to use `getAllocations()[0]`
- `/backend/app.py` - Updated all 3 occurrences

**Changes**:

```python
# OLD (doesn't work with YieldOptimizerMinimal):
whitelisted = opt.vault.functions.getWhitelistedVaults().call()

# NEW (correct):
allocations_result = opt.vault.functions.getAllocations().call()
whitelisted = allocations_result[0]  # First element is vault addresses
```

### 2. Created Whitelist Scripts

Two scripts were created for whitelisting vaults:

#### Option A: Forge Script (Recommended)

- **File**: `contracts/ConfigureMinimalVaults.s.sol`
- **Shell Script**: `contracts/configure_minimal_vaults.sh`

#### Option B: Manual Cast Commands

- **File**: `contracts/whitelist_vaults_manual.sh`
- Simpler approach using individual `cast send` commands

## How to Whitelist Vaults

### Prerequisites

```bash
export PRIVATE_KEY=your_private_key_here
```

### Option 1: Using the Automated Script (Recommended)

```bash
cd contracts
./whitelist_vaults_manual.sh
```

This will:

1. Whitelist all 5 GlueX vaults
2. Verify each vault was whitelisted correctly
3. Show you the status

### Option 2: Using Forge Script

```bash
cd contracts
export PRIVATE_KEY=your_private_key
./configure_minimal_vaults.sh
```

### Option 3: Manual Commands

If you prefer to whitelist vaults one by one:

```bash
cd contracts

# Set your private key
export PRIVATE_KEY=your_private_key

# Whitelist each vault individually
RPC_URL="https://rpc.hyperliquid.xyz/evm"
OPTIMIZER="0x916855dB77F2d5b63e8EF3472d6e7Df9fc6ccd79"

# Vault 1
cast send $OPTIMIZER \
  'whitelistVault(address,bool)' \
  0xE25514992597786E07872e6C5517FE1906C0CAdD true \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY --legacy

# Vault 2
cast send $OPTIMIZER \
  'whitelistVault(address,bool)' \
  0xCdc3975df9D1cf054F44ED238Edfb708880292EA true \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY --legacy

# Vault 3
cast send $OPTIMIZER \
  'whitelistVault(address,bool)' \
  0x8F9291606862eEf771a97e5B71e4B98fd1Fa216a true \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY --legacy

# Vault 4
cast send $OPTIMIZER \
  'whitelistVault(address,bool)' \
  0x9f75Eac57d1c6F7248bd2AEDe58C95689f3827f7 true \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY --legacy

# Vault 5
cast send $OPTIMIZER \
  'whitelistVault(address,bool)' \
  0x63Cf7EE583d9954FeBF649aD1c40C97a6493b1Be true \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY --legacy
```

## Verification

After whitelisting, verify the setup:

```bash
RPC_URL="https://rpc.hyperliquid.xyz/evm"
OPTIMIZER="0x916855dB77F2d5b63e8EF3472d6e7Df9fc6ccd79"

# Check total vault count
cast call $OPTIMIZER "getVaultCount()(uint256)" --rpc-url $RPC_URL

# Check all allocations (returns vaults and amounts)
cast call $OPTIMIZER "getAllocations()(address[],uint256[])" --rpc-url $RPC_URL

# Check if specific vault is whitelisted
cast call $OPTIMIZER \
  "whitelistedVaults(address)(bool)" \
  0xE25514992597786E07872e6C5517FE1906C0CAdD \
  --rpc-url $RPC_URL
```

## GlueX Vaults Being Whitelisted

| #   | Vault Address                                | Description   |
| --- | -------------------------------------------- | ------------- |
| 1   | `0xE25514992597786E07872e6C5517FE1906C0CAdD` | GlueX Vault 1 |
| 2   | `0xCdc3975df9D1cf054F44ED238Edfb708880292EA` | GlueX Vault 2 |
| 3   | `0x8F9291606862eEf771a97e5B71e4B98fd1Fa216a` | GlueX Vault 3 |
| 4   | `0x9f75Eac57d1c6F7248bd2AEDe58C95689f3827f7` | GlueX Vault 4 |
| 5   | `0x63Cf7EE583d9954FeBF649aD1c40C97a6493b1Be` | GlueX Vault 5 |

## Next Steps After Whitelisting

### 1. Update Backend Configuration

Update your backend `.env` file:

```bash
cd backend
cp env.example .env
```

Edit `.env`:

```env
# HyperEVM Mainnet RPC URL
HYPERLIQUID_RPC_URL=https://rpc.hyperliquid.xyz/evm

# Private key for operator account
PRIVATE_KEY=your_private_key_here

# Deployed YieldOptimizer contract address
VAULT_ADDRESS=0x916855dB77F2d5b63e8EF3472d6e7Df9fc6ccd79

# GlueX API credentials
GLUEX_API_KEY=your_gluex_api_key_here

# Check interval (seconds)
CHECK_INTERVAL=300

# Minimum rebalance interval (seconds)
MIN_REBALANCE_INTERVAL=3600
```

### 2. Restart the Backend

```bash
cd backend
source venv/bin/activate
python app.py
```

The backend should now work correctly with the YieldOptimizerMinimal contract.

### 3. Test the Setup

```bash
# Check if the backend can read vaults
curl http://localhost:5001/api/health

# Check dashboard
curl http://localhost:5001/api/dashboard

# Check rebalance suggestions
curl http://localhost:5001/api/rebalance/suggest
```

## Troubleshooting

### "execution reverted" Error

- **Cause**: Function doesn't exist or wrong parameters
- **Solution**: We've fixed all the backend code to use the correct functions

### "HTTP 404" Error

- **Cause**: Wrong RPC URL
- **Solution**: Use `https://rpc.hyperliquid.xyz/evm` (not testnet URL)

### "No vaults found" Error

- **Cause**: Vaults not whitelisted yet
- **Solution**: Run the whitelist script as described above

### Gas Estimation Failed

- **Cause**: Insufficient gas or invalid transaction
- **Solution**: Add `--gas-limit 100000` flag to cast commands

## Contract Functions Reference

The YieldOptimizerMinimal contract has these key functions:

### View Functions

- `totalAssets()` - Returns total assets under management
- `getVaultCount()` - Returns number of whitelisted vaults
- `getAllocations()` - Returns (address[] vaults, uint256[] amounts)
- `whitelistedVaults(address)` - Check if vault is whitelisted
- `operator()` - Returns current operator address
- `owner()` - Returns contract owner
- `lastRebalance()` - Returns timestamp of last rebalance

### Admin Functions (Owner Only)

- `whitelistVault(address vault, bool status)` - Whitelist/remove vault
- `setOperator(address newOperator)` - Set operator address
- `setGlueXRouter(address newRouter)` - Update GlueX router
- `emergencyWithdraw(address token, uint256 amount)` - Emergency withdrawal

### Operator Functions

- `rebalance(address[] vaults, uint256[] amounts, address[] tokens, bytes[] swapData)` - Rebalance assets

## Summary

✅ **Completed**:

- Contract deployed successfully
- Backend code fixed to work with YieldOptimizerMinimal
- Whitelist scripts created

🔄 **Next Steps** (You Need To Do):

1. Run whitelist script to whitelist the 5 GlueX vaults
2. Update backend `.env` with contract address
3. Restart the backend service
4. Test the full system

Once vaults are whitelisted, your yield optimizer will be fully operational! 🚀
