# BIS Yield Optimizer - Backend Service

## Overview

This is the off-chain service that powers the BIS Yield Optimizer. It continuously monitors yield opportunities using GlueX's Yields API and automatically rebalances the vault's assets to maximize returns.

## How It Works

```
┌─────────────────────────────────────────────────────┐
│  CONTINUOUS OPTIMIZATION LOOP                       │
└─────────────────────────────────────────────────────┘

1. 📊 FETCH METRICS
   ├─ Query GlueX Yields API for all whitelisted vaults
   ├─ Get current APY, TVL, historical performance
   └─ Calculate risk metrics (volatility, Sharpe ratio)

2. 🧮 CALCULATE OPTIMAL ALLOCATION
   ├─ Rank vaults by Sharpe ratio (risk-adjusted return)
   ├─ Select top N vaults for diversification
   └─ Calculate allocation weights

3. 🔄 EXECUTE REBALANCE
   ├─ Check if rebalance is needed
   ├─ Build transaction to call vault.rebalance()
   └─ Monitor transaction confirmation

4. 💤 SLEEP
   └─ Wait for next check interval (default: 5 minutes)
```

## Features

- **Automated Yield Optimization**: Continuously finds and allocates to highest-yield opportunities
- **Risk Management**: Uses Sharpe ratio to balance returns vs volatility
- **Diversification**: Spreads capital across multiple top-performing vaults
- **GlueX Integration**: Native integration with GlueX Yields and Router APIs
- **Configurable**: Adjustable check intervals, rebalance thresholds, risk parameters
- **Production Ready**: Error handling, logging, retry logic

## Installation

### Prerequisites

- Python 3.9+
- Access to GlueX Portal (https://portal.gluex.xyz)
- Deployed YieldOptimizer contract

### Setup

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### Environment Configuration

Edit `.env` file:

```bash
# HyperEVM RPC endpoint
HYPERLIQUID_RPC_URL=https://api.hyperliquid.xyz/evm

# Operator private key (needs to be authorized in contract)
PRIVATE_KEY=your_private_key_without_0x_prefix

# Your deployed vault address
VAULT_ADDRESS=0x1234567890abcdef...

# GlueX API key from https://portal.gluex.xyz
GLUEX_API_KEY=your_api_key_here
```

## Usage

### Run the Optimizer

```bash
# Activate virtual environment
source venv/bin/activate

# Run the service
python yield_optimizer.py
```

### Run in Production

Use a process manager like `systemd`, `supervisor`, or `pm2`:

**With systemd:**

Create `/etc/systemd/system/bis-optimizer.service`:

```ini
[Unit]
Description=BIS Yield Optimizer
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/path/to/backend
Environment=PATH=/path/to/backend/venv/bin
ExecStart=/path/to/backend/venv/bin/python yield_optimizer.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl enable bis-optimizer
sudo systemctl start bis-optimizer
sudo systemctl status bis-optimizer
```

### Run with Docker

```bash
# Build image
docker build -t bis-optimizer .

# Run container
docker run -d \
  --name bis-optimizer \
  --env-file .env \
  --restart unless-stopped \
  bis-optimizer
```

## Configuration

### Key Parameters

| Parameter                | Description                             | Default       |
| ------------------------ | --------------------------------------- | ------------- |
| `CHECK_INTERVAL`         | Seconds between optimization checks     | 300 (5 min)   |
| `MIN_REBALANCE_INTERVAL` | Minimum seconds between rebalances      | 3600 (1 hour) |
| `MAX_VAULTS`             | Maximum number of vaults to allocate to | 3             |
| `RISK_FREE_RATE`         | Risk-free rate for Sharpe calculation   | 0.04 (4%)     |

### Optimization Strategy

The service uses a **Sharpe Ratio Maximization** strategy:

1. **Calculate Sharpe Ratio** for each vault:

   ```
   Sharpe = (APY - Risk_Free_Rate) / Volatility
   ```

2. **Select Top Vaults**: Choose top N vaults by Sharpe ratio

3. **Weighted Allocation**: Allocate proportionally to Sharpe ratios

   ```
   Weight[i] = Sharpe[i] / Sum(Sharpe)
   ```

4. **Execute Rebalance**: Update on-chain allocations

### Example Scenarios

**Scenario 1: High APY, High Risk**

```
Vault A: APY 50%, Volatility 20% → Sharpe = 2.3
Vault B: APY 30%, Volatility 5%  → Sharpe = 5.2
Vault C: APY 20%, Volatility 3%  → Sharpe = 5.3

✅ Allocation: Vault C (43%), Vault B (42%), Vault A (15%)
```

**Scenario 2: Similar APYs**

```
Vault A: APY 25%, Volatility 10% → Sharpe = 2.1
Vault B: APY 24%, Volatility 8%  → Sharpe = 2.5
Vault C: APY 26%, Volatility 12% → Sharpe = 1.8

✅ Allocation: Vault B (40%), Vault A (35%), Vault C (25%)
```

## GlueX API Integration

### Yields API

**Endpoint:** `POST /yields/historical-apy`

**Request:**

```json
{
  "vaults": [
    "0xe25514992597786e07872e6c5517fe1906c0cadd",
    "0xcdc3975df9d1cf054f44ed238edfb708880292ea"
  ],
  "timeframe": "7d"
}
```

**Response:**

```json
{
  "0xe25514992597786e07872e6c5517fe1906c0cadd": {
    "apy": 12.5,
    "tvl": 1000000,
    "historical": [12.1, 12.3, 12.8, 12.5]
  }
}
```

### Router API

**Endpoint:** `POST /router/quote`

Used for complex reallocations between vaults.

## Monitoring

### Logs

The service logs all important events:

```
2024-11-15 10:00:00 - INFO - Starting optimization cycle
2024-11-15 10:00:01 - INFO - Found 5 whitelisted vaults
2024-11-15 10:00:01 - INFO - Total assets: 100,000.00 USDC
2024-11-15 10:00:02 - INFO - Vault 0xe2551499... - APY: 12.50%, Sharpe: 2.30
2024-11-15 10:00:03 - INFO - Allocate 40.0% to vault 0xe2551499...
2024-11-15 10:00:10 - INFO - ✅ Rebalance successful! Gas used: 450,000
```

### Metrics to Monitor

- **Total Assets Under Management**: Vault's TVL
- **Current APY**: Weighted average APY across positions
- **Rebalance Frequency**: How often rebalances occur
- **Gas Costs**: Transaction costs per rebalance
- **Performance**: Track PnL over time

## Troubleshooting

### Common Issues

**1. "Unauthorized" error**

```
Solution: Ensure your operator address is set in the contract:
vault.setOperator(your_address)
```

**2. "Rebalance too soon" error**

```
Solution: Check lastRebalance timestamp. Must wait MIN_REBALANCE_INTERVAL.
```

**3. "Failed to fetch APY data"**

```
Solution:
- Check GlueX API key is valid
- Verify network connectivity
- Check GlueX API status
```

**4. Transaction fails**

```
Solution:
- Increase gas limit
- Check account has enough ETH for gas
- Verify vault addresses are whitelisted
```

## Security Best Practices

1. **Secure Private Keys**: Never commit private keys to git
2. **Use Environment Variables**: Store secrets in `.env` file
3. **Restricted Operator**: Operator can only rebalance, not withdraw
4. **Monitor Logs**: Set up alerts for errors
5. **Test First**: Test on testnet before mainnet deployment

## Development

### Run Tests

```bash
pytest tests/
```

### Add Custom Strategy

To implement a custom allocation strategy:

```python
def calculate_custom_allocation(
    self,
    metrics: List[VaultMetrics],
    total_assets: int
) -> List[AllocationTarget]:
    """Your custom allocation logic here"""
    # Example: Equal weight allocation
    n = len(metrics)
    allocations = []
    for vault in metrics:
        allocations.append(AllocationTarget(
            address=vault.address,
            amount=total_assets // n,
            percentage=100 / n
        ))
    return allocations
```

## Performance

### Expected Performance

- **Optimization Check**: ~2-5 seconds
- **Rebalance Transaction**: ~30-60 seconds
- **Gas Cost**: ~300,000-500,000 gas per rebalance
- **Memory Usage**: ~50-100 MB

### Optimization Tips

1. **Increase CHECK_INTERVAL** if APYs are stable
2. **Adjust MAX_VAULTS** based on diversification needs
3. **Use caching** for frequently accessed data
4. **Batch operations** when possible

## License

MIT

## Support

For issues or questions:

- GitHub Issues: [Create Issue]
- Discord: [Join Server]
- Email: support@bis-optimizer.xyz
