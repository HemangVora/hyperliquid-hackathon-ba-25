// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "./YieldOptimizerWithSwap.sol";
import "./SwapModule.sol";

/**
 * @title DeployYieldOptimizerWithSwap
 * @notice Deployment script for YieldOptimizer with token swapping
 */
contract DeployYieldOptimizerWithSwap is Script {
    // GlueX Vault addresses
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
        string memory privateKeyStr = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey;

        if (
            bytes(privateKeyStr).length > 2 &&
            bytes(privateKeyStr)[0] == "0" &&
            bytes(privateKeyStr)[1] == "x"
        ) {
            deployerPrivateKey = vm.parseUint(privateKeyStr);
        } else {
            string memory prefixedKey = string(
                abi.encodePacked("0x", privateKeyStr)
            );
            deployerPrivateKey = vm.parseUint(prefixedKey);
        }

        address operator = vm.envOr("OPERATOR_ADDRESS", address(0));

        vm.startBroadcast(deployerPrivateKey);

        // Deploy SwapModule first
        SwapModule swapModule = new SwapModule(
            glueXRouter,
            50 // 0.5% default slippage
        );

        console.log("=== SwapModule Deployed ===");
        console.log("SwapModule Address:", address(swapModule));
        console.log("GlueX Router:", glueXRouter);
        console.log("");

        // Deploy YieldOptimizerWithSwap
        YieldOptimizerWithSwap optimizer = new YieldOptimizerWithSwap(
            asset,
            address(swapModule),
            "BIS Yield Optimizer V2",
            "BIS-YO-V2"
        );

        console.log("=== YieldOptimizer with Swap Deployed ===");
        console.log("Contract Address:", address(optimizer));
        console.log("Asset:", asset);
        console.log("SwapModule:", address(swapModule));

        // Authorize optimizer to use swap module
        swapModule.setAuthorizedCaller(address(optimizer), true);
        console.log("Authorized optimizer in SwapModule");

        // Whitelist all GlueX vaults (including multi-token vaults)
        for (uint256 i = 0; i < glueXVaults.length; i++) {
            optimizer.setVaultWhitelist(glueXVaults[i], true);
            console.log("Whitelisted vault:", glueXVaults[i]);
        }

        // Set operator if provided
        if (operator != address(0)) {
            optimizer.setOperator(operator);
            console.log("Operator set to:", operator);
        }

        vm.stopBroadcast();

        console.log("");
        console.log("=== Configuration ===");
        console.log("Performance fee (bps):", optimizer.performanceFee());
        console.log("Rebalance delay (secs):", optimizer.rebalanceDelay());
        console.log("Default slippage (bps):", swapModule.defaultSlippageBps());
        console.log("");
        console.log(
            "Deployment complete! Contract can now swap tokens automatically."
        );
        console.log("SwapModule:", address(swapModule));
        console.log("YieldOptimizer:", address(optimizer));
    }
}
