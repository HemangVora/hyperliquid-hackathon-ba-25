# BIS Yield Optimizer - Complete Setup Guide

This guide walks you through the complete setup process from scratch.

## Prerequisites

### 1. Install Required Tools

**Foundry (for smart contracts):**

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

**Python 3.9+ (for backend):**

```bash
# Check version
python3 --version

# Install if needed (Ubuntu/Debian)
sudo apt update
sudo apt install python3 python3-pip python3-venv
```

**Git:**

```bash
git --version
# If not installed: sudo apt install git
```

### 2. Get API Credentials

**GlueX Portal:**

1. Visit https://portal.gluex.xyz
2. Create an account
3. Generate API key
4. Save your API key securely

> 📖 **For detailed GlueX Router API integration guide, see:** [GLUEX_ROUTER_INTEGRATION.md](./GLUEX_ROUTER_INTEGRATION.md)

**HyperEVM Setup:**

1. Get HyperEVM Mainnet RPC URL: `https://rpc.hyperliquid.xyz/evm`
2. Fund your wallet with HYPE tokens for gas fees
3. Get USDC/USDT on HyperEVM mainnet for operations

## Step-by-Step Setup

### Step 1: Clone and Setup Repository

```bash
# Clone repository
git clone <repository-url>
cd submissions/BIS

# Verify structure
ls -la
# You should see: contracts/, backend/, README.md, etc.
```

### Step 2: Deploy Smart Contracts

```bash
cd contracts

# Install OpenZeppelin contracts
forge install OpenZeppelin/openzeppelin-contracts

# Create .env file
cat > .env << EOF
PRIVATE_KEY=your_private_key_without_0x
HYPERLIQUID_RPC_URL=https://rpc.hyperliquid.xyz/evm
ASSET_ADDRESS=0x...           # USDC on HyperEVM Mainnet
GLUEX_ROUTER_ADDRESS=0x...    # GlueX router on HyperEVM (ask GlueX team)
OPERATOR_ADDRESS=0x...        # Optional: bot/operator EOA. Defaults to deployer
EOF

# Load environment
source .env

# Compile contracts
forge build

# Run tests (optional but recommended)
forge test -vvv

# Update deployment script with correct asset address
nano DeployYieldOptimizer.s.sol
# Change: address public asset = address(0);
# To: address public asset = 0xYourUSDCAddress;

# Deploy full YieldOptimizer (ERC-7540) to HyperEVM
forge script DeployYieldOptimizer \
  --rpc-url $HYPERLIQUID_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify

# Save the deployed contract address
# It will be printed as: "YieldOptimizerSimple deployed at: 0x..."
export VAULT_ADDRESS=0x...  # Your deployed address
```

### Step 3: Verify Deployment

```bash
# Check if contract is deployed
cast code $VAULT_ADDRESS --rpc-url $HYPERLIQUID_RPC_URL

# Check owner
cast call $VAULT_ADDRESS "owner()(address)" --rpc-url $HYPERLIQUID_RPC_URL

# Check whitelisted vaults (works only on full YieldOptimizer)
cast call $VAULT_ADDRESS "getWhitelistedVaults()(address[])" --rpc-url $HYPERLIQUID_RPC_URL
```

### Step 4: Configure Backend Service

```bash
cd ../backend

# Create Python virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp env.example .env

# Edit .env with your credentials
nano .env
```

**Edit `.env` file:**

```bash
HYPERLIQUID_RPC_URL=https://rpc.hyperliquid.xyz/evm
PRIVATE_KEY=your_operator_private_key
VAULT_ADDRESS=0x...  # From Step 2
GLUEX_API_KEY=your_gluex_api_key_from_portal
```

### Step 5: Set Operator in Contract

The backend needs to be authorized as an operator:

```bash
# If operator address is different from owner
cast send $VAULT_ADDRESS \
  "setOperator(address)" \
  YOUR_OPERATOR_ADDRESS \
  --private-key $PRIVATE_KEY \
  --rpc-url $HYPERLIQUID_RPC_URL

# Verify operator is set
cast call $VAULT_ADDRESS "operator()(address)" --rpc-url $HYPERLIQUID_RPC_URL
```

### Step 6: Test Backend Service

```bash
# Make sure you're in backend/ with venv activated
source venv/bin/activate

# Run a test optimization cycle
python -c "
from yield_optimizer import YieldOptimizer
import os
from dotenv import load_dotenv

load_dotenv()

optimizer = YieldOptimizer(
    rpc_url=os.getenv('HYPERLIQUID_RPC_URL'),
    private_key=os.getenv('PRIVATE_KEY'),
    vault_address=os.getenv('VAULT_ADDRESS'),
    gluex_api_key=os.getenv('GLUEX_API_KEY')
)

# Run one cycle
optimizer.run_optimization_cycle()
"
```

### Step 7: Start Backend Service

```bash
# Run in foreground (for testing)
python yield_optimizer.py

# Run in background (for production)
nohup python yield_optimizer.py > optimizer.log 2>&1 &

# Check it's running
ps aux | grep yield_optimizer

# View logs
tail -f optimizer.log
```

### Understanding Deposits & Withdrawals

The vault uses **ERC-7540 async deposit/redeem pattern** for gas-efficient batch operations:

**Deposit Flow (2 steps):**

1. `requestDeposit(amount)` - Request a deposit, transfer USDC to vault
2. `claimDeposit()` - Claim your vault shares after processing

**Withdrawal Flow (2 steps):**

1. `requestRedeem(shares)` - Request to redeem your shares
2. `claimRedeem()` - Claim your USDC after processing

**Why 2 steps?** This allows the vault to batch multiple user operations together, making it more gas-efficient and preventing front-running during rebalancing.

### Step 8: Test User Flow

```bash
# In a new terminal, test depositing as a user

# 1. Approve USDC to vault
cast send $USDC_ADDRESS \
  "approve(address,uint256)" \
  $VAULT_ADDRESS \
  1000000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $HYPERLIQUID_RPC_URL

# 2. Request deposit (100 USDC = 100000 with 6 decimals)
cast send $VAULT_ADDRESS \
  "requestDeposit(uint256)" \
  10000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $HYPERLIQUID_RPC_URL

# 3. Claim your deposit to receive vault shares
cast send $VAULT_ADDRESS \
  "claimDeposit()" \
  --private-key $PRIVATE_KEY \
  --rpc-url $HYPERLIQUID_RPC_URL

# 4. Check vault shares received
cast call $VAULT_ADDRESS \
  "balanceOf(address)(uint256)" \
  $USER_ADDRESS \
  --rpc-url $HYPERLIQUID_RPC_URL

# 5. Check total assets in vault
cast call $VAULT_ADDRESS \
  "totalAssets()(uint256)" \
  --rpc-url $HYPERLIQUID_RPC_URL

# 6. Request withdrawal (redeem shares for USDC)
# First, request redemption with your share amount
cast send $VAULT_ADDRESS \
  "requestRedeem(uint256)" \
  10000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $HYPERLIQUID_RPC_URL

# 7. Claim your withdrawn assets (after redemption is processed)
cast send $VAULT_ADDRESS \
  "claimRedeem()" \
  --private-key $PRIVATE_KEY \
  --rpc-url $HYPERLIQUID_RPC_URL

# 8. Verify USDC balance after withdrawal
cast call $USDC_ADDRESS \
  "balanceOf(address)(uint256)" \
  $USER_ADDRESS \
  --rpc-url $HYPERLIQUID_RPC_URL

# Helper: Check your pending deposit request
cast call $VAULT_ADDRESS \
  "pendingDepositRequests(address)(uint256)" \
  $USER_ADDRESS \
  --rpc-url $HYPERLIQUID_RPC_URL

# Helper: Check your pending redeem request
cast call $VAULT_ADDRESS \
  "pendingRedeemRequests(address)(uint256)" \
  $USER_ADDRESS \
  --rpc-url $HYPERLIQUID_RPC_URL

# Helper: Convert shares to assets (to see how much USDC you'll get)
cast call $VAULT_ADDRESS \
  "convertToAssets(uint256)(uint256)" \
  <YOUR_SHARE_AMOUNT> \
  --rpc-url $HYPERLIQUID_RPC_URL
```

## Production Deployment

### Using Systemd (Linux)

Create service file `/etc/systemd/system/bis-optimizer.service`:

```ini
[Unit]
Description=BIS Yield Optimizer Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/BIS/backend
Environment=PATH=/home/ubuntu/BIS/backend/venv/bin
ExecStart=/home/ubuntu/BIS/backend/venv/bin/python yield_optimizer.py
Restart=always
RestartSec=10
StandardOutput=append:/var/log/bis-optimizer.log
StandardError=append:/var/log/bis-optimizer-error.log

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable bis-optimizer
sudo systemctl start bis-optimizer
sudo systemctl status bis-optimizer

# View logs
sudo journalctl -u bis-optimizer -f
```

### Using Docker

Create `Dockerfile` in backend/:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "yield_optimizer.py"]
```

Build and run:

```bash
cd backend

# Build image
docker build -t bis-optimizer .

# Run container
docker run -d \
  --name bis-optimizer \
  --env-file .env \
  --restart unless-stopped \
  bis-optimizer

# View logs
docker logs -f bis-optimizer
```

## Monitoring & Maintenance

### Check System Status

```bash
# Check contract balance
cast call $VAULT_ADDRESS "totalAssets()(uint256)" --rpc-url $HYPERLIQUID_RPC_URL

# Check last rebalance time
cast call $VAULT_ADDRESS "lastRebalance()(uint256)" --rpc-url $HYPERLIQUID_RPC_URL

# Check operator
cast call $VAULT_ADDRESS "operator()(address)" --rpc-url $HYPERLIQUID_RPC_URL

# Check backend process
ps aux | grep yield_optimizer
```

### Useful Commands

```bash
# Restart backend service
sudo systemctl restart bis-optimizer

# View recent logs
sudo journalctl -u bis-optimizer -n 100

# Check gas balance of operator
cast balance $OPERATOR_ADDRESS --rpc-url $HYPERLIQUID_RPC_URL

# Emergency withdraw from vault
cast send $VAULT_ADDRESS \
  "emergencyWithdraw(address)" \
  $VAULT_TO_WITHDRAW_FROM \
  --private-key $OWNER_PRIVATE_KEY \
  --rpc-url $HYPERLIQUID_RPC_URL
```

## Troubleshooting

### Problem: "Unauthorized" error

**Solution:**

```bash
# Check if operator is set correctly
cast call $VAULT_ADDRESS "operator()(address)" --rpc-url $HYPERLIQUID_RPC_URL

# Set operator if needed
cast send $VAULT_ADDRESS \
  "setOperator(address)" \
  $OPERATOR_ADDRESS \
  --private-key $OWNER_PRIVATE_KEY \
  --rpc-url $HYPERLIQUID_RPC_URL
```

### Problem: "Insufficient gas"

**Solution:**

```bash
# Check ETH balance
cast balance $OPERATOR_ADDRESS --rpc-url $HYPERLIQUID_RPC_URL

# Fund the account if needed
```

### Problem: Backend not connecting to contract

**Solution:**

```bash
# Check .env file
cat backend/.env

# Test RPC connection
cast block latest --rpc-url $HYPERLIQUID_RPC_URL

# Verify contract exists
cast code $VAULT_ADDRESS --rpc-url $HYPERLIQUID_RPC_URL
```

### Problem: GlueX API errors

**Solution:**

```bash
# Test API key
curl -H "Authorization: Bearer $GLUEX_API_KEY" \
  https://api.gluex.xyz/health

# Regenerate API key at https://portal.gluex.xyz if needed
```

## Security Checklist

- [ ] Private keys stored securely (never committed to git)
- [ ] .env files added to .gitignore
- [ ] Operator role separated from owner
- [ ] Multi-sig for owner role (production)
- [ ] Regular monitoring and alerts set up
- [ ] Backup keys stored securely offline
- [ ] Rate limiting on rebalancing
- [ ] Emergency procedures documented

## Next Steps

1. **Test with small amounts first**
2. **Monitor for 24-48 hours**
3. **Gradually increase TVL**
4. **Set up monitoring dashboards**
5. **Document any custom configurations**

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review logs: `sudo journalctl -u bis-optimizer -n 200`
3. Join our Discord/Telegram for support
4. Create a GitHub issue with details

---

**Setup complete! Your yield optimizer is now running.** 🎉
