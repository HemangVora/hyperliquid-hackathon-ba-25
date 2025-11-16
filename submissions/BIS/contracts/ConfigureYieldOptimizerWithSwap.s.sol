// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "./YieldOptimizerWithSwap.sol";

/**
 * @title ConfigureYieldOptimizerWithSwap
 * @notice Configuration script - whitelist vaults and set parameters
 */
contract ConfigureYieldOptimizerWithSwap is Script {
    // GlueX Vault addresses
    address[] public glueXVaults = [
        0xE25514992597786E07872e6C5517FE1906C0CAdD,
        0xCdc3975df9D1cf054F44ED238Edfb708880292EA,
        0x8F9291606862eEf771a97e5B71e4B98fd1Fa216a,
        0x9f75Eac57d1c6F7248bd2AEDe58C95689f3827f7,
        0x63Cf7EE583d9954FeBF649aD1c40C97a6493b1Be
    ];

    function run() external {
        address vaultAddress = vm.envAddress("VAULT_ADDRESS");

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

        address operator = vm.envOr("OPERATOR_ADDRESS", address(0));

        YieldOptimizerWithSwap optimizer = YieldOptimizerWithSwap(vaultAddress);

        vm.startBroadcast(deployerPrivateKey);

        // Batch whitelist vaults using the batch function
        optimizer.batchWhitelistVaults(glueXVaults);
        console.log("Batch whitelisted", glueXVaults.length, "vaults");

        // Set operator if provided
        if (operator != address(0)) {
            optimizer.setOperator(operator);
            console.log("Operator set to:", operator);
        }

        // Set conservative slippage (0.5%)
        optimizer.setDefaultSlippage(50);
        console.log("Default slippage set to: 0.5%");

        vm.stopBroadcast();

        console.log("");
        console.log("Configuration complete!");
        console.log("Performance fee (bps):", optimizer.performanceFee());
        console.log("Rebalance delay (secs):", optimizer.rebalanceDelay());
        console.log("Default slippage (bps):", optimizer.defaultSlippageBps());
    }
}
