// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./IVault.sol";
import "./IGlueXRouter.sol";

/**
 * @title YieldOptimizer
 * @notice A yield optimization vault that automatically reallocates assets across whitelisted vaults
 * @dev Implements ERC-7540 async deposit/redeem pattern for gas-efficient batch operations
 */
contract YieldOptimizer is ERC20, Ownable, ReentrancyGuard {
    // ============================================
    // STATE VARIABLES
    // ============================================

    /// @notice The underlying asset (e.g., USDC, USDT)
    IERC20 public immutable asset;

    /// @notice GlueX Router for executing swaps/reallocations
    IGlueXRouter public glueXRouter;

    /// @notice Mapping of whitelisted vaults that can receive allocations
    mapping(address => bool) public whitelistedVaults;

    /// @notice Array of all whitelisted vault addresses
    address[] public vaultList;

    /// @notice Current active allocations: vault => amount
    mapping(address => uint256) public allocations;

    /// @notice Operator address authorized to execute rebalancing
    address public operator;

    /// @notice Pending deposit requests (ERC-7540 pattern)
    mapping(address => uint256) public pendingDepositRequests;

    /// @notice Pending redemption requests (ERC-7540 pattern)
    mapping(address => uint256) public pendingRedeemRequests;

    /// @notice Total pending deposits waiting to be processed
    uint256 public totalPendingDeposits;

    /// @notice Total pending redemptions waiting to be processed
    uint256 public totalPendingRedeems;

    /// @notice Epoch counter for batch processing
    uint256 public currentEpoch;

    /// @notice Performance fee in basis points (e.g., 200 = 2%)
    uint256 public performanceFee;

    /// @notice Fee recipient address
    address public feeRecipient;

    /// @notice Minimum delay between rebalances (in seconds)
    uint256 public rebalanceDelay;

    /// @notice Timestamp of last rebalance
    uint256 public lastRebalance;

    // ============================================
    // EVENTS
    // ============================================

    event DepositRequested(address indexed user, uint256 assets, uint256 epoch);
    event RedeemRequested(address indexed user, uint256 shares, uint256 epoch);
    event DepositProcessed(
        address indexed user,
        uint256 assets,
        uint256 shares
    );
    event RedeemProcessed(address indexed user, uint256 shares, uint256 assets);
    event VaultWhitelisted(address indexed vault, bool status);
    event Rebalanced(address[] vaults, uint256[] amounts);
    event OperatorUpdated(address indexed newOperator);
    event PerformanceFeeUpdated(uint256 newFee);
    event FeeCollected(address indexed recipient, uint256 amount);

    // ============================================
    // ERRORS
    // ============================================

    error Unauthorized();
    error VaultNotWhitelisted();
    error InvalidAmount();
    error RebalanceTooSoon();
    error InvalidFee();
    error NoPendingRequest();

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
        address _glueXRouter,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {
        asset = IERC20(_asset);
        glueXRouter = IGlueXRouter(_glueXRouter);
        operator = msg.sender;
        feeRecipient = msg.sender;
        performanceFee = 200; // 2% default
        rebalanceDelay = 1 hours;
        currentEpoch = 1;
    }

    // ============================================
    // ERC-7540 ASYNC DEPOSIT/REDEEM FUNCTIONS
    // ============================================

    /**
     * @notice Request a deposit (async, batched later)
     * @param assets Amount of underlying asset to deposit
     */
    function requestDeposit(uint256 assets) external nonReentrant {
        if (assets == 0) revert InvalidAmount();

        // Transfer assets from user
        asset.transferFrom(msg.sender, address(this), assets);

        // Record pending deposit
        pendingDepositRequests[msg.sender] += assets;
        totalPendingDeposits += assets;

        emit DepositRequested(msg.sender, assets, currentEpoch);
    }

    /**
     * @notice Request a redemption (async, batched later)
     * @param shares Amount of vault shares to redeem
     */
    function requestRedeem(uint256 shares) external nonReentrant {
        if (shares == 0) revert InvalidAmount();
        if (balanceOf(msg.sender) < shares) revert InvalidAmount();

        // Transfer shares from user to vault (burned later)
        _transfer(msg.sender, address(this), shares);

        // Record pending redemption
        pendingRedeemRequests[msg.sender] += shares;
        totalPendingRedeems += shares;

        emit RedeemRequested(msg.sender, shares, currentEpoch);
    }

    /**
     * @notice Claim processed deposit (receive vault shares)
     */
    function claimDeposit() external nonReentrant {
        uint256 assets = pendingDepositRequests[msg.sender];
        if (assets == 0) revert NoPendingRequest();

        // Calculate shares to mint
        uint256 shares = convertToShares(assets);

        // Clear pending request
        pendingDepositRequests[msg.sender] = 0;

        // Mint shares to user
        _mint(msg.sender, shares);

        emit DepositProcessed(msg.sender, assets, shares);
    }

    /**
     * @notice Claim processed redemption (receive underlying assets)
     */
    function claimRedeem() external nonReentrant {
        uint256 shares = pendingRedeemRequests[msg.sender];
        if (shares == 0) revert NoPendingRequest();

        // Calculate assets to return
        uint256 assets = convertToAssets(shares);

        // Clear pending request
        pendingRedeemRequests[msg.sender] = 0;

        // Burn vault shares
        _burn(address(this), shares);

        // Transfer assets to user
        asset.transfer(msg.sender, assets);

        emit RedeemProcessed(msg.sender, shares, assets);
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

        // Withdraw from all current allocations
        _withdrawAllAllocations();

        // Calculate total available assets
        uint256 totalAssets = asset.balanceOf(address(this));

        // Allocate to new target vaults
        for (uint256 i = 0; i < targetVaults.length; i++) {
            address vault = targetVaults[i];
            uint256 amount = targetAmounts[i];

            if (!whitelistedVaults[vault]) revert VaultNotWhitelisted();
            if (amount == 0) continue;

            // Approve and deposit to vault
            asset.approve(vault, amount);
            IVault(vault).deposit(amount, address(this));

            // Update allocation tracking
            allocations[vault] = amount;
        }

        lastRebalance = block.timestamp;
        currentEpoch++;

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
            allocations[vault] = 0;
        }
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
     * @notice Update performance fee
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

    /**
     * @notice Update GlueX Router address
     */
    function setGlueXRouter(address _router) external onlyOwner {
        glueXRouter = IGlueXRouter(_router);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Get total assets under management
     */
    function totalAssets() public view returns (uint256) {
        uint256 total = asset.balanceOf(address(this));

        // Add assets in all vaults
        for (uint256 i = 0; i < vaultList.length; i++) {
            address vault = vaultList[i];
            if (whitelistedVaults[vault]) {
                uint256 shares = IVault(vault).balanceOf(address(this));
                if (shares > 0) {
                    total += IVault(vault).convertToAssets(shares);
                }
            }
        }

        return total;
    }

    /**
     * @notice Convert assets to shares
     */
    function convertToShares(uint256 assets) public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return assets; // 1:1 for first deposit
        return (assets * supply) / totalAssets();
    }

    /**
     * @notice Convert shares to assets
     */
    function convertToAssets(uint256 shares) public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 0;
        return (shares * totalAssets()) / supply;
    }

    /**
     * @notice Get list of all whitelisted vaults
     */
    function getWhitelistedVaults() external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < vaultList.length; i++) {
            if (whitelistedVaults[vaultList[i]]) count++;
        }

        address[] memory activeVaults = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < vaultList.length; i++) {
            if (whitelistedVaults[vaultList[i]]) {
                activeVaults[index] = vaultList[i];
                index++;
            }
        }

        return activeVaults;
    }

    /**
     * @notice Get current allocations
     */
    function getCurrentAllocations()
        external
        view
        returns (address[] memory, uint256[] memory)
    {
        address[] memory vaults = new address[](vaultList.length);
        uint256[] memory amounts = new uint256[](vaultList.length);

        for (uint256 i = 0; i < vaultList.length; i++) {
            vaults[i] = vaultList[i];
            amounts[i] = allocations[vaultList[i]];
        }

        return (vaults, amounts);
    }

    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================

    /**
     * @notice Withdraw from all current vault allocations
     */
    function _withdrawAllAllocations() internal {
        for (uint256 i = 0; i < vaultList.length; i++) {
            address vault = vaultList[i];
            if (allocations[vault] > 0 && whitelistedVaults[vault]) {
                uint256 shares = IVault(vault).balanceOf(address(this));
                if (shares > 0) {
                    IVault(vault).redeem(shares, address(this), address(this));
                }
                allocations[vault] = 0;
            }
        }
    }

    /**
     * @notice Collect performance fees
     */
    function _collectPerformanceFee() internal {
        if (performanceFee == 0) return;

        uint256 totalValue = totalAssets();
        uint256 supply = totalSupply();

        if (supply > 0 && totalValue > supply) {
            uint256 profit = totalValue - supply;
            uint256 feeAmount = (profit * performanceFee) / 10000;

            if (feeAmount > 0) {
                uint256 feeShares = convertToShares(feeAmount);
                _mint(feeRecipient, feeShares);
                emit FeeCollected(feeRecipient, feeAmount);
            }
        }
    }
}
