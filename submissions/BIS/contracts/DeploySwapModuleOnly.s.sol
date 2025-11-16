// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "./SwapModule.sol";

/**
 * @title DeploySwapModuleOnly
 * @notice Deploy ONLY SwapModule - minimizes gas usage
 */
contract DeploySwapModuleOnly is Script {
    function run() external {
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

        // Deploy ONLY SwapModule
        SwapModule swapModule = new SwapModule(
            glueXRouter,
            50 // 0.5% default slippage
        );

        vm.stopBroadcast();

        console.log("=== SwapModule Deployed ===");
        console.log("SwapModule Address:", address(swapModule));
        console.log("GlueX Router:", glueXRouter);
        console.log("Default slippage (bps):", swapModule.defaultSlippageBps());
        console.log("");
        console.log("SAVE THIS ADDRESS! You'll need it for the next step.");
        console.log("");
        console.log("Next: Deploy YieldOptimizer with this SwapModule address");
    }
}
