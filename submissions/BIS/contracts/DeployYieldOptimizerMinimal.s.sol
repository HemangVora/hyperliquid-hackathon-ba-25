// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "./YieldOptimizerMinimal.sol";

/**
 * @title DeployYieldOptimizerMinimal
 * @notice Deployment script for minimal version
 */
contract DeployYieldOptimizerMinimal is Script {
    function run() external {
        address asset = vm.envAddress("ASSET_ADDRESS");
        address glueXRouter = vm.envAddress("GLUEX_ROUTER_ADDRESS");

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

        YieldOptimizerMinimal optimizer = new YieldOptimizerMinimal(
            asset,
            glueXRouter,
            "BIS Yield Optimizer Minimal",
            "BIS-YO-MIN"
        );

        vm.stopBroadcast();

        console.log("=== YieldOptimizer Minimal Deployed ===");
        console.log("Contract Address:", address(optimizer));
        console.log("Asset:", asset);
        console.log("GlueX Router:", glueXRouter);
    }
}
