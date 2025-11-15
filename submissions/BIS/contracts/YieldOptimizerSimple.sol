// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IVault.sol";

/**
 * @title YieldOptimizerSimple
 * @notice A simplified yield optimization vault with instant deposits/withdrawals
 * @dev Alternative to ERC-7540 pattern - easier to use but less gas efficient
 */
contract YieldOptimizerSimple is ERC20, Ownable, ReentrancyGuard {
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
        rebalanceDelay = 24 hours;  // Conservative switching: 24-hour minimum
    }

    // ============================================
    // DEPOSIT/WITHDRAW FUNCTIONS
    // ============================================

    /**
     * @notice Deposit assets and receive vault shares instantly
     * @param assets Amount of underlying asset to deposit
     * @return shares Amount of vault shares minted
     */
    function deposit(
        uint256 assets
    ) external nonReentrant returns (uint256 shares) {
        if (assets == 0) revert InvalidAmount();

        // Calculate shares to mint (before transfer to get accurate total)
        shares = convertToShares(assets);

        // Transfer assets from user
        bool success = asset.transferFrom(msg.sender, address(this), assets);
        if (!success) revert TransferFailed();

        // Mint shares to user
        _mint(msg.sender, shares);

        emit Deposited(msg.sender, assets, shares);
    }

    /**
     * @notice Withdraw assets by burning vault shares
     * @param shares Amount of vault shares to burn
     * @return assets Amount of underlying assets returned
     */
    function withdraw(
        uint256 shares
    ) external nonReentrant returns (uint256 assets) {
        if (shares == 0) revert InvalidAmount();
        if (balanceOf(msg.sender) < shares) revert InsufficientBalance();

        // Calculate assets to return
        assets = convertToAssets(shares);

        // Check if we need to withdraw from vaults
        uint256 availableBalance = asset.balanceOf(address(this));
        if (availableBalance < assets) {
            _withdrawFromVaults(assets - availableBalance);
        }

        // Burn shares
        _burn(msg.sender, shares);

        // Transfer assets to user
        bool success = asset.transfer(msg.sender, assets);
        if (!success) revert TransferFailed();

        emit Withdrawn(msg.sender, shares, assets);
    }

    // ============================================
    // YIELD OPTIMIZATION FUNCTIONS
    // ============================================

    /**
     * @notice Rebalance assets across vaults based on GlueX Yields API data
     * @param targetVaults Array of vault addresses to allocate to
     * @param targetAmounts Array of amounts to allocate to each vault
     * @dev Called by operator after querying GlueX Yields API off-chain
     */
    function rebalance(
        address[] calldata targetVaults,
        uint256[] calldata targetAmounts
    ) external onlyOperator nonReentrant {
        if (block.timestamp < lastRebalance + rebalanceDelay)
            revert RebalanceTooSoon();
        if (targetVaults.length != targetAmounts.length) revert InvalidAmount();

        // Collect performance fees before rebalancing
        _collectPerformanceFee();

        // Withdraw from all current allocations
        for (uint256 i = 0; i < vaultList.length; i++) {
            address vault = vaultList[i];
            if (whitelistedVaults[vault]) {
                uint256 shares = IVault(vault).balanceOf(address(this));
                if (shares > 0) {
                    IVault(vault).redeem(shares, address(this), address(this));
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
            IVault(vault).deposit(amount, address(this));
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
     */
    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
        emit OperatorUpdated(_operator);
    }

    /**
     * @notice Update performance fee (max 10%)
     */
    function setPerformanceFee(uint256 _fee) external onlyOwner {
        if (_fee > 1000) revert InvalidFee(); // Max 10%
        performanceFee = _fee;
        emit PerformanceFeeUpdated(_fee);
    }

    /**
     * @notice Update fee recipient
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice Update rebalance delay
     */
    function setRebalanceDelay(uint256 _delay) external onlyOwner {
        rebalanceDelay = _delay;
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Get total assets under management
     * @return total Total assets in vault and all positions
     */
    function totalAssets() public view returns (uint256 total) {
        // Assets sitting idle in the vault
        total = asset.balanceOf(address(this));

        // Add assets deployed in all vaults
        for (uint256 i = 0; i < vaultList.length; i++) {
            address vault = vaultList[i];
            if (whitelistedVaults[vault]) {
                uint256 shares = IVault(vault).balanceOf(address(this));
                if (shares > 0) {
                    total += IVault(vault).convertToAssets(shares);
                }
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
        return (assets * supply) / totalAssets();
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
                uint256 shares = IVault(vault).balanceOf(address(this));
                if (shares > 0) {
                    uint256 vaultAssets = IVault(vault).convertToAssets(shares);
                    uint256 toWithdraw = vaultAssets > (needed - withdrawn)
                        ? (needed - withdrawn)
                        : vaultAssets;

                    uint256 sharesToRedeem = IVault(vault).convertToShares(
                        toWithdraw
                    );
                    uint256 assetsReceived = IVault(vault).redeem(
                        sharesToRedeem,
                        address(this),
                        address(this)
                    );
                    withdrawn += assetsReceived;
                }
            }
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

            if (feeInAssets > 0) {
                // Mint shares worth the fee amount to fee recipient
                uint256 feeShares = convertToShares(feeInAssets);
                _mint(feeRecipient, feeShares);

                emit FeeCollected(feeRecipient, feeShares, feeInAssets);
            }
        }

        // Update last TVL
        lastTVL = totalAssets();
    }
}
