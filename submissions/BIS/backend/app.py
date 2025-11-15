#!/usr/bin/env python3
"""
BIS Yield Optimizer - API Server
Provides REST API endpoints for the rebalancing monitor and portfolio management
"""

import os
import time
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from web3 import Web3

# Import the yield optimizer
from yield_optimizer import YieldOptimizer, VaultMetrics, AllocationTarget

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Global optimizer instance (will be initialized on first request)
optimizer: Optional[YieldOptimizer] = None

# Store rebalance history in memory (in production, use a database)
rebalance_history: List[Dict] = []


def get_optimizer() -> YieldOptimizer:
    """Get or create the yield optimizer instance"""
    global optimizer
    if optimizer is None:
        try:
            optimizer = YieldOptimizer()
            logger.info("Yield optimizer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize optimizer: {e}")
            raise
    return optimizer


def format_pool_address(address: str) -> str:
    """Format pool address for display"""
    if not address:
        return "Unknown Pool"
    # Try to get a friendly name (in production, fetch from a mapping or API)
    return f"{address[:6]}...{address[-4:]}"


# ============================================================================
# REBALANCING MONITOR ENDPOINTS
# ============================================================================

@app.route('/api/rebalance/status', methods=['GET'])
def get_rebalance_status():
    """
    Get current rebalancing status and countdown information

    Returns:
        - lastRebalanceTime: Unix timestamp of last rebalance
        - nextRebalanceTime: Unix timestamp of next possible rebalance
        - timeRemaining: Seconds until next rebalance check
        - status: 'ready' | 'waiting' | 'processing'
        - totalAUM: Total assets under management in USDC
        - currentSharpeRatio: Current portfolio Sharpe ratio
        - targetSharpeRatio: Optimal Sharpe ratio
        - sharpeImprovement: Percentage improvement possible
    """
    try:
        opt = get_optimizer()

        # Get last rebalance time from contract
        try:
            last_rebalance = opt.vault.functions.lastRebalance().call()
        except:
            last_rebalance = int(time.time()) - 3600  # Default to 1 hour ago

        # Calculate next rebalance time (current time + remaining delay)
        rebalance_delay = 3600  # 1 hour in seconds
        current_time = int(time.time())
        time_since_last = current_time - last_rebalance
        time_remaining = max(0, rebalance_delay - time_since_last)
        next_rebalance_time = current_time + time_remaining

        # Determine status
        if time_remaining == 0:
            status = 'ready'
        else:
            status = 'waiting'

        # Get total assets under management
        try:
            total_assets = opt.vault.functions.totalAssets().call()
            total_aum = total_assets / 1e6  # Convert from wei to USDC
        except:
            total_aum = 0

        # Get whitelisted vaults and calculate metrics
        try:
            whitelisted = opt.vault.functions.getWhitelistedVaults().call()
            metrics = opt.get_vault_metrics(whitelisted)

            # Calculate current and target Sharpe ratios
            if metrics:
                # Get current allocations
                current_allocations = {}
                total_current = 0
                for vault in whitelisted:
                    try:
                        alloc = opt.vault.functions.allocations(vault).call()
                        current_allocations[vault] = alloc / 1e6
                        total_current += alloc / 1e6
                    except:
                        current_allocations[vault] = 0

                # Calculate current weighted Sharpe ratio
                current_sharpe = 0
                if total_current > 0:
                    for vault, metric in metrics.items():
                        weight = current_allocations.get(vault, 0) / total_current
                        current_sharpe += weight * metric.sharpe_ratio

                # Calculate target Sharpe ratio (from optimal allocation)
                allocations = opt.calculate_optimal_allocation(metrics, int(total_aum * 1e6))
                target_sharpe = 0
                if total_aum > 0:
                    for alloc in allocations:
                        if alloc.address in metrics:
                            weight = alloc.percentage / 100
                            target_sharpe += weight * metrics[alloc.address].sharpe_ratio

                # Calculate improvement
                if current_sharpe > 0:
                    sharpe_improvement = ((target_sharpe - current_sharpe) / current_sharpe) * 100
                else:
                    sharpe_improvement = 0
            else:
                current_sharpe = 0
                target_sharpe = 0
                sharpe_improvement = 0
        except Exception as e:
            logger.error(f"Error calculating Sharpe ratios: {e}")
            current_sharpe = 0
            target_sharpe = 0
            sharpe_improvement = 0

        return jsonify({
            'lastRebalanceTime': last_rebalance,
            'nextRebalanceTime': next_rebalance_time,
            'timeRemaining': time_remaining,
            'status': status,
            'totalAUM': total_aum,
            'currentSharpeRatio': round(current_sharpe, 2),
            'targetSharpeRatio': round(target_sharpe, 2),
            'sharpeImprovement': round(sharpe_improvement, 2)
        })

    except Exception as e:
        logger.error(f"Error in get_rebalance_status: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/rebalance/decision', methods=['GET'])
def get_rebalance_decision():
    """
    Get detailed rebalancing decision information

    Returns:
        - pools: Array of pool metrics with current and target allocations
        - totalAllocationChange: Percentage of funds that would move
        - expectedGasCost: Estimated gas cost in USDC
        - expectedBenefit: Expected additional APY in USDC annually
        - benefitToCostRatio: Benefit divided by gas + fees
        - projectedAnnualReturn: New expected annual return in USDC
    """
    try:
        opt = get_optimizer()

        # Get whitelisted vaults
        whitelisted = opt.vault.functions.getWhitelistedVaults().call()

        # Get total assets
        total_assets = opt.vault.functions.totalAssets().call()
        total_aum = total_assets / 1e6

        # Get vault metrics
        metrics = opt.get_vault_metrics(whitelisted)

        # Calculate optimal allocation
        target_allocations = opt.calculate_optimal_allocation(metrics, total_assets)

        # Get current allocations
        current_allocations = {}
        for vault in whitelisted:
            try:
                alloc = opt.vault.functions.allocations(vault).call()
                current_allocations[vault] = alloc / 1e6
            except:
                current_allocations[vault] = 0

        # Build pool comparison data
        pools = []
        total_delta = 0

        # Create lookup for target allocations
        target_lookup = {alloc.address: alloc for alloc in target_allocations}

        for vault in whitelisted:
            if vault not in metrics:
                continue

            metric = metrics[vault]
            current_alloc = current_allocations.get(vault, 0)
            current_pct = (current_alloc / total_aum * 100) if total_aum > 0 else 0

            target_alloc_obj = target_lookup.get(vault)
            if target_alloc_obj:
                target_alloc = target_alloc_obj.amount / 1e6
                target_pct = target_alloc_obj.percentage
            else:
                target_alloc = 0
                target_pct = 0

            delta = target_alloc - current_alloc
            delta_pct = target_pct - current_pct
            total_delta += abs(delta)

            pools.append({
                'address': vault,
                'name': format_pool_address(vault),
                'apy': round(metric.apy, 2),
                'volatility': round(metric.volatility, 2),
                'sharpeRatio': round(metric.sharpe_ratio, 2),
                'riskScore': round(metric.risk_score, 4),
                'tvl': metric.tvl,
                'currentAllocation': round(current_alloc, 2),
                'currentAllocationPercent': round(current_pct, 2),
                'targetAllocation': round(target_alloc, 2),
                'targetAllocationPercent': round(target_pct, 2),
                'delta': round(delta, 2),
                'deltaPercent': round(delta_pct, 2)
            })

        # Sort by Sharpe ratio (descending)
        pools.sort(key=lambda x: x['sharpeRatio'], reverse=True)

        # Calculate total allocation change percentage
        total_allocation_change_pct = (total_delta / total_aum * 100) if total_aum > 0 else 0

        # Estimate gas cost (rough estimate)
        # Rebalance involves: withdraw all + deposit to N vaults
        # Assume ~200k gas per operation, $0.10 per operation (adjust based on chain)
        num_operations = len(whitelisted) + len(target_allocations)
        expected_gas_cost = num_operations * 0.10  # USD

        # Calculate expected benefit (improvement in APY * total AUM)
        current_apy = sum((current_allocations.get(v, 0) / total_aum) * metrics[v].apy
                         for v in whitelisted if v in metrics and total_aum > 0)
        target_apy = sum((target_lookup[v].percentage / 100) * metrics[v].apy
                        for v in target_lookup if v in metrics)

        apy_improvement = target_apy - current_apy
        expected_benefit = (apy_improvement / 100) * total_aum  # Annual benefit in USDC

        # Benefit to cost ratio
        benefit_to_cost = expected_benefit / expected_gas_cost if expected_gas_cost > 0 else 0

        # Projected annual return
        projected_annual_return = (target_apy / 100) * total_aum

        return jsonify({
            'pools': pools,
            'totalAllocationChange': round(total_allocation_change_pct, 2),
            'expectedGasCost': round(expected_gas_cost, 2),
            'expectedBenefit': round(expected_benefit, 2),
            'benefitToCostRatio': round(benefit_to_cost, 2),
            'projectedAnnualReturn': round(projected_annual_return, 2)
        })

    except Exception as e:
        logger.error(f"Error in get_rebalance_decision: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/rebalance/conditions', methods=['GET'])
def get_rebalance_conditions():
    """
    Get checklist of conditions required for rebalancing

    Returns array of conditions with met/not met status
    """
    try:
        opt = get_optimizer()

        # Get last rebalance time
        try:
            last_rebalance = opt.vault.functions.lastRebalance().call()
        except:
            last_rebalance = int(time.time()) - 3600

        current_time = int(time.time())
        time_since_last = current_time - last_rebalance
        rebalance_delay = 3600  # 1 hour

        # Condition 1: Time delay satisfied
        time_delay_met = time_since_last >= rebalance_delay
        time_delay_condition = {
            'id': 'time_delay',
            'label': 'Time Delay Satisfied',
            'description': 'At least 1 hour has passed since last rebalance',
            'met': time_delay_met,
            'currentValue': time_since_last,
            'requiredValue': rebalance_delay,
            'unit': 'seconds'
        }

        # Condition 2: Improvement threshold met
        # Get metrics and calculate potential improvement
        try:
            whitelisted = opt.vault.functions.getWhitelistedVaults().call()
            total_assets = opt.vault.functions.totalAssets().call()
            total_aum = total_assets / 1e6
            metrics = opt.get_vault_metrics(whitelisted)

            # Get current allocations
            current_allocations = {}
            for vault in whitelisted:
                try:
                    alloc = opt.vault.functions.allocations(vault).call()
                    current_allocations[vault] = alloc / 1e6
                except:
                    current_allocations[vault] = 0

            # Calculate current APY
            current_apy = sum((current_allocations.get(v, 0) / total_aum) * metrics[v].apy
                             for v in whitelisted if v in metrics and total_aum > 0)

            # Calculate target APY
            target_allocations = opt.calculate_optimal_allocation(metrics, total_assets)
            target_apy = sum((alloc.percentage / 100) * metrics[alloc.address].apy
                            for alloc in target_allocations if alloc.address in metrics)

            improvement_pct = ((target_apy - current_apy) / current_apy * 100) if current_apy > 0 else 0
            improvement_threshold = 1.0  # 1% improvement minimum
            improvement_met = improvement_pct >= improvement_threshold
        except:
            improvement_pct = 0
            improvement_threshold = 1.0
            improvement_met = False

        improvement_condition = {
            'id': 'improvement_threshold',
            'label': 'Improvement Threshold Met',
            'description': 'Expected APY improvement is significant enough',
            'met': improvement_met,
            'currentValue': round(improvement_pct, 2),
            'requiredValue': improvement_threshold,
            'unit': '%'
        }

        # Condition 3: Gas cost acceptable
        # Simple check: benefit > gas cost * 10
        try:
            num_operations = len(whitelisted) + len(target_allocations)
            gas_cost = num_operations * 0.10
            annual_benefit = (improvement_pct / 100) * current_apy * total_aum / 100
            benefit_to_cost = annual_benefit / gas_cost if gas_cost > 0 else 0
            gas_acceptable = benefit_to_cost >= 10  # At least 10x return on gas
        except:
            benefit_to_cost = 0
            gas_acceptable = False

        gas_condition = {
            'id': 'gas_cost_acceptable',
            'label': 'Gas Cost Acceptable',
            'description': 'Expected benefit exceeds gas costs',
            'met': gas_acceptable,
            'currentValue': round(benefit_to_cost, 2),
            'requiredValue': 10.0,
            'unit': 'ratio'
        }

        # Condition 4: Backend service healthy
        # Simple check - if we got here, backend is healthy
        backend_condition = {
            'id': 'backend_healthy',
            'label': 'Backend Service Healthy',
            'description': 'Backend service is running and responsive',
            'met': True,
            'currentValue': 1,
            'requiredValue': 1,
            'unit': 'status'
        }

        # All conditions met?
        all_met = (time_delay_met and improvement_met and
                  gas_acceptable and backend_condition['met'])

        return jsonify({
            'timeDelaySatisfied': time_delay_condition,
            'improvementThresholdMet': improvement_condition,
            'gasCostAcceptable': gas_condition,
            'backendServiceHealthy': backend_condition,
            'allConditionsMet': all_met
        })

    except Exception as e:
        logger.error(f"Error in get_rebalance_conditions: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/rebalance/history', methods=['GET'])
def get_rebalance_history():
    """
    Get historical rebalancing events

    Query params:
        - limit: Number of records to return (default: 10)
        - offset: Offset for pagination (default: 0)

    Returns:
        - rebalances: Array of historical rebalance events
        - totalRebalances: Total count
        - averageImprovement: Average Sharpe improvement
        - totalGasCost: Total gas spent
    """
    try:
        limit = int(request.args.get('limit', 10))
        offset = int(request.args.get('offset', 0))

        # In production, fetch from database
        # For now, return mock data or stored in-memory history

        # Calculate aggregates
        total_rebalances = len(rebalance_history)

        if total_rebalances > 0:
            avg_improvement = sum(r['performanceImprovement'] for r in rebalance_history) / total_rebalances
            total_gas = sum(r['gasCostUSD'] for r in rebalance_history)
        else:
            avg_improvement = 0
            total_gas = 0

        # Paginate
        paginated = rebalance_history[offset:offset + limit]

        return jsonify({
            'rebalances': paginated,
            'totalRebalances': total_rebalances,
            'averageImprovement': round(avg_improvement, 2),
            'totalGasCost': round(total_gas, 2)
        })

    except Exception as e:
        logger.error(f"Error in get_rebalance_history: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    try:
        opt = get_optimizer()
        return jsonify({
            'status': 'healthy',
            'timestamp': int(time.time()),
            'optimizer_initialized': opt is not None
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': int(time.time())
        }), 500


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    port = int(os.getenv('API_PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'

    logger.info(f"Starting BIS Yield Optimizer API on port {port}")
    logger.info(f"Debug mode: {debug}")

    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )
