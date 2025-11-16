#!/bin/bash

# Test Script for YieldOptimizerWithSwap Deployment
# Verifies contract is correctly deployed and configured

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Testing YieldOptimizerWithSwap Deployment        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Get contract address
if [ -f ".deployed_swap_address" ]; then
    VAULT_ADDRESS=$(cat .deployed_swap_address)
    echo "📍 Testing contract at: $VAULT_ADDRESS"
elif [ -n "$VAULT_ADDRESS" ]; then
    echo "📍 Testing contract at: $VAULT_ADDRESS"
else
    echo "❌ Error: VAULT_ADDRESS not set"
    echo "   Please run: export VAULT_ADDRESS=your_contract_address"
    exit 1
fi

RPC_URL="https://rpc.hyperliquid.xyz/evm"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Test 1: Contract Existence"
echo "════════════════════════════════════════════════════════════"

CODE=$(cast code $VAULT_ADDRESS --rpc-url $RPC_URL)
if [ ${#CODE} -gt 4 ]; then
    echo "✅ Contract deployed (code size: ${#CODE} bytes)"
else
    echo "❌ No contract code found at address"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Test 2: Core Configuration"
echo "════════════════════════════════════════════════════════════"

# Check asset
ASSET=$(cast call $VAULT_ADDRESS "asset()(address)" --rpc-url $RPC_URL)
echo "Asset (USDC):      $ASSET"
if [ "$ASSET" == "0x0000000000000000000000000000000000000000" ]; then
    echo "❌ Asset not set properly"
    exit 1
fi

# Check router
ROUTER=$(cast call $VAULT_ADDRESS "glueXRouter()(address)" --rpc-url $RPC_URL)
echo "GlueX Router:      $ROUTER"
if [ "$ROUTER" == "0x0000000000000000000000000000000000000000" ]; then
    echo "❌ Router not set properly"
    exit 1
fi

# Check operator
OPERATOR=$(cast call $VAULT_ADDRESS "operator()(address)" --rpc-url $RPC_URL)
echo "Operator:          $OPERATOR"

# Check owner
OWNER=$(cast call $VAULT_ADDRESS "owner()(address)" --rpc-url $RPC_URL)
echo "Owner:             $OWNER"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Test 3: Parameters"
echo "════════════════════════════════════════════════════════════"

SLIPPAGE=$(cast call $VAULT_ADDRESS "defaultSlippageBps()(uint256)" --rpc-url $RPC_URL)
SLIPPAGE_DEC=$(printf "%d" $SLIPPAGE)
SLIPPAGE_PCT=$(echo "scale=2; $SLIPPAGE_DEC / 100" | bc)
echo "Default Slippage:  $SLIPPAGE_DEC bps ($SLIPPAGE_PCT%)"

PERF_FEE=$(cast call $VAULT_ADDRESS "performanceFee()(uint256)" --rpc-url $RPC_URL)
PERF_FEE_DEC=$(printf "%d" $PERF_FEE)
PERF_FEE_PCT=$(echo "scale=2; $PERF_FEE_DEC / 100" | bc)
echo "Performance Fee:   $PERF_FEE_DEC bps ($PERF_FEE_PCT%)"

REBAL_DELAY=$(cast call $VAULT_ADDRESS "rebalanceDelay()(uint256)" --rpc-url $RPC_URL)
REBAL_DELAY_DEC=$(printf "%d" $REBAL_DELAY)
REBAL_HOURS=$(echo "scale=2; $REBAL_DELAY_DEC / 3600" | bc)
echo "Rebalance Delay:   $REBAL_DELAY_DEC seconds ($REBAL_HOURS hours)"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Test 4: Whitelisted Vaults"
echo "════════════════════════════════════════════════════════════"

# GlueX vault addresses
VAULTS=(
    "0xE25514992597786E07872e6C5517FE1906C0CAdD"
    "0xCdc3975df9D1cf054F44ED238Edfb708880292EA"
    "0x8F9291606862eEf771a97e5B71e4B98fd1Fa216a"
    "0x9f75Eac57d1c6F7248bd2AEDe58C95689f3827f7"
    "0x63Cf7EE583d9954FeBF649aD1c40C97a6493b1Be"
)

WHITELISTED_COUNT=0

for vault in "${VAULTS[@]}"; do
    IS_WHITELISTED=$(cast call $VAULT_ADDRESS "whitelistedVaults(address)(bool)" $vault --rpc-url $RPC_URL)
    if [ "$IS_WHITELISTED" == "true" ]; then
        echo "✅ ${vault:0:10}... whitelisted"
        WHITELISTED_COUNT=$((WHITELISTED_COUNT + 1))
    else
        echo "⚠️  ${vault:0:10}... NOT whitelisted"
    fi
done

echo ""
echo "Total Whitelisted: $WHITELISTED_COUNT / ${#VAULTS[@]}"

if [ $WHITELISTED_COUNT -eq 0 ]; then
    echo "❌ No vaults whitelisted! Contract cannot operate."
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Test 5: ERC-20 Functions"
echo "════════════════════════════════════════════════════════════"

NAME=$(cast call $VAULT_ADDRESS "name()(string)" --rpc-url $RPC_URL)
echo "Name:              $NAME"

SYMBOL=$(cast call $VAULT_ADDRESS "symbol()(string)" --rpc-url $RPC_URL)
echo "Symbol:            $SYMBOL"

DECIMALS=$(cast call $VAULT_ADDRESS "decimals()(uint8)" --rpc-url $RPC_URL)
echo "Decimals:          $DECIMALS"

TOTAL_SUPPLY=$(cast call $VAULT_ADDRESS "totalSupply()(uint256)" --rpc-url $RPC_URL)
TOTAL_SUPPLY_DEC=$(printf "%d" $TOTAL_SUPPLY)
echo "Total Supply:      $TOTAL_SUPPLY_DEC"

TOTAL_ASSETS=$(cast call $VAULT_ADDRESS "totalAssets()(uint256)" --rpc-url $RPC_URL)
TOTAL_ASSETS_DEC=$(printf "%d" $TOTAL_ASSETS)
TOTAL_ASSETS_USD=$(echo "scale=2; $TOTAL_ASSETS_DEC / 1000000" | bc)
echo "Total Assets:      $TOTAL_ASSETS_DEC ($TOTAL_ASSETS_USD USDC)"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Test 6: Router Integration"
echo "════════════════════════════════════════════════════════════"

# Check if Router is a valid contract
ROUTER_CODE=$(cast code $ROUTER --rpc-url $RPC_URL)
if [ ${#ROUTER_CODE} -gt 4 ]; then
    echo "✅ GlueX Router contract exists (code size: ${#ROUTER_CODE} bytes)"
else
    echo "⚠️  GlueX Router address has no code - may not be deployed"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "SUMMARY"
echo "════════════════════════════════════════════════════════════"
echo ""

if [ $WHITELISTED_COUNT -gt 0 ]; then
    echo "✅ Contract deployed successfully!"
    echo "✅ $WHITELISTED_COUNT vaults whitelisted"
    echo "✅ Router integration configured"
    echo ""
    echo "Ready to use! Next steps:"
    echo ""
    echo "1. Update backend/.env with:"
    echo "   VAULT_ADDRESS=$VAULT_ADDRESS"
    echo ""
    echo "2. Test deposit (replace \$PRIVATE_KEY):"
    echo "   cast send $ASSET \\"
    echo "     \"approve(address,uint256)\" \\"
    echo "     $VAULT_ADDRESS 10000000 \\"
    echo "     --private-key \$PRIVATE_KEY \\"
    echo "     --rpc-url $RPC_URL --legacy"
    echo ""
    echo "3. Start backend:"
    echo "   cd ../backend && python yield_optimizer.py"
    echo ""
else
    echo "⚠️  Warning: No vaults whitelisted"
    echo ""
    echo "Run configuration script:"
    echo "   export VAULT_ADDRESS=$VAULT_ADDRESS"
    echo "   forge script ConfigureYieldOptimizerWithSwap \\"
    echo "     --rpc-url $RPC_URL \\"
    echo "     --broadcast --slow --legacy"
    echo ""
fi

echo "════════════════════════════════════════════════════════════"
echo ""

