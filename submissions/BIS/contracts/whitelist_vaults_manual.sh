#!/bin/bash

# Manual vault whitelisting script using cast send commands
# This is a simpler alternative to the forge script approach

set -e

OPTIMIZER_ADDRESS="0x916855dB77F2d5b63e8EF3472d6e7Df9fc6ccd79"
RPC_URL="https://rpc.hyperliquid.xyz/evm"

# GlueX Vault addresses
VAULTS=(
    "0xE25514992597786E07872e6C5517FE1906C0CAdD"
    "0xCdc3975df9D1cf054F44ED238Edfb708880292EA"
    "0x8F9291606862eEf771a97e5B71e4B98fd1Fa216a"
    "0x9f75Eac57d1c6F7248bd2AEDe58C95689f3827f7"
    "0x63Cf7EE583d9954FeBF649aD1c40C97a6493b1Be"
)

echo "=========================================="
echo "Manual Vault Whitelisting"
echo "=========================================="
echo "Optimizer: $OPTIMIZER_ADDRESS"
echo "Network: Hyperliquid Mainnet"
echo ""

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set"
    echo ""
    echo "Please set it with:"
    echo "  export PRIVATE_KEY=your_private_key"
    echo ""
    echo "Or run individual commands manually:"
    echo ""
    for vault in "${VAULTS[@]}"; do
        echo "cast send $OPTIMIZER_ADDRESS 'whitelistVault(address,bool)' $vault true \\"
        echo "  --rpc-url $RPC_URL --private-key \$PRIVATE_KEY --legacy"
        echo ""
    done
    exit 1
fi

echo "✅ Private key found"
echo ""
echo "Whitelisting vaults..."
echo ""

# Whitelist each vault
for i in "${!VAULTS[@]}"; do
    vault="${VAULTS[$i]}"
    echo "[$((i+1))/${#VAULTS[@]}] Whitelisting: $vault"
    
    cast send "$OPTIMIZER_ADDRESS" \
        "whitelistVault(address,bool)" \
        "$vault" true \
        --rpc-url "$RPC_URL" \
        --private-key "$PRIVATE_KEY" \
        --legacy \
        --gas-limit 100000
    
    if [ $? -eq 0 ]; then
        echo "    ✅ Success"
    else
        echo "    ❌ Failed"
    fi
    echo ""
done

echo "=========================================="
echo "Verification"
echo "=========================================="
echo ""

# Verify each vault
for i in "${!VAULTS[@]}"; do
    vault="${VAULTS[$i]}"
    echo -n "Vault $((i+1)): "
    
    result=$(cast call "$OPTIMIZER_ADDRESS" \
        "whitelistedVaults(address)(bool)" \
        "$vault" \
        --rpc-url "$RPC_URL")
    
    if [ "$result" = "true" ]; then
        echo "✅ WHITELISTED"
    else
        echo "❌ NOT WHITELISTED"
    fi
done

echo ""
echo "✅ Whitelist configuration complete!"

