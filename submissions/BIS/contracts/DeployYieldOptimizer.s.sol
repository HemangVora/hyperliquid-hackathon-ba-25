// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "./YieldOptimizerSimple.sol";

/**
 * @title DeployYieldOptimizer
 * @notice Deployment script for YieldOptimizerSimple contract
 * @dev Run with: forge script DeployYieldOptimizer --rpc-url $RPC_URL --broadcast
 */
contract DeployYieldOptimizer is Script {
    // ============================================
    // CONFIGURATION
    // ============================================

    // GlueX Vault addresses (from task requirements)
    address[] public glueXVaults = [
        0xe25514992597786e07872e6c5517fe1906c0cadd,
        0xcdc3975df9d1cf054f44ed238edfb708880292ea,
        0x8f9291606862eef771a97e5b71e4b98fd1fa216a,
        0x9f75eac57d1c6f7248bd2aede58c95689f3827f7,
        0x63cf7ee583d9954febf649ad1c40c97a6493b1be
    ];

    // Replace with actual asset address (USDC/USDT on HyperEVM)
    address public asset = address(0); // TODO: Set actual asset address

    function run() external {
        // Read deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy YieldOptimizerSimple
        YieldOptimizerSimple optimizer = new YieldOptimizerSimple(
            asset,
            "BIS Yield Optimizer",
            "BIS-YO"
        );

        console.log("YieldOptimizerSimple deployed at:", address(optimizer));

        // Whitelist GlueX vaults
        console.log("Whitelisting GlueX vaults...");
        optimizer.batchWhitelistVaults(glueXVaults);

        // Set performance fee to 2%
        optimizer.setPerformanceFee(200);
        console.log("Performance fee set to 2%");

        // Set rebalance delay to 1 hour
        optimizer.setRebalanceDelay(1 hours);
        console.log("Rebalance delay set to 1 hour");

        vm.stopBroadcast();

        console.log("\n=== Deployment Summary ===");
        console.log("Vault Address:", address(optimizer));
        console.log("Asset:", asset);
        console.log("Whitelisted Vaults:", glueXVaults.length);
        console.log("Performance Fee: 2%");
        console.log("Rebalance Delay: 1 hour");
    }
}
