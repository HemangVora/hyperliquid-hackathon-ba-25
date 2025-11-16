// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "./YieldOptimizer.sol";

/**
 * @title DeployYieldOptimizer
 * @notice Deployment script for the full YieldOptimizer (ERC-7540) contract
 * @dev Run with: forge script DeployYieldOptimizer --rpc-url $RPC_URL --broadcast
 */
contract DeployYieldOptimizer is Script {
    // ============================================
    // CONFIGURATION
    // ============================================

    // GlueX Vault addresses (from task requirements)
    address[] public glueXVaults = [
        0xE25514992597786E07872e6C5517FE1906C0CAdD,
        0xCdc3975df9D1cf054F44ED238Edfb708880292EA,
        0x8F9291606862eEf771a97e5B71e4B98fd1Fa216a,
        0x9f75Eac57d1c6F7248bd2AEDe58C95689f3827f7,
        0x63Cf7EE583d9954FeBF649aD1c40C97a6493b1Be
    ];

    function run() external {
        address asset = vm.envAddress("ASSET_ADDRESS");
        address glueXRouter = vm.envAddress("GLUEX_ROUTER_ADDRESS");

        // Read deployer private key from environment
        // Handles both with and without 0x prefix
        string memory privateKeyStr = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey;

        // Check if the key has 0x prefix
        if (
            bytes(privateKeyStr).length > 2 &&
            bytes(privateKeyStr)[0] == "0" &&
            bytes(privateKeyStr)[1] == "x"
        ) {
            // Has 0x prefix, parse as is
            deployerPrivateKey = vm.parseUint(privateKeyStr);
        } else {
            // No 0x prefix, add it
            string memory prefixedKey = string(
                abi.encodePacked("0x", privateKeyStr)
            );
            deployerPrivateKey = vm.parseUint(prefixedKey);
        }

        address operator = vm.envOr("OPERATOR_ADDRESS", address(0));

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy YieldOptimizer (ERC-7540)
        YieldOptimizer optimizer = new YieldOptimizer(
            asset,
            glueXRouter,
            "BIS Yield Optimizer",
            "BIS-YO"
        );

        console.log("=== YieldOptimizer Deployed ===");
        console.log("Contract Address:", address(optimizer));
        console.log("Asset:", asset);
        console.log("GlueX Router:", glueXRouter);

        // Whitelist GlueX vaults
        for (uint256 i = 0; i < glueXVaults.length; i++) {
            optimizer.setVaultWhitelist(glueXVaults[i], true);
            console.log("Whitelisted vault:", glueXVaults[i]);
        }

        // Optionally set an operator (defaults to owner if not provided)
        if (operator != address(0)) {
            optimizer.setOperator(operator);
            console.log("Operator set to:", operator);
        }

        vm.stopBroadcast();

        console.log("");
        console.log("Performance fee (bps):", optimizer.performanceFee());
        console.log("Rebalance delay (secs):", optimizer.rebalanceDelay());
    }
}
