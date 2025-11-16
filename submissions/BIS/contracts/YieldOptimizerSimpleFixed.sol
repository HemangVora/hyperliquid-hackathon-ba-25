// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IVault.sol";

/**
 * @title YieldOptimizerSimple (Fixed)
 * @notice A simplified yield optimization vault with instant deposits/withdrawals - WITH FIXES
 * @dev Fixed version that handles vault errors gracefully
 */
contract YieldOptimizerSimpleFixed is ERC20, Ownable, ReentrancyGuard {
    // ============================================
    // STATE VARIABLES
    // ============================================

    /// @notice The underlying asset (e.g., USDC, USDT)
    IERC20 public immutable asset;

    /// @notice Mapping of whitelisted vaults that can receive allocations
    mapping(address => bool) public whitelistedVaults;

    /// @notice Array of all whitelisted vault addresses (used for iteration only)
    address[] private vaultList;

    /// @notice Operator address authorized to execute rebalancing
    address public operator;

    /// @notice Performance fee in basis points (e.g., 200 = 2%)
    uint256 public performanceFee;

    /// @notice Fee recipient address
    address public feeRecipient;

    /// @notice Minimum delay between rebalances (in seconds)
    uint256 public rebalanceDelay;

    /// @notice Timestamp of last rebalance
    uint256 public lastRebalance;

    /// @notice Total value locked at last fee collection
    uint256 public lastTVL;

    /// @notice Skip performance fee collection on rebalance (emergency mode)
    bool public skipFeeCollection;

    // ============================================
    // EVENTS
    // ============================================

    event Deposited(address indexed user, uint256 assets, uint256 shares);
    event Withdrawn(address indexed user, uint256 shares, uint256 assets);
    event VaultWhitelisted(address indexed vault, bool status);
    event Rebalanced(address[] vaults, uint256[] amounts);
    event OperatorUpdated(address indexed newOperator);
    event PerformanceFeeUpdated(uint256 newFee);
    event FeeCollected(
        address indexed recipient,
        uint256 shares,
        uint256 value
    );
    event VaultError(address indexed vault, string reason);

    // ============================================
    // ERRORS
    // ============================================

    error Unauthorized();
    error VaultNotWhitelisted();
    error InvalidAmount();
    error RebalanceTooSoon();
    error InvalidFee();
    error InsufficientBalance();
    error TransferFailed();

    // ============================================
    // MODIFIERS
    // ============================================

    modifier onlyOperator() {
        if (msg.sender != operator && msg.sender != owner())
            revert Unauthorized();
        _;
    }

    // ============================================
    // CONSTRUCTOR
    // ============================================

    constructor(
        address _asset,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        asset = IERC20(_asset);
        operator = msg.sender;
        feeRecipient = msg.sender;
        performanceFee = 200; // 2% default
        rebalanceDelay = 24 hours; // Conservative switching: 24-hour minimum
        skipFeeCollection = false;
    }

    // ============================================
    // USER FUNCTIONS
    // ============================================

    /**
     * @notice Deposit assets and receive vault shares
     * @param assets Amount of assets to deposit
     * @return shares Amount of shares minted
     */
    function deposit(
        uint256 assets
    ) external nonReentrant returns (uint256 shares) {
        if (assets == 0) revert InvalidAmount();

        // Calculate shares to mint
        shares = convertToShares(assets);

        // Transfer assets from user
        if (!asset.transferFrom(msg.sender, address(this), assets))
            revert TransferFailed();

        // Mint shares to user
        _mint(msg.sender, shares);

        emit Deposited(msg.sender, assets, shares);
    }

    /**
     * @notice Withdraw assets by burning vault shares
     * @param shares Amount of shares to burn
     * @return assets Amount of assets returned
     */
    function withdraw(
        uint256 shares
    ) external nonReentrant returns (uint256 assets) {
        if (shares == 0 || balanceOf(msg.sender) < shares)
            revert InvalidAmount();

        // Calculate assets to return
        assets = convertToAssets(shares);

        // Burn shares
        _burn(msg.sender, shares);

        // Check if we have enough idle assets
        uint256 available = asset.balanceOf(address(this));
        if (available < assets) {
            // Need to withdraw from vaults
            _withdrawFromVaults(assets - available);
        }

        // Transfer assets to user
        if (!asset.transfer(msg.sender, assets)) revert TransferFailed();

        emit Withdrawn(msg.sender, shares, assets);
    }

    // ============================================
    // YIELD OPTIMIZATION FUNCTIONS
    // ============================================

    /**
     * @notice Rebalance assets across vaults (FIXED VERSION)
     * @param targetVaults Array of vault addresses to allocate to
     * @param targetAmounts Array of amounts to allocate to each vault
     */
    function rebalance(
        address[] calldata targetVaults,
        uint256[] calldata targetAmounts
    ) external onlyOperator nonReentrant {
        if (block.timestamp < lastRebalance + rebalanceDelay)
            revert RebalanceTooSoon();
        if (targetVaults.length != targetAmounts.length) revert InvalidAmount();

        // Collect performance fees before rebalancing (if not in emergency mode)
        if (!skipFeeCollection) {
            try this._collectPerformanceFeeExternal() {
                // Fee collection succeeded
            } catch Error(string memory reason) {
                emit VaultError(address(0), reason);
                // Continue with rebalance even if fee collection fails
            } catch {
                emit VaultError(address(0), "Fee collection failed");
                // Continue with rebalance
            }
        }

        // Withdraw from all current allocations (with error handling)
        for (uint256 i = 0; i < vaultList.length; i++) {
            address vault = vaultList[i];
            if (whitelistedVaults[vault]) {
                try IVault(vault).balanceOf(address(this)) returns (
                    uint256 shares
                ) {
                    if (shares > 0) {
                        try
                            IVault(vault).redeem(
                                shares,
                                address(this),
                                address(this)
                            )
                        {
                            // Success
                        } catch Error(string memory reason) {
                            emit VaultError(vault, reason);
                        } catch {
                            emit VaultError(vault, "Redeem failed");
                        }
                    }
                } catch {
                    emit VaultError(vault, "balanceOf failed");
                }
            }
        }

        // Calculate total available assets
        uint256 totalAvailable = asset.balanceOf(address(this));
        uint256 totalAllocating = 0;

        for (uint256 i = 0; i < targetAmounts.length; i++) {
            totalAllocating += targetAmounts[i];
        }

        if (totalAllocating > totalAvailable) revert InvalidAmount();

        // Allocate to new target vaults
        for (uint256 i = 0; i < targetVaults.length; i++) {
            address vault = targetVaults[i];
            uint256 amount = targetAmounts[i];

            if (!whitelistedVaults[vault]) revert VaultNotWhitelisted();
            if (amount == 0) continue;

            // Approve and deposit to vault
            asset.approve(vault, amount);
            try IVault(vault).deposit(amount, address(this)) {
                // Success
            } catch Error(string memory reason) {
                emit VaultError(vault, reason);
                revert(reason);
            } catch {
                emit VaultError(vault, "Deposit failed");
                revert("Deposit failed");
            }
        }

        lastRebalance = block.timestamp;

        emit Rebalanced(targetVaults, targetAmounts);
    }

    /**
     * @notice Emergency withdraw from a specific vault
     * @param vault The vault to withdraw from
     */
    function emergencyWithdraw(address vault) external onlyOwner nonReentrant {
        uint256 shares = IVault(vault).balanceOf(address(this));
        if (shares > 0) {
            IVault(vault).redeem(shares, address(this), address(this));
        }
    }

    /**
     * @notice Manually collect performance fees
     */
    function collectFees() external onlyOperator {
        _collectPerformanceFee();
    }

    /**
     * @notice External wrapper for fee collection (for try/catch)
     */
    function _collectPerformanceFeeExternal() external {
        if (msg.sender != address(this)) revert Unauthorized();
        _collectPerformanceFee();
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Whitelist or remove a vault
     * @param vault Vault address
     * @param status True to whitelist, false to remove
     */
    function setVaultWhitelist(address vault, bool status) external onlyOwner {
        if (status && !whitelistedVaults[vault]) {
            vaultList.push(vault);
        }
        whitelistedVaults[vault] = status;
        emit VaultWhitelisted(vault, status);
    }

    /**
     * @notice Batch whitelist multiple vaults (e.g., GlueX vaults)
     * @param vaults Array of vault addresses to whitelist
     */
    function batchWhitelistVaults(
        address[] calldata vaults
    ) external onlyOwner {
        for (uint256 i = 0; i < vaults.length; i++) {
            if (!whitelistedVaults[vaults[i]]) {
                whitelistedVaults[vaults[i]] = true;
                vaultList.push(vaults[i]);
                emit VaultWhitelisted(vaults[i], true);
            }
        }
    }

    /**
     * @notice Update operator address
     * @param _operator New operator address
     */
    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
        emit OperatorUpdated(_operator);
    }

    /**
     * @notice Update performance fee
     * @param _fee New fee in basis points (e.g., 200 = 2%)
     */
    function setPerformanceFee(uint256 _fee) external onlyOwner {
        if (_fee > 1000) revert InvalidFee(); // Max 10%
        performanceFee = _fee;
        emit PerformanceFeeUpdated(_fee);
    }

    /**
     * @notice Update fee recipient
     * @param _feeRecipient New fee recipient address
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice Update rebalance delay
     * @param _delay New delay in seconds
     */
    function setRebalanceDelay(uint256 _delay) external onlyOwner {
        rebalanceDelay = _delay;
    }

    /**
     * @notice Toggle fee collection on rebalance (emergency use)
     * @param _skip True to skip fee collection
     */
    function setSkipFeeCollection(bool _skip) external onlyOwner {
        skipFeeCollection = _skip;
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Get total assets under management (with error handling)
     * @return total Total assets in vault and all positions
     */
    function totalAssets() public view returns (uint256 total) {
        // Assets sitting idle in the vault
        total = asset.balanceOf(address(this));

        // Add assets deployed in all vaults (with try/catch for view functions via assembly)
        for (uint256 i = 0; i < vaultList.length; i++) {
            address vault = vaultList[i];
            if (whitelistedVaults[vault]) {
                // Try to get balance and convert to assets
                (bool success, bytes memory data) = vault.staticcall(
                    abi.encodeWithSelector(
                        IVault.balanceOf.selector,
                        address(this)
                    )
                );
                if (success && data.length >= 32) {
                    uint256 shares = abi.decode(data, (uint256));
                    if (shares > 0) {
                        (bool success2, bytes memory data2) = vault.staticcall(
                            abi.encodeWithSelector(
                                IVault.convertToAssets.selector,
                                shares
                            )
                        );
                        if (success2 && data2.length >= 32) {
                            uint256 vaultAssets = abi.decode(data2, (uint256));
                            total += vaultAssets;
                        }
                    }
                }
                // If call fails, skip this vault and continue
            }
        }
    }

    /**
     * @notice Convert assets to shares
     * @param assets Amount of assets
     * @return shares Equivalent vault shares
     */
    function convertToShares(
        uint256 assets
    ) public view returns (uint256 shares) {
        uint256 supply = totalSupply();
        if (supply == 0) {
            return assets; // 1:1 for first deposit
        }
        uint256 _totalAssets = totalAssets();
        if (_totalAssets == 0) {
            return assets;
        }
        return (assets * supply) / _totalAssets;
    }

    /**
     * @notice Convert shares to assets
     * @param shares Amount of shares
     * @return assets Equivalent underlying assets
     */
    function convertToAssets(
        uint256 shares
    ) public view returns (uint256 assets) {
        uint256 supply = totalSupply();
        if (supply == 0) return 0;
        return (shares * totalAssets()) / supply;
    }

    /**
     * @notice Withdraw a specific amount from vaults (for user withdrawals)
     * @param needed Amount of assets needed
     */
    function _withdrawFromVaults(uint256 needed) internal {
        uint256 withdrawn = 0;

        for (uint256 i = 0; i < vaultList.length && withdrawn < needed; i++) {
            address vault = vaultList[i];
            if (whitelistedVaults[vault]) {
                try IVault(vault).balanceOf(address(this)) returns (
                    uint256 shares
                ) {
                    if (shares > 0) {
                        try IVault(vault).convertToAssets(shares) returns (
                            uint256 vaultAssets
                        ) {
                            uint256 toWithdraw = vaultAssets >
                                (needed - withdrawn)
                                ? (needed - withdrawn)
                                : vaultAssets;

                            try
                                IVault(vault).convertToShares(toWithdraw)
                            returns (uint256 sharesToRedeem) {
                                try
                                    IVault(vault).redeem(
                                        sharesToRedeem,
                                        address(this),
                                        address(this)
                                    )
                                returns (uint256 assetsReceived) {
                                    withdrawn += assetsReceived;
                                } catch {
                                    emit VaultError(
                                        vault,
                                        "Redeem failed in withdraw"
                                    );
                                }
                            } catch {
                                emit VaultError(
                                    vault,
                                    "convertToShares failed"
                                );
                            }
                        } catch {
                            emit VaultError(vault, "convertToAssets failed");
                        }
                    }
                } catch {
                    emit VaultError(vault, "balanceOf failed in withdraw");
                }
            }
        }

        if (withdrawn < needed) {
            revert InsufficientBalance();
        }
    }

    /**
     * @notice Collect performance fees based on profit since last collection
     */
    function _collectPerformanceFee() internal {
        if (performanceFee == 0) return;

        uint256 currentTVL = totalAssets();

        // Calculate profit since last fee collection
        if (currentTVL > lastTVL && lastTVL > 0) {
            uint256 profit = currentTVL - lastTVL;
            uint256 feeInAssets = (profit * performanceFee) / 10000;

            if (feeInAssets > 0 && totalSupply() > 0) {
                // Mint shares worth the fee amount to fee recipient
                uint256 feeShares = (feeInAssets * totalSupply()) / currentTVL;
                if (feeShares > 0) {
                    _mint(feeRecipient, feeShares);
                    emit FeeCollected(feeRecipient, feeShares, feeInAssets);
                }
            }
        }

        // Update last TVL
        lastTVL = currentTVL;
    }
}
