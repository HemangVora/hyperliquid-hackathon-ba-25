#!/bin/bash

# Two-Step Deploy Script for YieldOptimizerWithSwap
# Step 1: Deploy contract only
# Step 2: Configure (whitelist vaults, set parameters)

set -e

echo "=========================================="
echo "YieldOptimizer with Swap - Two-Step Deploy"
echo "=========================================="
echo ""

# Check environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set"
    echo "   Please set: export PRIVATE_KEY=your_key_here"
    exit 1
fi

# Set addresses
export ASSET_ADDRESS=${ASSET_ADDRESS:-"0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb"}
export GLUEX_ROUTER_ADDRESS=${GLUEX_ROUTER_ADDRESS:-"0xe95F6EAeaE1E4d650576Af600b33D9F7e5f9f7fd"}
RPC_URL="https://rpc.hyperliquid.xyz/evm"
VERIFIER_URL=${VERIFIER_URL:-"https://explorer.hyperliquid.xyz/api"}

echo "Configuration:"
echo "  RPC URL: $RPC_URL"
echo "  Asset (USDC): $ASSET_ADDRESS"
echo "  GlueX Router: $GLUEX_ROUTER_ADDRESS"
echo ""

# STEP 1: Deploy contract only
echo "=========================================="
echo "STEP 1: Deploying Contract"
echo "=========================================="
echo ""

forge script DeployYieldOptimizerWithSwap_Split \
    --rpc-url $RPC_URL \
    --broadcast \
    --slow \
    --legacy \
    --skip '*/certora/*' --skip '*/test/*' --skip '*/mocks/*' --skip '*/draft-*' --skip '*/signers/*' --skip '*/RLP.sol'

# Extract deployed address
VAULT_ADDRESS=$(jq -r '.transactions[0].contractAddress' broadcast/DeployYieldOptimizerWithSwap_Split.s.sol/999/run-latest.json)

if [ -z "$VAULT_ADDRESS" ] || [ "$VAULT_ADDRESS" == "null" ]; then
    echo "❌ Error: Could not find deployed contract address"
    exit 1
fi

echo ""
echo "✅ Contract deployed at: $VAULT_ADDRESS"
echo ""

# Export for next step
export VAULT_ADDRESS=$VAULT_ADDRESS

# Wait for confirmation
echo "Waiting 5 seconds for block confirmation..."
sleep 5

# STEP 2: Configure contract
echo ""
echo "=========================================="
echo "STEP 2: Configuring Contract"
echo "=========================================="
echo ""

forge script ConfigureYieldOptimizerWithSwap \
    --rpc-url $RPC_URL \
    --broadcast \
    --slow \
    --legacy \
    --skip '*/certora/*' --skip '*/test/*' --skip '*/mocks/*' --skip '*/draft-*' --skip '*/signers/*' --skip '*/RLP.sol'

echo ""
echo "=========================================="
echo "✅ Deployment & Configuration Complete!"
echo "=========================================="
echo ""
echo "Contract Address: $VAULT_ADDRESS"
echo ""

# Verification command
echo "To verify the contract:"
echo ""
echo "forge verify-contract \\"
echo "  $VAULT_ADDRESS \\"
echo "  YieldOptimizerWithSwap \\"
echo "  --constructor-args \$(cast abi-encode \"constructor(address,address,string,string)\" \"$ASSET_ADDRESS\" \"$GLUEX_ROUTER_ADDRESS\" \"BIS Yield Optimizer V2\" \"BIS-YO-V2\") \\"
echo "  --verifier-url $VERIFIER_URL \\"
echo "  --rpc-url $RPC_URL \\"
echo "  --legacy"
echo ""

echo "Next steps:"
echo ""
echo "1. Update backend/.env:"
echo "   VAULT_ADDRESS=$VAULT_ADDRESS"
echo ""
echo "2. Approve and deposit USDC:"
echo "   cast send $ASSET_ADDRESS \"approve(address,uint256)\" $VAULT_ADDRESS 10000000 --private-key \$PRIVATE_KEY --rpc-url $RPC_URL --legacy"
echo "   cast send $VAULT_ADDRESS \"requestDeposit(uint256)\" 10000000 --private-key \$PRIVATE_KEY --rpc-url $RPC_URL --legacy"
echo "   cast send $VAULT_ADDRESS \"claimDeposit()\" --private-key \$PRIVATE_KEY --rpc-url $RPC_URL --legacy"
echo ""
echo "3. Test rebalance with auto-swap (allocate to 2 vaults with different tokens):"
echo "   cast send $VAULT_ADDRESS \"rebalance(address[],uint256[])\" \"[0xCdc3975df9D1cf054F44ED238Edfb708880292EA,0x63Cf7EE583d9954FeBF649aD1c40C97a6493b1Be]\" \"[5000000,5000000]\" --private-key \$PRIVATE_KEY --rpc-url $RPC_URL --legacy --gas-limit 3000000"
echo ""

