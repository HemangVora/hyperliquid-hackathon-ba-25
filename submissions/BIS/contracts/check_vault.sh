#!/bin/bash

# Check vault state
echo "=== Checking Vault State ==="
echo ""

VAULT_ADDR=${1:-$VAULT_ADDRESS}
RPC_URL=${2:-$HYPERLIQUID_RPC_URL}

if [ -z "$VAULT_ADDR" ]; then
    echo "Error: Please provide VAULT_ADDRESS as first argument or set \$VAULT_ADDRESS"
    exit 1
fi

if [ -z "$RPC_URL" ]; then
    echo "Error: Please provide RPC URL as second argument or set \$HYPERLIQUID_RPC_URL"
    exit 1
fi

echo "Vault Address: $VAULT_ADDR"
echo ""

# Check if it's YieldOptimizer (has requestDeposit) or YieldOptimizerMini (has deposit)
echo "1. Checking contract type..."
if cast call $VAULT_ADDR "currentEpoch()(uint256)" --rpc-url $RPC_URL 2>/dev/null; then
    echo "   ✓ This is YieldOptimizer (full version)"
    CONTRACT_TYPE="full"
else
    echo "   ✓ This is YieldOptimizerMini"
    CONTRACT_TYPE="mini"
fi
echo ""

# Check total shares
echo "2. Checking totalShares..."
TOTAL_SHARES=$(cast call $VAULT_ADDR "totalShares()(uint256)" --rpc-url $RPC_URL 2>/dev/null)
echo "   totalShares = $TOTAL_SHARES"
echo ""

# Check total assets
echo "3. Checking getTotalAssets..."
TOTAL_ASSETS=$(cast call $VAULT_ADDR "getTotalAssets()(uint256)" --rpc-url $RPC_URL 2>/dev/null)
echo "   totalAssets = $TOTAL_ASSETS"
echo ""

# Check asset address
echo "4. Checking configured asset..."
ASSET=$(cast call $VAULT_ADDR "asset()(address)" --rpc-url $RPC_URL 2>/dev/null)
echo "   asset = $ASSET"
echo ""

# Diagnose issue
echo "=== Diagnosis ==="
if [ "$TOTAL_SHARES" != "0" ] && [ "$TOTAL_ASSETS" = "0" ]; then
    echo "❌ CRITICAL BUG DETECTED: Division by zero!"
    echo "   - totalShares > 0 but totalAssets = 0"
    echo "   - This causes deposit() to revert on: (amount * totalShares) / 0"
    echo ""
    echo "   Solutions:"
    echo "   1. Redeploy a new contract"
    echo "   2. If YieldOptimizerMini, switch to full YieldOptimizer"
    echo "   3. Emergency withdraw any remaining assets"
elif [ "$TOTAL_SHARES" = "0" ]; then
    echo "✓ Fresh contract - first deposit should work"
    echo "  Make sure:"
    echo "  1. You have approved the vault to spend your tokens"
    echo "  2. You have sufficient balance"
    echo "  3. The asset address matches your token"
else
    echo "✓ Contract appears healthy"
    echo "  totalShares = $TOTAL_SHARES"
    echo "  totalAssets = $TOTAL_ASSETS"
fi

