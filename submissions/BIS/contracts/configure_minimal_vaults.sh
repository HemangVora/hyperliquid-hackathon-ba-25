#!/bin/bash

# Configuration script for YieldOptimizerMinimal vault whitelisting
# This script whitelists GlueX vaults on the deployed YieldOptimizerMinimal contract

set -e

echo "=========================================="
echo "YieldOptimizerMinimal Vault Configuration"
echo "=========================================="
echo ""

# Contract address
OPTIMIZER_ADDRESS="0x916855dB77F2d5b63e8EF3472d6e7Df9fc6ccd79"

# RPC URL for Hyperliquid mainnet
RPC_URL="https://rpc.hyperliquid.xyz/evm"

echo "Optimizer Address: $OPTIMIZER_ADDRESS"
echo "Network: Hyperliquid Mainnet (Chain ID: 999)"
echo ""

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY environment variable not set"
    echo "Please set it with: export PRIVATE_KEY=your_private_key"
    exit 1
fi

echo "✅ Private key found"
echo ""

# Load environment variables from .env if it exists
if [ -f .env ]; then
    echo "📝 Loading .env file..."
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "🚀 Starting vault configuration..."
echo ""

# Run the configuration script
forge script ConfigureMinimalVaults \
    --rpc-url "https://rpc.hyperliquid.xyz/evm" \
    --broadcast \
    --legacy \
    -vvv

echo ""
echo "=========================================="
echo "✅ Configuration Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Verify the vaults are whitelisted on the explorer:"
echo "   https://hyperevmscan.io/address/$OPTIMIZER_ADDRESS"
echo ""
echo "2. Set the operator address if needed:"
echo "   cast send $OPTIMIZER_ADDRESS 'setOperator(address)' <operator_address> --rpc-url $RPC_URL --private-key \$PRIVATE_KEY --legacy"
echo ""
echo "3. The contract is now ready to accept deposits and perform rebalancing!"

