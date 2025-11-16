// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "./YieldOptimizerWithSwap.sol";

/**
 * @title DeployOptimizerOnly
 * @notice Deploy ONLY YieldOptimizer - requires SwapModule address
 */
contract DeployOptimizerOnly is Script {
    function run() external {
        address asset = vm.envAddress("ASSET_ADDRESS");
        address swapModule = vm.envAddress("SWAP_MODULE_ADDRESS");

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

        // Deploy ONLY YieldOptimizer
        YieldOptimizerWithSwap optimizer = new YieldOptimizerWithSwap(
            asset,
            swapModule,
            "BIS Yield Optimizer V2",
            "BIS-YO-V2"
        );

        vm.stopBroadcast();

        console.log("=== YieldOptimizer Deployed ===");
        console.log("Contract Address:", address(optimizer));
        console.log("Asset:", asset);
        console.log("SwapModule:", swapModule);
        console.log("");
        console.log("SAVE THIS ADDRESS! You'll need it for configuration.");
        console.log("");
        console.log("Next: Authorize and configure with separate scripts");
    }
}
