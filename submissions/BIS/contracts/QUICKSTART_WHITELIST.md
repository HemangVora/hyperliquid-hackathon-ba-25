# Quick Start: Whitelist Vaults

## TL;DR - What You Need To Do

Your contract is deployed at `0x916855dB77F2d5b63e8EF3472d6e7Df9fc6ccd79` ✅

**NOW**: Whitelist the GlueX vaults so your optimizer can use them.

### Fastest Way (One Command):

```bash
cd /Users/hemangvora/Documents/OpenSource/hyperliquid-hackathon-ba-25/submissions/BIS/contracts

# Set your private key (the one you used to deploy)
export PRIVATE_KEY=your_private_key_here

# Run the whitelist script
./whitelist_vaults_manual.sh
```

That's it! This will:

1. Whitelist all 5 GlueX vaults
2. Verify they were added correctly
3. Show you the status

## What Was the Problem?

Your backend was getting this error:

```
web3.exceptions.ContractLogicError: execution reverted
```

**Root Cause**: The backend was calling `getWhitelistedVaults()` which doesn't exist in YieldOptimizerMinimal.

**What I Fixed**:

- ✅ Updated `backend/yield_optimizer.py` to use `getAllocations()[0]`
- ✅ Updated `backend/app.py` (3 places) to use `getAllocations()[0]`
- ✅ Created automated whitelist scripts
- ✅ Fixed RPC URL (was using testnet, needed mainnet)

## After Whitelisting

1. **Restart your backend**:

```bash
cd ../backend
python app.py
```

2. **It should now work!** No more "execution reverted" errors.

## If You Want Details

See `WHITELIST_SETUP_GUIDE.md` for:

- Detailed explanations
- Manual commands
- Troubleshooting
- Contract function reference

---

**Need Help?** All the scripts are ready to go in the `contracts/` directory:

- `whitelist_vaults_manual.sh` - Simple cast commands (recommended)
- `configure_minimal_vaults.sh` - Forge script approach
- `ConfigureMinimalVaults.s.sol` - Solidity script
