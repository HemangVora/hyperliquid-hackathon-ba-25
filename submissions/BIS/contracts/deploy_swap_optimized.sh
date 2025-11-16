#!/bin/bash

# Optimized Deploy Script for YieldOptimizerWithSwap
# Handles gas limit issues by deploying in smaller transactions
#
# Problem: Block gas limit on HyperEVM can cause deployment to fail
# Solution: Split deployment into multiple smaller transactions

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   YieldOptimizerWithSwap - Gas-Optimized Deployment      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set"
    echo "   Please set: export PRIVATE_KEY=your_key_here"
    exit 1
fi

# Configuration
export ASSET_ADDRESS=${ASSET_ADDRESS:-"0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb"}
export GLUEX_ROUTER_ADDRESS=${GLUEX_ROUTER_ADDRESS:-"0xe95F6EAeaE1E4d650576Af600b33D9F7e5f9f7fd"}
RPC_URL="https://rpc.hyperliquid.xyz/evm"
CHAIN_ID=999

echo "📋 Configuration:"
echo "   RPC URL: $RPC_URL"
echo "   Asset (USDC): $ASSET_ADDRESS"
echo "   GlueX Router: $GLUEX_ROUTER_ADDRESS"
echo ""

# Step 1: Deploy contract only (minimal gas)
echo "════════════════════════════════════════════════════════════"
echo "STEP 1/4: Deploying Contract (minimal gas)"
echo "════════════════════════════════════════════════════════════"
echo ""

forge script DeployYieldOptimizerWithSwap_Split \
    --rpc-url $RPC_URL \
    --broadcast \
    --slow \
    --legacy \
    --gas-limit 5000000 \
    --skip '*/certora/*' --skip '*/test/*' --skip '*/mocks/*' --skip '*/draft-*' --skip '*/signers/*' --skip '*/RLP.sol'

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

# Extract deployed address
BROADCAST_FILE="broadcast/DeployYieldOptimizerWithSwap_Split.s.sol/$CHAIN_ID/run-latest.json"

if [ ! -f "$BROADCAST_FILE" ]; then
    echo "❌ Error: Broadcast file not found at $BROADCAST_FILE"
    exit 1
fi

VAULT_ADDRESS=$(jq -r '.transactions[0].contractAddress' "$BROADCAST_FILE")

if [ -z "$VAULT_ADDRESS" ] || [ "$VAULT_ADDRESS" == "null" ]; then
    echo "❌ Error: Could not find deployed contract address"
    echo "   Check: $BROADCAST_FILE"
    exit 1
fi

echo ""
echo "✅ Contract deployed at: $VAULT_ADDRESS"
echo ""

# Export for next steps
export VAULT_ADDRESS=$VAULT_ADDRESS

# Wait for confirmation
echo "⏳ Waiting 10 seconds for block confirmation..."
sleep 10

# Step 2: Whitelist vaults in batch
echo ""
echo "════════════════════════════════════════════════════════════"
echo "STEP 2/4: Whitelisting GlueX Vaults (batch)"
echo "════════════════════════════════════════════════════════════"
echo ""

forge script ConfigureYieldOptimizerWithSwap \
    --rpc-url $RPC_URL \
    --broadcast \
    --slow \
    --legacy \
    --gas-limit 3000000 \
    --skip '*/certora/*' --skip '*/test/*' --skip '*/mocks/*' --skip '*/draft-*' --skip '*/signers/*' --skip '*/RLP.sol'

if [ $? -ne 0 ]; then
    echo "⚠️  Batch whitelist failed - will try individual whitelisting"
    
    # Fallback: Whitelist individually
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo "STEP 2b/4: Whitelisting vaults individually (fallback)"
    echo "════════════════════════════════════════════════════════════"
    echo ""
    
    VAULTS=(
        "0xE25514992597786E07872e6C5517FE1906C0CAdD"
        "0xCdc3975df9D1cf054F44ED238Edfb708880292EA"
        "0x8F9291606862eEf771a97e5B71e4B98fd1Fa216a"
        "0x9f75Eac57d1c6F7248bd2AEDe58C95689f3827f7"
        "0x63Cf7EE583d9954FeBF649aD1c40C97a6493b1Be"
    )
    
    for vault in "${VAULTS[@]}"; do
        echo "   Whitelisting $vault..."
        cast send $VAULT_ADDRESS \
            "setVaultWhitelist(address,bool)" \
            $vault \
            true \
            --private-key $PRIVATE_KEY \
            --rpc-url $RPC_URL \
            --legacy \
            --gas-limit 100000
        
        if [ $? -eq 0 ]; then
            echo "      ✓ Success"
        else
            echo "      ✗ Failed (continuing...)"
        fi
        sleep 2
    done
fi

# Wait for confirmation
echo ""
echo "⏳ Waiting 5 seconds..."
sleep 5

# Step 3: Set operator (if provided)
echo ""
echo "════════════════════════════════════════════════════════════"
echo "STEP 3/4: Setting Operator"
echo "════════════════════════════════════════════════════════════"
echo ""

OPERATOR_ADDRESS=${OPERATOR_ADDRESS:-$(cast wallet address --private-key $PRIVATE_KEY)}
echo "   Operator: $OPERATOR_ADDRESS"

cast send $VAULT_ADDRESS \
    "setOperator(address)" \
    $OPERATOR_ADDRESS \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --legacy \
    --gas-limit 100000

if [ $? -eq 0 ]; then
    echo "   ✓ Operator set"
else
    echo "   ⚠️  Failed to set operator (not critical)"
fi

sleep 3

# Step 4: Set slippage tolerance
echo ""
echo "════════════════════════════════════════════════════════════"
echo "STEP 4/4: Configuring Slippage"
echo "════════════════════════════════════════════════════════════"
echo ""

cast send $VAULT_ADDRESS \
    "setDefaultSlippage(uint256)" \
    50 \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --legacy \
    --gas-limit 100000

if [ $? -eq 0 ]; then
    echo "   ✓ Slippage set to 0.5% (50 bps)"
else
    echo "   ⚠️  Failed to set slippage (not critical)"
fi

# Summary
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  ✅ DEPLOYMENT COMPLETE!                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📍 Contract Address: $VAULT_ADDRESS"
echo ""
echo "📊 Contract Status:"
cast call $VAULT_ADDRESS "asset()(address)" --rpc-url $RPC_URL | xargs -I {} echo "   Asset: {}"
cast call $VAULT_ADDRESS "glueXRouter()(address)" --rpc-url $RPC_URL | xargs -I {} echo "   Router: {}"
cast call $VAULT_ADDRESS "operator()(address)" --rpc-url $RPC_URL | xargs -I {} echo "   Operator: {}"
cast call $VAULT_ADDRESS "defaultSlippageBps()(uint256)" --rpc-url $RPC_URL | xargs -I {} echo "   Slippage: {} bps"
echo ""

# Get whitelisted vaults count
VAULT_COUNT=$(cast call $VAULT_ADDRESS "vaultList()(address[])" --rpc-url $RPC_URL | grep -o "0x" | wc -l)
echo "   Whitelisted Vaults: $VAULT_COUNT"
echo ""

# Save address to file
echo $VAULT_ADDRESS > .deployed_swap_address
echo "💾 Address saved to: .deployed_swap_address"
echo ""

# Update .env if it exists
if [ -f "../backend/.env" ]; then
    if grep -q "^VAULT_ADDRESS=" ../backend/.env; then
        sed -i.bak "s|^VAULT_ADDRESS=.*|VAULT_ADDRESS=$VAULT_ADDRESS|" ../backend/.env
        echo "📝 Updated VAULT_ADDRESS in backend/.env"
    else
        echo "VAULT_ADDRESS=$VAULT_ADDRESS" >> ../backend/.env
        echo "📝 Added VAULT_ADDRESS to backend/.env"
    fi
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "NEXT STEPS"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "1️⃣  Test the deployment:"
echo "   ./test_swap_deployment.sh"
echo ""
echo "2️⃣  Deposit USDC to test:"
echo "   # Approve"
echo "   cast send $ASSET_ADDRESS \\"
echo "     \"approve(address,uint256)\" \\"
echo "     $VAULT_ADDRESS \\"
echo "     10000000 \\"
echo "     --private-key \$PRIVATE_KEY \\"
echo "     --rpc-url $RPC_URL \\"
echo "     --legacy"
echo ""
echo "   # Deposit"
echo "   cast send $VAULT_ADDRESS \\"
echo "     \"requestDeposit(uint256)\" \\"
echo "     10000000 \\"
echo "     --private-key \$PRIVATE_KEY \\"
echo "     --rpc-url $RPC_URL \\"
echo "     --legacy"
echo ""
echo "3️⃣  Start the backend optimizer:"
echo "   cd ../backend"
echo "   python yield_optimizer.py"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

