// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "./YieldOptimizerSimple.sol";

/**
 * @title ConfigureVaults
 * @notice Configuration script to whitelist vaults after deployment
 * @dev Run with: forge script ConfigureVaults --rpc-url $RPC_URL --broadcast
 */
contract ConfigureVaults is Script {
    // GlueX Vault addresses
    address[] public glueXVaults = [
        0xE25514992597786E07872e6C5517FE1906C0CAdD,
        0xCdc3975df9D1cf054F44ED238Edfb708880292EA,
        0x8F9291606862eEf771a97e5B71e4B98fd1Fa216a,
        0x9f75Eac57d1c6F7248bd2AEDe58C95689f3827f7,
        0x63Cf7EE583d9954FeBF649aD1c40C97a6493b1Be
    ];

    function run() external {
        // Get the deployed vault address from environment
        address vaultAddress = vm.envAddress("VAULT_ADDRESS");

        // Read deployer private key
        string memory privateKeyStr = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey;

        // Check if the key has 0x prefix
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

        YieldOptimizerSimple optimizer = YieldOptimizerSimple(vaultAddress);

        console.log("=== Configuring Vaults ===");
        console.log("Vault Address:", vaultAddress);

        vm.startBroadcast(deployerPrivateKey);

        // Whitelist all vaults one by one
        console.log("Whitelisting vaults...");
        for (uint256 i = 0; i < glueXVaults.length; i++) {
            console.log("Whitelisting vault", i + 1, ":", glueXVaults[i]);
            optimizer.setVaultWhitelist(glueXVaults[i], true);
        }

        console.log("All vaults whitelisted successfully!");

        vm.stopBroadcast();

        console.log("");
        console.log("=== Additional Configuration ===");
        console.log("Run these commands separately:");
        console.log("1. Set operator: optimizer.setOperator(operatorAddress)");
        console.log("2. Set performance fee: optimizer.setPerformanceFee(200)");
        console.log(
            "3. Set rebalance delay: optimizer.setRebalanceDelay(3600)"
        );
    }
}
