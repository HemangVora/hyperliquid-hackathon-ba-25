// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "./YieldOptimizerSimple.sol";
import "./IVault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DebugRebalance
 * @notice Debug script to identify why rebalance is failing
 */
contract DebugRebalance is Script {
    address constant VAULT_ADDRESS = 0x8fE9D0A48fF4D892b242be35Bc8AB582646f3B2c;
    address constant TARGET_VAULT = 0x63Cf7EE583d9954FeBF649aD1c40C97a6493b1Be;
    uint256 constant TARGET_AMOUNT = 10000000; // 10 USDC

    function run() external view {
        YieldOptimizerSimple optimizer = YieldOptimizerSimple(VAULT_ADDRESS);

        console.log("=== Rebalance Debug Info ===");
        console.log("Optimizer Address:", VAULT_ADDRESS);
        console.log("Target Vault:", TARGET_VAULT);
        console.log("Target Amount:", TARGET_AMOUNT);
        console.log("");

        // Check 1: Operator authorization
        address operator = optimizer.operator();
        address owner = optimizer.owner();
        console.log("Operator:", operator);
        console.log("Owner:", owner);
        console.log("");

        // Check 2: Rebalance delay
        uint256 lastRebalance = optimizer.lastRebalance();
        uint256 rebalanceDelay = optimizer.rebalanceDelay();
        uint256 timeSinceRebalance = block.timestamp - lastRebalance;
        console.log("Last Rebalance:", lastRebalance);
        console.log("Rebalance Delay Required:", rebalanceDelay);
        console.log("Time Since Last Rebalance:", timeSinceRebalance);
        console.log("Can Rebalance:", timeSinceRebalance >= rebalanceDelay);
        console.log("");

        // Check 3: Vault whitelisting
        bool isWhitelisted = optimizer.whitelistedVaults(TARGET_VAULT);
        console.log("Target Vault Whitelisted:", isWhitelisted);
        console.log("");

        // Check 4: Available assets
        IERC20 asset = optimizer.asset();
        console.log("Asset Token:", address(asset));
        uint256 assetBalance = asset.balanceOf(VAULT_ADDRESS);
        uint256 totalAssets = optimizer.totalAssets();
        console.log("Asset Balance (idle):", assetBalance);
        console.log("Total Assets (including vaults):", totalAssets);
        console.log("Has Enough Assets:", totalAssets >= TARGET_AMOUNT);
        console.log("");

        // Check 5: Performance fee info
        uint256 performanceFee = optimizer.performanceFee();
        uint256 lastTVL = optimizer.lastTVL();
        address feeRecipient = optimizer.feeRecipient();
        console.log("Performance Fee (bps):", performanceFee);
        console.log("Last TVL:", lastTVL);
        console.log("Fee Recipient:", feeRecipient);
        console.log("");

        // Check 6: Vault shares and need to withdraw
        console.log("=== Checking Current Vault Allocations ===");
        address[] memory vaults = _getGlueXVaults();
        for (uint256 i = 0; i < vaults.length; i++) {
            try IVault(vaults[i]).balanceOf(VAULT_ADDRESS) returns (
                uint256 shares
            ) {
                if (shares > 0) {
                    console.log("Vault:", vaults[i]);
                    console.log("  Shares:", shares);
                    try IVault(vaults[i]).convertToAssets(shares) returns (
                        uint256 assets
                    ) {
                        console.log("  Assets:", assets);
                    } catch {
                        console.log("  [ERROR: convertToAssets failed]");
                    }
                }
            } catch {
                console.log("Vault:", vaults[i]);
                console.log("  [ERROR: balanceOf failed]");
            }
        }

        // Summary
        console.log("");
        console.log("=== Likely Issues ===");
        if (timeSinceRebalance < rebalanceDelay) {
            console.log("[X] ISSUE: Rebalance delay not met");
            uint256 timeRemaining = rebalanceDelay - timeSinceRebalance;
            console.log("   Time remaining:", timeRemaining, "seconds");
        }
        if (!isWhitelisted) {
            console.log("[X] ISSUE: Target vault not whitelisted");
        }
        if (totalAssets < TARGET_AMOUNT) {
            console.log("[X] ISSUE: Insufficient assets");
            console.log("   Need:", TARGET_AMOUNT);
            console.log("   Have:", totalAssets);
        }
        if (assetBalance < TARGET_AMOUNT && totalAssets >= TARGET_AMOUNT) {
            console.log(
                "[!] WARNING: Assets are in vaults, will need to withdraw first"
            );
        }
    }

    function _getGlueXVaults() internal pure returns (address[] memory) {
        address[] memory vaults = new address[](5);
        vaults[0] = 0xE25514992597786E07872e6C5517FE1906C0CAdD;
        vaults[1] = 0xCdc3975df9D1cf054F44ED238Edfb708880292EA;
        vaults[2] = 0x8F9291606862eEf771a97e5B71e4B98fd1Fa216a;
        vaults[3] = 0x9f75Eac57d1c6F7248bd2AEDe58C95689f3827f7;
        vaults[4] = 0x63Cf7EE583d9954FeBF649aD1c40C97a6493b1Be;
        return vaults;
    }
}
