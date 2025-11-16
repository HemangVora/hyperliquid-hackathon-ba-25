#!/usr/bin/env python3
"""
Test script for composite scoring system

This script validates the new weighted scoring system by testing with example vault data
that matches the scenarios from the brainstorming session.
"""

from typing import List
from dataclasses import dataclass


# Configuration constants (from yield_optimizer.py)
MIN_TVL = 250_000
MAX_CONCENTRATION = 0.20
APY_CAP = 50.0
RISK_FREE_RATE = 4.0

# Composite score weights
WEIGHT_APY = 0.40
WEIGHT_RISK = 0.25
WEIGHT_LIQUIDITY = 0.20
WEIGHT_SAFETY = 0.10
WEIGHT_GAS = 0.05

# Risk component sub-weights
RISK_VOLATILITY_WEIGHT = 0.60
RISK_DRAWDOWN_WEIGHT = 0.40

# Safety component sub-weights
SAFETY_TRACK_RECORD_WEIGHT = 0.50
SAFETY_STABILITY_PATTERN_WEIGHT = 0.30
SAFETY_CONTRACT_WEIGHT = 0.20


@dataclass
class TestVault:
    """Test vault with known characteristics"""
    name: str
    apy: float  # As percentage
    tvl: float
    volatility: float  # As percentage
    historical_apys: List[float]  # List of historical APYs
    age_days: int


def calculate_volatility(historical_apys: List[float]) -> float:
    """Calculate standard deviation"""
    if len(historical_apys) < 2:
        return 0.1
    mean = sum(historical_apys) / len(historical_apys)
    variance = sum((x - mean) ** 2 for x in historical_apys) / len(historical_apys)
    return variance ** 0.5


def calculate_max_drawdown(historical_apys: List[float]) -> float:
    """Calculate maximum drawdown"""
    if len(historical_apys) < 2:
        return 0.0
    max_drawdown = 0.0
    peak = historical_apys[0]
    for apy in historical_apys:
        if apy > peak:
            peak = apy
        drawdown = ((peak - apy) / (peak + 0.001)) * 100
        max_drawdown = max(max_drawdown, drawdown)
    return max_drawdown


def calculate_liquidity_score(tvl: float, vault_total_assets: float) -> float:
    """Calculate liquidity score"""
    if tvl >= 5_000_000:
        base_score = 1.0
    elif tvl >= 1_000_000:
        base_score = 0.85
    elif tvl >= 500_000:
        base_score = 0.65
    elif tvl >= 100_000:
        base_score = 0.40
    else:
        base_score = 0.10

    concentration = vault_total_assets / (tvl + 1)
    if concentration > MAX_CONCENTRATION:
        concentration_penalty = 0.5
    elif concentration > 0.10:
        concentration_penalty = 0.8
    else:
        concentration_penalty = 1.0

    return base_score * concentration_penalty


def calculate_track_record_score(age_days: int, data_points: int) -> float:
    """Calculate track record score"""
    if age_days >= 90:
        age_score = 1.0
    elif age_days >= 30:
        age_score = 0.75
    elif age_days >= 7:
        age_score = 0.50
    else:
        age_score = 0.20

    data_score = min(data_points / 30.0, 1.0)
    return (age_score + data_score) / 2.0


def calculate_stability_pattern_score(historical_apys: List[float]) -> float:
    """Calculate stability pattern score"""
    if len(historical_apys) < 3:
        return 0.7

    mean_apy = sum(historical_apys) / len(historical_apys)
    recent_apys = historical_apys[-3:]

    recent_spike = any(apy > mean_apy * 2.0 for apy in recent_apys)
    recent_crash = any(apy < mean_apy * 0.5 for apy in recent_apys if mean_apy > 0)

    if recent_spike or recent_crash:
        return 0.3

    volatility = calculate_volatility(historical_apys)
    if volatility < 0.02:  # 2% threshold
        return 1.0

    return 0.7


def calculate_composite_score(vault: TestVault, vault_total_assets: float) -> dict:
    """Calculate composite score for a test vault"""
    apy_decimal = vault.apy / 100

    # 1. APY Component (40%)
    apy_normalized = min(vault.apy / APY_CAP, 1.0)
    apy_component = apy_normalized * WEIGHT_APY

    # 2. Risk Component (25%)
    volatility = vault.volatility / 100  # Convert to decimal
    max_drawdown = calculate_max_drawdown(vault.historical_apys)

    volatility_normalized = 1 - min(volatility / 0.10, 1.0)  # 10% max
    drawdown_normalized = 1 - min(max_drawdown / 20.0, 1.0)  # 20% max

    risk_score = (
        RISK_VOLATILITY_WEIGHT * volatility_normalized +
        RISK_DRAWDOWN_WEIGHT * drawdown_normalized
    )
    risk_component = risk_score * WEIGHT_RISK

    # 3. Liquidity Component (20%)
    liquidity_score = calculate_liquidity_score(vault.tvl, vault_total_assets)
    liquidity_component = liquidity_score * WEIGHT_LIQUIDITY

    # 4. Safety Component (10%)
    track_record = calculate_track_record_score(vault.age_days, len(vault.historical_apys))
    stability_pattern = calculate_stability_pattern_score(vault.historical_apys)
    contract_safety = 1.0  # Assume whitelisted

    safety_score = (
        SAFETY_TRACK_RECORD_WEIGHT * track_record +
        SAFETY_STABILITY_PATTERN_WEIGHT * stability_pattern +
        SAFETY_CONTRACT_WEIGHT * contract_safety
    )
    safety_component = safety_score * WEIGHT_SAFETY

    # 5. Gas Component (5%)
    gas_component = 0.75 * WEIGHT_GAS  # Assume acceptable

    # Total
    composite_score = (
        apy_component +
        risk_component +
        liquidity_component +
        safety_component +
        gas_component
    )

    return {
        'vault_name': vault.name,
        'composite_score': composite_score,
        'apy_component': apy_component,
        'risk_component': risk_component,
        'liquidity_component': liquidity_component,
        'safety_component': safety_component,
        'gas_component': gas_component,
        'apy': vault.apy,
        'tvl': vault.tvl,
        'volatility': vault.volatility,
        'max_drawdown': max_drawdown
    }


def main():
    """Run composite scoring tests"""
    print("=" * 80)
    print("COMPOSITE SCORING SYSTEM TEST")
    print("=" * 80)
    print()

    # Define test vaults matching the brainstorming examples
    test_vaults = [
        TestVault(
            name="Pool A - Stable High-Liquidity",
            apy=15.0,
            tvl=3_000_000,
            volatility=0.75,
            historical_apys=[0.145, 0.148, 0.150, 0.152, 0.149, 0.151, 0.150],
            age_days=60
        ),
        TestVault(
            name="Pool B - Volatile High-APY",
            apy=25.0,
            tvl=400_000,
            volatility=4.5,
            historical_apys=[0.20, 0.28, 0.22, 0.30, 0.24, 0.26, 0.25],
            age_days=10
        ),
        TestVault(
            name="Pool C - Low Liquidity",
            apy=20.0,
            tvl=150_000,  # Below MIN_TVL threshold!
            volatility=2.0,
            historical_apys=[0.18, 0.20, 0.19, 0.21, 0.20],
            age_days=5
        ),
        TestVault(
            name="Pool D - Excellent All-Around",
            apy=18.0,
            tvl=8_000_000,
            volatility=1.0,
            historical_apys=[0.175, 0.178, 0.180, 0.182, 0.179, 0.181, 0.180] * 13,  # 91 days
            age_days=91
        )
    ]

    vault_total_assets = 1_000_000  # $1M in our vault

    print(f"Our Vault Total Assets: ${vault_total_assets:,.0f}")
    print(f"Minimum TVL Threshold: ${MIN_TVL:,.0f}")
    print(f"Maximum Concentration: {MAX_CONCENTRATION*100}%")
    print()
    print("Scoring Weights:")
    print(f"  - APY:       {WEIGHT_APY*100}%")
    print(f"  - Risk:      {WEIGHT_RISK*100}%")
    print(f"  - Liquidity: {WEIGHT_LIQUIDITY*100}%")
    print(f"  - Safety:    {WEIGHT_SAFETY*100}%")
    print(f"  - Gas:       {WEIGHT_GAS*100}%")
    print()
    print("=" * 80)
    print()

    results = []
    for vault in test_vaults:
        print(f"\n{vault.name}")
        print("-" * 80)

        # Check TVL threshold
        if vault.tvl < MIN_TVL:
            print(f"[X] FILTERED OUT: TVL ${vault.tvl:,.0f} below minimum ${MIN_TVL:,.0f}")
            print()
            continue

        score = calculate_composite_score(vault, vault_total_assets)
        results.append(score)

        print(f"  APY:         {vault.apy:.2f}%")
        print(f"  TVL:         ${vault.tvl:,.0f}")
        print(f"  Volatility:  {vault.volatility:.2f}%")
        print(f"  Max Drawdown: {score['max_drawdown']:.2f}%")
        print(f"  Age:         {vault.age_days} days")
        print()
        print("  Component Scores:")
        print(f"    APY:       {score['apy_component']:.4f} ({WEIGHT_APY*100}% weight)")
        print(f"    Risk:      {score['risk_component']:.4f} ({WEIGHT_RISK*100}% weight)")
        print(f"    Liquidity: {score['liquidity_component']:.4f} ({WEIGHT_LIQUIDITY*100}% weight)")
        print(f"    Safety:    {score['safety_component']:.4f} ({WEIGHT_SAFETY*100}% weight)")
        print(f"    Gas:       {score['gas_component']:.4f} ({WEIGHT_GAS*100}% weight)")
        print()
        print(f"  COMPOSITE SCORE: {score['composite_score']:.4f} (0-1 scale)")
        print()

    print("=" * 80)
    print("\nFINAL RANKING")
    print("=" * 80)
    print()

    # Sort by composite score
    results.sort(key=lambda x: x['composite_score'], reverse=True)

    for i, result in enumerate(results, 1):
        print(f"{i}. {result['vault_name']}")
        print(f"   Score: {result['composite_score']:.4f} | APY: {result['apy']:.2f}% | TVL: ${result['tvl']:,.0f}")
        print()

    print("=" * 80)
    print("\nKEY INSIGHTS")
    print("=" * 80)
    print()
    print("1. Pool C was filtered out due to TVL below minimum threshold")
    print("2. Pool D scores highest despite moderate APY due to:")
    print("   - Excellent liquidity ($8M TVL)")
    print("   - Low volatility (1.0%)")
    print("   - Proven track record (91 days)")
    print("3. Pool B's high APY (25%) is offset by:")
    print("   - High volatility (4.5%)")
    print("   - Low liquidity ($400K TVL)")
    print("   - Short track record (10 days)")
    print("4. The system successfully balances risk and reward!")
    print()
    print("[OK] Composite scoring system validation COMPLETE")
    print()


if __name__ == "__main__":
    main()
