// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "./SwapModule.sol";

/**
 * @title AuthorizeOptimizer
 * @notice Authorize YieldOptimizer to use SwapModule
 */
contract AuthorizeOptimizer is Script {
    function run() external {
        address swapModule = vm.envAddress("SWAP_MODULE_ADDRESS");
        address optimizer = vm.envAddress("OPTIMIZER_ADDRESS");

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

        SwapModule swap = SwapModule(swapModule);

        vm.startBroadcast(deployerPrivateKey);

        // Authorize optimizer
        swap.setAuthorizedCaller(optimizer, true);

        vm.stopBroadcast();

        console.log("=== Authorization Complete ===");
        console.log("SwapModule:", swapModule);
        console.log("Authorized:", optimizer);
        console.log("");
        console.log(
            "Next: Whitelist vaults using ConfigureYieldOptimizerWithSwap"
        );
    }
}
