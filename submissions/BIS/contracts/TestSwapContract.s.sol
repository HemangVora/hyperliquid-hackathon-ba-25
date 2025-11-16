// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "./YieldOptimizer.sol";
import "./YieldOptimizerWithSwap.sol";
import "./IVault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TestSwapContract
 * @notice Test script to verify the swap contract logic
 */
contract TestSwapContract is Script {
    address constant VAULT_ADDRESS = 0x806ff0f92771F84aCe0E19aD9878eAdFeD4cc19D;

    // GlueX Vaults
    address constant VAULT_1 = 0xE25514992597786E07872e6C5517FE1906C0CAdD;
    address constant VAULT_2 = 0xCdc3975df9D1cf054F44ED238Edfb708880292EA; // USDC vault
    address constant VAULT_3 = 0x8F9291606862eEf771a97e5B71e4B98fd1Fa216a;
    address constant VAULT_4 = 0x9f75Eac57d1c6F7248bd2AEDe58C95689f3827f7;
    address constant VAULT_5 = 0x63Cf7EE583d9954FeBF649aD1c40C97a6493b1Be;

    function run() external view {
        console.log("=== YieldOptimizer Token Compatibility Test ===");
        console.log("");

        // Test current contract
        YieldOptimizer oldOptimizer = YieldOptimizer(VAULT_ADDRESS);
        IERC20 baseAsset = oldOptimizer.asset();

        console.log("Base Asset (USDC):", address(baseAsset));
        console.log("");

        // Check each vault's token
        console.log("=== Vault Token Analysis ===");
        address[] memory vaults = new address[](5);
        vaults[0] = VAULT_1;
        vaults[1] = VAULT_2;
        vaults[2] = VAULT_3;
        vaults[3] = VAULT_4;
        vaults[4] = VAULT_5;

        uint256 compatibleCount = 0;
        for (uint256 i = 0; i < vaults.length; i++) {
            console.log("Vault", i + 1, ":", vaults[i]);

            try IVault(vaults[i]).asset() returns (address vaultAsset) {
                console.log("  Required Token:", vaultAsset);

                bool compatible = vaultAsset == address(baseAsset);
                console.log(
                    "  Compatible:",
                    compatible ? "YES" : "NO - REQUIRES SWAP"
                );

                if (compatible) {
                    compatibleCount++;
                } else {
                    // Try to get token symbol
                    console.log("  -> This vault needs token swapping");
                }
            } catch {
                console.log("  ERROR: Could not read vault asset");
            }
            console.log("");
        }

        console.log("=== Summary ===");
        console.log(
            "Compatible vaults (no swap needed):",
            compatibleCount,
            "/",
            vaults.length
        );
        console.log(
            "Incompatible vaults (swap needed):",
            vaults.length - compatibleCount,
            "/",
            vaults.length
        );
        console.log("");

        if (compatibleCount < vaults.length) {
            console.log(
                "RECOMMENDATION: Deploy YieldOptimizerWithSwap to support all vaults"
            );
        } else {
            console.log("All vaults compatible - original contract sufficient");
        }
    }
}
