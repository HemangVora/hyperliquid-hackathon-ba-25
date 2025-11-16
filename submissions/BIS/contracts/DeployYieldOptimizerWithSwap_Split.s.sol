// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "./YieldOptimizerWithSwap.sol";

/**
 * @title DeployYieldOptimizerWithSwap_Split
 * @notice Deployment script - DEPLOY ONLY, configure separately
 */
contract DeployYieldOptimizerWithSwap_Split is Script {
    function run() external {
        address asset = vm.envAddress("ASSET_ADDRESS");
        address glueXRouter = vm.envAddress("GLUEX_ROUTER_ADDRESS");

        // Read deployer private key
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

        vm.startBroadcast(deployerPrivateKey);

        // ONLY DEPLOY - No configuration to avoid gas limit
        YieldOptimizerWithSwap optimizer = new YieldOptimizerWithSwap(
            asset,
            glueXRouter,
            "BIS Yield Optimizer V2",
            "BIS-YO-V2"
        );

        vm.stopBroadcast();

        console.log("=== YieldOptimizer with Swap Deployed ===");
        console.log("Contract Address:", address(optimizer));
        console.log("Asset:", asset);
        console.log("GlueX Router:", glueXRouter);
        console.log("");
        console.log("Next: Run configure script to whitelist vaults");
    }
}
