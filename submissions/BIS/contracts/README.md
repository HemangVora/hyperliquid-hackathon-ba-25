# BIS Yield Optimizer - Smart Contracts

## Overview

The BIS Yield Optimizer is a smart contract system that automatically optimizes yield across multiple lending protocols on HyperEVM. It uses GlueX's Yields API to identify the best opportunities and reallocates capital accordingly.

## Architecture

### Core Components

1. **YieldOptimizerSimple.sol** - Main vault contract (recommended for ease of use)

   - Instant deposits and withdrawals
   - Automated yield optimization
   - Performance fee mechanism
   - Multi-vault allocation

2. **YieldOptimizer.sol** - Advanced vault with ERC-7540 async pattern

   - Batch processing for gas efficiency
   - Request/claim pattern for deposits/withdrawals
   - Better for high-volume operations

3. **IVault.sol** - Interface for ERC-4626 vaults (including GlueX vaults)

4. **IGlueXRouter.sol** - Interface for GlueX Router API integration

## How It Works

```
┌─────────────┐
│   Users     │
└──────┬──────┘
       │ 1. Deposit USDC
       ▼
┌─────────────────────┐
│  Yield Optimizer    │
│   (Smart Contract)  │
└──────┬──────────────┘
       │
       │ 2. Operator queries GlueX Yields API (off-chain)
       │    to find highest APY opportunities
       │
       │ 3. Operator calls rebalance() with target allocations
       │
       ▼
┌────────────────────────────────────────┐
│  Whitelisted Vaults (GlueX & Others)   │
│  ┌──────┐  ┌──────┐  ┌──────┐         │
│  │Vault1│  │Vault2│  │Vault3│ ...     │
│  └──────┘  └──────┘  └──────┘         │
└────────────────────────────────────────┘
       │
       │ 4. Assets earn yield in best opportunities
       │
       ▼
┌─────────────────────┐
│  Users receive      │
│  proportional share │
│  of yield (via      │
│  vault tokens)      │
└─────────────────────┘
```

## Key Features

### 1. **Whitelist System**

Only approved vaults can receive allocations, ensuring security:

```solidity
function setVaultWhitelist(address vault, bool status) external onlyOwner
```

### 2. **Automated Rebalancing**

Operator (bot) calls rebalance based on GlueX Yields API data:

```solidity
function rebalance(
    address[] calldata targetVaults,
    uint256[] calldata targetAmounts
) external onlyOperator
```

### 3. **Performance Fees**

Vault collects a percentage of profits (default 2%):

```solidity
function setPerformanceFee(uint256 _fee) external onlyOwner
```

### 4. **Emergency Controls**

Owner can emergency withdraw from any vault:

```solidity
function emergencyWithdraw(address vault) external onlyOwner
```

## Deployment

### Prerequisites

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts
```

### Configuration

1. Set environment variables:

```bash
export PRIVATE_KEY=your_private_key
export HYPERLIQUID_RPC_URL=https://rpc.hyperliquid.xyz/evm
export ASSET_ADDRESS=0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb # USDC/USDT address on HyperEVM Mainnet
export GLUEX_ROUTER_ADDRESS=0xe95F6EAeaE1E4d650576Af600b33D9F7e5f9f7fd # GlueX router on HyperEVM (ask GlueX)
# Optional – set if operator address differs from deployer
export OPERATOR_ADDRESS=0xYourBotAddress
```

2. Update `DeployYieldOptimizer.s.sol` with correct asset address

### Deploy

```bash
# Deploy the full YieldOptimizer (ERC-7540)
forge script DeployYieldOptimizer --rpc-url $HYPERLIQUID_RPC_URL --broadcast

# Verify contract (optional)
forge verify-contract <address> YieldOptimizer --chain hyperliquid
```

## Usage

### For Users

**Deposit:**

```solidity
// Approve USDC to vault
IERC20(usdc).approve(vaultAddress, amount);

// Deposit and receive vault shares
uint256 shares = optimizer.deposit(amount);
```

**Withdraw:**

```solidity
// Withdraw by burning vault shares
uint256 assets = optimizer.withdraw(shares);
```

**Check Balance:**

```solidity
// Get vault share balance
uint256 shares = optimizer.balanceOf(userAddress);

// Convert to underlying asset value
uint256 assetValue = optimizer.convertToAssets(shares);
```

### For Operators

**Rebalance:**

```solidity
// 1. Query GlueX Yields API off-chain to get best vaults
// 2. Call rebalance with allocation targets
address[] memory vaults = [vault1, vault2, vault3];
uint256[] memory amounts = [1000e6, 2000e6, 1500e6]; // USDC has 6 decimals

optimizer.rebalance(vaults, amounts);
```

## GlueX Integration

### GlueX Vaults (Pre-whitelisted)

The following GlueX vaults are automatically whitelisted during deployment:

```
0xe25514992597786e07872e6c5517fe1906c0cadd
0xcdc3975df9d1cf054f44ed238edfb708880292ea
0x8f9291606862eef771a97e5b71e4b98fd1fa216a
0x9f75eac57d1c6f7248bd2aede58c95689f3827f7
0x63cf7ee583d9954febf649ad1c40c97a6493b1be
```

### Using GlueX APIs

**Yields API (Off-chain):**

```python
import requests

# Get credentials from https://portal.gluex.xyz
response = requests.post(
    "https://api.gluex.xyz/yields/historical-apy",
    headers={"Authorization": f"Bearer {api_key}"},
    json={
        "vaults": vault_addresses,
        "timeframe": "7d"
    }
)

# Find vault with highest APY
best_vault = max(response.json(), key=lambda x: x["apy"])
```

**Router API (for complex reallocations):**

```python
# Get quote for reallocation
quote = requests.post(
    "https://api.gluex.xyz/router/quote",
    headers={"Authorization": f"Bearer {api_key}"},
    json={
        "tokenIn": vault1,
        "tokenOut": vault2,
        "amountIn": amount,
        "slippageBps": 50
    }
)
```

## Security Considerations

1. **Whitelist Only**: Only whitelisted vaults can receive funds
2. **Owner Controls**: Critical functions require owner authorization
3. **Operator Separation**: Rebalancing is restricted to operator address
4. **Emergency Withdrawals**: Owner can emergency withdraw from any vault
5. **Reentrancy Protection**: All external calls protected with ReentrancyGuard

## Testing

```bash
# Run tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test
forge test --match-test testDeposit
```

## Gas Optimization

- Use `YieldOptimizerSimple` for instant deposits/withdrawals (higher gas per tx)
- Use `YieldOptimizer` (ERC-7540) for batch operations (lower gas per user)
- Rebalancing is gas-intensive - set appropriate `rebalanceDelay`

## Contract Addresses

After deployment, update here:

- **YieldOptimizer**: `TBD`
- **Asset (USDC)**: `TBD`
- **Network**: HyperEVM Mainnet (Chain ID: 999)
- **RPC URL**: https://rpc.hyperliquid.xyz/evm

## License

MIT
