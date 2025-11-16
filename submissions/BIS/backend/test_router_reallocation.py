#!/usr/bin/env python3
"""
Test Script for GlueX Router API Reallocation

This script tests the Router API integration by:
1. Fetching vault metrics from GlueX Yields API
2. Building a reallocation plan with Router quotes
3. Displaying the routing information

Run: python test_router_reallocation.py
"""

import os
import sys
import logging
from dotenv import load_dotenv
from yield_optimizer import YieldOptimizer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def test_router_quote():
    """Test getting a Router API quote for vault reallocation"""
    logger.info("=" * 70)
    logger.info("Testing GlueX Router API Integration")
    logger.info("=" * 70)
    
    # Load environment
    load_dotenv()
    
    RPC_URL = os.getenv("HYPERLIQUID_RPC_URL", "https://rpc.hyperliquid.xyz/evm")
    PRIVATE_KEY = os.getenv("PRIVATE_KEY")
    VAULT_ADDRESS = os.getenv("VAULT_ADDRESS")
    GLUEX_API_KEY = os.getenv("GLUEX_API_KEY")
    
    # Validate
    if not all([PRIVATE_KEY, VAULT_ADDRESS, GLUEX_API_KEY]):
        logger.error("❌ Missing required environment variables!")
        logger.error("Please set: PRIVATE_KEY, VAULT_ADDRESS, GLUEX_API_KEY")
        return False
    
    try:
        # Initialize optimizer
        logger.info("\n1️⃣  Initializing Yield Optimizer...")
        optimizer = YieldOptimizer(
            rpc_url=RPC_URL,
            private_key=PRIVATE_KEY,
            vault_address=VAULT_ADDRESS,
            gluex_api_key=GLUEX_API_KEY
        )
        logger.info(f"   ✓ Optimizer initialized for vault: {VAULT_ADDRESS[:10]}...")
        
        # Test 1: Get vault assets
        logger.info("\n2️⃣  Testing vault asset detection...")
        test_vaults = [
            "0xcdc3975df9d1cf054f44ed238edfb708880292ea",
            "0xe25514992597786e07872e6c5517fe1906c0cadd",
        ]
        
        for vault in test_vaults:
            try:
                asset = optimizer.get_vault_asset(vault)
                logger.info(f"   ✓ Vault {vault[:10]}... requires asset: {asset[:10]}...")
            except Exception as e:
                logger.warning(f"   ⚠️  Could not get asset for {vault[:10]}...: {e}")
        
        # Test 2: Get current positions
        logger.info("\n3️⃣  Testing current position detection...")
        positions = optimizer.get_current_vault_positions()
        logger.info(f"   ✓ Found positions in {len(positions)} vaults")
        
        for vault, amount in positions.items():
            if amount > 0:
                logger.info(f"      - {vault[:10]}...: {amount / 1e6:.2f} tokens")
        
        # Test 3: Get Router quote for reallocation
        logger.info("\n4️⃣  Testing Router API quote...")
        
        # Example: Quote for reallocating from one vault to another
        from_vault = test_vaults[0]
        to_vault = test_vaults[1]
        amount = 10 * 10**6  # 10 USDC
        
        from_token = optimizer.get_vault_asset(from_vault)
        to_token = optimizer.get_vault_asset(to_vault)
        
        logger.info(f"   Getting quote for reallocation:")
        logger.info(f"      From vault: {from_vault[:10]}... (token: {from_token[:10]}...)")
        logger.info(f"      To vault:   {to_vault[:10]}... (token: {to_token[:10]}...)")
        logger.info(f"      Amount:     {amount / 1e6:.2f} tokens")
        
        try:
            quote = optimizer.gluex.get_reallocation_quote(
                from_token=from_token,
                to_token=to_token,
                amount=amount,
                user_address=VAULT_ADDRESS,
                chain_id="hyperevm"
            )
            
            logger.info("\n   ✅ Router Quote Received:")
            logger.info(f"      Needs Swap: {quote.get('needsSwap', False)}")
            logger.info(f"      Input Amount: {int(quote.get('inputAmount', 0)) / 1e6:.2f} tokens")
            logger.info(f"      Output Amount: {int(quote.get('outputAmount', 0)) / 1e6:.2f} tokens")
            
            if quote.get('needsSwap'):
                logger.info(f"      Min Output: {int(quote.get('minOutputAmount', 0)) / 1e6:.2f} tokens")
                logger.info(f"      Calldata Length: {len(quote.get('calldata', '0x'))} chars")
                logger.info(f"      Router Contract: {quote.get('to', 'N/A')}")
            else:
                logger.info(f"      ℹ️  Same token - direct transfer, no swap needed")
                
        except Exception as e:
            logger.error(f"   ❌ Failed to get Router quote: {e}")
            return False
        
        # Test 4: Build full reallocation plan
        logger.info("\n5️⃣  Testing full reallocation plan builder...")
        
        # Simulate some allocations
        from yield_optimizer import AllocationTarget
        
        # Simple test: move from vault 1 to vault 2
        current_positions = {test_vaults[0]: 10 * 10**6}  # 10 tokens in vault 1
        target_allocations = [
            AllocationTarget(address=test_vaults[1], amount=10 * 10**6, score=0.8)
        ]
        
        try:
            plan = optimizer.build_reallocation_plan(
                current_positions=current_positions,
                target_allocations=target_allocations
            )
            
            logger.info(f"   ✅ Reallocation Plan Generated:")
            logger.info(f"      Steps: {len(plan)}")
            
            for i, step in enumerate(plan, 1):
                logger.info(f"\n      Step {i}:")
                logger.info(f"         From: {step['fromVault'][:10]}...")
                logger.info(f"         To:   {step['toVault'][:10]}...")
                logger.info(f"         Amount: {step['amount'] / 1e6:.2f} tokens")
                logger.info(f"         Needs Swap: {step['needsSwap']}")
                logger.info(f"         Expected Output: {step['expectedOutput'] / 1e6:.2f} tokens")
                
        except Exception as e:
            logger.error(f"   ❌ Failed to build reallocation plan: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return False
        
        logger.info("\n" + "=" * 70)
        logger.info("✅ All Router API tests completed successfully!")
        logger.info("=" * 70)
        
        return True
        
    except Exception as e:
        logger.error(f"\n❌ Test failed with error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False


def test_yields_api():
    """Test basic GlueX Yields API connectivity"""
    logger.info("\n" + "=" * 70)
    logger.info("Testing GlueX Yields API")
    logger.info("=" * 70)
    
    load_dotenv()
    GLUEX_API_KEY = os.getenv("GLUEX_API_KEY")
    
    if not GLUEX_API_KEY:
        logger.error("❌ GLUEX_API_KEY not set")
        return False
    
    from gluex_client import GlueXClient
    
    try:
        client = GlueXClient(api_key=GLUEX_API_KEY)
        
        # Test vault
        test_vault = "0xcdc3975df9d1cf054f44ed238edfb708880292ea"
        
        logger.info(f"\n📊 Fetching yields for vault: {test_vault[:10]}...")
        
        result = client.get_historical_apy(
            vault_addresses=[test_vault],
            period="7d"
        )
        
        if result and len(result) > 0:
            vault_data = result[0]
            logger.info(f"   ✅ Success!")
            logger.info(f"      Current APY: {vault_data.get('currentApy', 'N/A')}%")
            logger.info(f"      Historical Data Points: {len(vault_data.get('apyHistory', []))}")
        else:
            logger.warning(f"   ⚠️  No data returned")
            
        return True
        
    except Exception as e:
        logger.error(f"❌ Yields API test failed: {e}")
        return False


def main():
    """Run all tests"""
    print("\n")
    print("╔" + "=" * 68 + "╗")
    print("║" + " " * 15 + "GlueX Router API Test Suite" + " " * 25 + "║")
    print("╚" + "=" * 68 + "╝")
    print("\n")
    
    # Test 1: Yields API
    yields_ok = test_yields_api()
    
    # Test 2: Router API
    router_ok = test_router_quote()
    
    # Summary
    print("\n")
    print("╔" + "=" * 68 + "╗")
    print("║" + " " * 25 + "Test Summary" + " " * 31 + "║")
    print("╠" + "=" * 68 + "╣")
    print(f"║  GlueX Yields API:  {'✅ PASS' if yields_ok else '❌ FAIL'}" + " " * 42 + "║")
    print(f"║  GlueX Router API:  {'✅ PASS' if router_ok else '❌ FAIL'}" + " " * 42 + "║")
    print("╚" + "=" * 68 + "╝")
    print("\n")
    
    if yields_ok and router_ok:
        logger.info("🎉 All tests passed! Router API integration is working.")
        return 0
    else:
        logger.error("❌ Some tests failed. Check the logs above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())

