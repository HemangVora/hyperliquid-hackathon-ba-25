#!/bin/bash

# Deploy YieldOptimizer in Multiple Steps
# This script splits deployment to avoid gas limit issues

set -e  # Exit on error

echo "=================================="
echo "BIS Yield Optimizer Deployment"
echo "=================================="
echo ""

# Check environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY not set"
    exit 1
fi

# Set RPC URL
RPC_URL="https://rpc.hyperliquid.xyz/evm"
echo "Using RPC: $RPC_URL"
echo ""

# Step 1: Deploy Contract
echo "Step 1: Deploying YieldOptimizerSimple contract..."
echo "This will deploy the contract without any vault configuration"
echo ""

forge script DeployYieldOptimizer \
    --rpc-url $RPC_URL \
    --broadcast \
    --slow \
    --legacy \
    --skip '*/certora/*' --skip '*/test/*' --skip '*/mocks/*' --skip '*/draft-*' --skip '*/signers/*' --skip '*/RLP.sol'

echo ""
echo "Contract deployed successfully!"
echo ""

# Extract deployed address from broadcast
DEPLOYED_ADDRESS=$(jq -r '.transactions[0].contractAddress' broadcast/DeployYieldOptimizer.s.sol/999/run-latest.json)

if [ -z "$DEPLOYED_ADDRESS" ] || [ "$DEPLOYED_ADDRESS" == "null" ]; then
    echo "Error: Could not find deployed contract address"
    echo "Check broadcast/DeployYieldOptimizer.s.sol/999/run-latest.json"
    exit 1
fi

echo "Deployed Contract Address: $DEPLOYED_ADDRESS"
echo ""

# Save address for next steps
export VAULT_ADDRESS=$DEPLOYED_ADDRESS

# Wait for block confirmation
echo "Waiting 10 seconds for block confirmation..."
sleep 10

# Step 2: Configure Vaults
echo ""
echo "Step 2: Whitelisting vaults..."
echo ""

forge script ConfigureVaults \
    --rpc-url $RPC_URL \
    --broadcast \
    --slow \
    --legacy \
    --skip '*/certora/*' --skip '*/test/*' --skip '*/mocks/*' --skip '*/draft-*' --skip '*/signers/*' --skip '*/RLP.sol'

echo ""
echo "Vaults whitelisted successfully!"
echo ""

# Step 3: Set Performance Fee
echo "Step 3: Setting performance fee (2%)..."
echo ""

cast send $VAULT_ADDRESS \
    "setPerformanceFee(uint256)" \
    200 \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --legacy

echo "Performance fee set successfully!"
echo ""

# Step 4: Set Rebalance Delay
echo "Step 4: Setting rebalance delay (1 hour)..."
echo ""

cast send $VAULT_ADDRESS \
    "setRebalanceDelay(uint256)" \
    3600 \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --legacy

echo "Rebalance delay set successfully!"
echo ""

# Step 5: Set Operator
echo "Step 5: Setting operator..."
OPERATOR_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)
echo "Using deployer as operator: $OPERATOR_ADDRESS"
echo ""

cast send $VAULT_ADDRESS \
    "setOperator(address)" \
    $OPERATOR_ADDRESS \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC_URL \
    --legacy

echo "Operator set successfully!"
echo ""

# Final Summary
echo "=================================="
echo "Deployment Complete!"
echo "=================================="
echo ""
echo "Contract Address: $VAULT_ADDRESS"
echo "Owner: $OPERATOR_ADDRESS"
echo "Operator: $OPERATOR_ADDRESS"
echo "Performance Fee: 2%"
echo "Rebalance Delay: 1 hour"
echo ""
echo "Next Steps:"
echo "1. Update backend/.env with VAULT_ADDRESS=$VAULT_ADDRESS"
echo "2. Test deposit: cast send $VAULT_ADDRESS \"deposit(uint256)\" AMOUNT --private-key \$PRIVATE_KEY --rpc-url $RPC_URL"
echo "3. Start backend service: cd ../backend && python yield_optimizer.py"
echo ""

