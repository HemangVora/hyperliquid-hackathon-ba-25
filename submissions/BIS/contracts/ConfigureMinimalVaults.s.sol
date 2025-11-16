// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "./YieldOptimizerMinimal.sol";

/**
 * @title ConfigureMinimalVaults
 * @notice Configuration script to whitelist vaults for YieldOptimizerMinimal
 * @dev Run with: forge script ConfigureMinimalVaults --rpc-url $RPC_URL --broadcast --verify
 */
contract ConfigureMinimalVaults is Script {
    // Deployed YieldOptimizerMinimal address
    address constant OPTIMIZER_ADDRESS =
        0x916855dB77F2d5b63e8EF3472d6e7Df9fc6ccd79;

    // GlueX Vault addresses on Hyperliquid
    address[] public glueXVaults = [
        0xE25514992597786E07872e6C5517FE1906C0CAdD, // Vault 1
        0xCdc3975df9D1cf054F44ED238Edfb708880292EA, // Vault 2
        0x8F9291606862eEf771a97e5B71e4B98fd1Fa216a, // Vault 3
        0x9f75Eac57d1c6F7248bd2AEDe58C95689f3827f7, // Vault 4
        0x63Cf7EE583d9954FeBF649aD1c40C97a6493b1Be // Vault 5
    ];

    function run() external {
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

        YieldOptimizerMinimal optimizer = YieldOptimizerMinimal(
            OPTIMIZER_ADDRESS
        );

        console.log("=== Configuring YieldOptimizerMinimal Vaults ===");
        console.log("Optimizer Address:", OPTIMIZER_ADDRESS);
        console.log("Owner:", optimizer.owner());
        console.log("Asset:", address(optimizer.asset()));
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Whitelist all vaults
        console.log("Whitelisting GlueX vaults...");
        for (uint256 i = 0; i < glueXVaults.length; i++) {
            console.log("  [%d] Whitelisting:", i + 1, glueXVaults[i]);
            optimizer.whitelistVault(glueXVaults[i], true);
            console.log("      Status: WHITELISTED");
        }

        console.log("");
        console.log(
            "All %d vaults whitelisted successfully!",
            glueXVaults.length
        );

        vm.stopBroadcast();

        console.log("");
        console.log("=== Verification ===");
        console.log("Verify whitelisted vaults:");
        for (uint256 i = 0; i < glueXVaults.length; i++) {
            bool isWhitelisted = optimizer.whitelistedVaults(glueXVaults[i]);
            console.log(
                "  Vault %d:",
                i + 1,
                isWhitelisted ? "WHITELISTED" : "NOT WHITELISTED"
            );
        }

        console.log("");
        console.log("Total vault count:", optimizer.getVaultCount());
    }
}
