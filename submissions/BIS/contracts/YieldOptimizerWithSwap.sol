// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IVault.sol";
import "./SwapModule.sol";

/**
 * @title YieldOptimizerWithSwap
 * @notice Enhanced yield optimizer with automatic token swapping via GlueX Router
 * @dev Automatically swaps tokens when depositing to vaults that require different assets
 *
 * == GlueX Router API Integration ==
 *
 * This contract integrates with GlueX APIs for optimal yield optimization:
 *
 * 1. **GlueX Yields API** (Off-chain):
 *    - Backend fetches real-time APY data for all vaults
 *    - Calculates optimal allocations based on yield, risk, and liquidity
 *    - Endpoint: https://yield-api.gluex.xyz
 *    - Used in: yield_optimizer.py::get_vault_metrics()
 *
 * 2. **GlueX Router API** (Off-chain + On-chain):
 *    - Off-chain: Backend gets quotes for vault-to-vault reallocations
 *    - Off-chain: Router API finds optimal swap paths between vault tokens
 *    - On-chain: Contract executes swaps via IGlueXRouter interface
 *    - Endpoint: https://router.gluex.xyz/v1/quote
 *    - Used in: yield_optimizer.py::build_reallocation_plan()
 *
 * 3. **Reallocation Flow with Router**:
 *    a) Backend identifies optimal vault allocation via Yields API
 *    b) Backend builds reallocation plan via Router API quotes
 *    c) Backend calls rebalance() with target vaults and amounts
 *    d) Contract withdraws from current vaults → converts to base asset
 *    e) Contract swaps base asset to required tokens via GlueX Router
 *    f) Contract deposits to target vaults
 *
 * Benefits of Router Integration:
 * - Optimal swap routing across liquidity sources
 * - Minimal slippage on token conversions
 * - Gas-efficient multi-hop swaps
 * - Support for any ERC-4626 vault regardless of underlying token
 */
contract YieldOptimizerWithSwap is ERC20, Ownable, ReentrancyGuard {
    // ============================================
    // STATE VARIABLES
    // ============================================

    /// @notice The base asset for user deposits (e.g., USDC)
    IERC20 public immutable asset;

    /// @notice Swap module for token swapping operations
    SwapModule public swapModule;

    /// @notice Mapping of whitelisted vaults
    mapping(address => bool) public whitelistedVaults;

    /// @notice Array of all whitelisted vault addresses
    address[] public vaultList;

    /// @notice Current allocations: vault => amount (in vault's native token)
    mapping(address => uint256) public allocations;

    /// @notice Track which token was used for each vault
    mapping(address => address) public vaultToken;

    /// @notice Operator address authorized to execute rebalancing
    address public operator;

    /// @notice Pending deposit requests (ERC-7540 pattern)
    mapping(address => uint256) public pendingDepositRequests;

    /// @notice Pending redemption requests (ERC-7540 pattern)
    mapping(address => uint256) public pendingRedeemRequests;

    /// @notice Total pending deposits
    uint256 public totalPendingDeposits;

    /// @notice Total pending redemptions
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
    event VaultError(address indexed vault, string reason);
    event SwapModuleUpdated(address indexed newModule);

    // ============================================
    // ERRORS
    // ============================================

    error Unauthorized();
    error VaultNotWhitelisted();
    error InvalidAmount();
    error RebalanceTooSoon();
    error InvalidFee();
    error NoPendingRequest();
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
        address _swapModule,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        asset = IERC20(_asset);
        swapModule = SwapModule(_swapModule);
        operator = msg.sender;
        feeRecipient = msg.sender;
        performanceFee = 200; // 2% default
        rebalanceDelay = 1 hours;
        currentEpoch = 1;
    }

    // ============================================
    // ERC-7540 ASYNC DEPOSIT/REDEEM FUNCTIONS
    // ============================================

    function requestDeposit(uint256 assets) external nonReentrant {
        if (assets == 0) revert InvalidAmount();

        if (!asset.transferFrom(msg.sender, address(this), assets))
            revert TransferFailed();

        pendingDepositRequests[msg.sender] += assets;
        totalPendingDeposits += assets;

        emit DepositRequested(msg.sender, assets, currentEpoch);
    }

    function requestRedeem(uint256 shares) external nonReentrant {
        if (shares == 0) revert InvalidAmount();
        if (balanceOf(msg.sender) < shares) revert InvalidAmount();

        _transfer(msg.sender, address(this), shares);

        pendingRedeemRequests[msg.sender] += shares;
        totalPendingRedeems += shares;

        emit RedeemRequested(msg.sender, shares, currentEpoch);
    }

    function claimDeposit() external nonReentrant {
        uint256 assets = pendingDepositRequests[msg.sender];
        if (assets == 0) revert NoPendingRequest();

        uint256 shares = convertToShares(assets);
        pendingDepositRequests[msg.sender] = 0;
        _mint(msg.sender, shares);

        emit DepositProcessed(msg.sender, assets, shares);
    }

    function claimRedeem() external nonReentrant {
        uint256 shares = pendingRedeemRequests[msg.sender];
        if (shares == 0) revert NoPendingRequest();

        uint256 assets = convertToAssets(shares);
        pendingRedeemRequests[msg.sender] = 0;
        _burn(address(this), shares);

        if (!asset.transfer(msg.sender, assets)) revert TransferFailed();

        emit RedeemProcessed(msg.sender, shares, assets);
    }

    // ============================================
    // ENHANCED REBALANCE WITH SWAPPING
    // ============================================

    /**
     * @notice Rebalance with automatic token swapping
     * @param targetVaults Array of vault addresses to allocate to
     * @param targetAmounts Array of amounts to allocate (in base asset - USDC)
     * @dev Automatically swaps to vault's required token before deposit
     */
    function rebalance(
        address[] calldata targetVaults,
        uint256[] calldata targetAmounts
    ) external onlyOperator nonReentrant {
        if (block.timestamp < lastRebalance + rebalanceDelay)
            revert RebalanceTooSoon();
        if (targetVaults.length != targetAmounts.length) revert InvalidAmount();

        // Withdraw from all current allocations (swaps back to base asset)
        _withdrawAllAllocations();

        // Calculate total available assets and validate
        uint256 availableAssets = asset.balanceOf(address(this));
        uint256 totalAllocating = 0;
        for (uint256 i = 0; i < targetAmounts.length; i++) {
            totalAllocating += targetAmounts[i];
        }
        if (totalAllocating > availableAssets) revert InvalidAmount();

        // Allocate to new target vaults with automatic swapping
        for (uint256 i = 0; i < targetVaults.length; i++) {
            address vault = targetVaults[i];
            uint256 amount = targetAmounts[i]; // Amount in base asset (USDC)

            if (!whitelistedVaults[vault]) revert VaultNotWhitelisted();
            if (amount == 0) continue;

            // Get vault's required token
            address vaultAsset = IVault(vault).asset();
            vaultToken[vault] = vaultAsset;

            uint256 depositAmount = amount;

            // If vault requires different token, swap first
            if (vaultAsset != address(asset)) {
                depositAmount = _swapTokens(address(asset), vaultAsset, amount);
            }

            // Approve and deposit to vault
            IERC20(vaultAsset).approve(vault, depositAmount);
            try IVault(vault).deposit(depositAmount, address(this)) {
                allocations[vault] = depositAmount;
            } catch Error(string memory reason) {
                emit VaultError(vault, reason);
                revert(reason);
            } catch {
                emit VaultError(vault, "Deposit failed");
                revert("Deposit failed");
            }
        }

        lastRebalance = block.timestamp;
        currentEpoch++;

        emit Rebalanced(targetVaults, targetAmounts);
    }

    /**
     * @notice Internal function to swap tokens via SwapModule
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount to swap
     * @return amountOut Amount received after swap
     */
    function _swapTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (uint256 amountOut) {
        // Approve swap module to spend tokens
        IERC20(tokenIn).approve(address(swapModule), amountIn);

        // Execute swap via module (tokens returned to this contract)
        amountOut = swapModule.executeSwap(tokenIn, tokenOut, amountIn, 0);
    }

    /**
     * @notice Withdraw from all vaults and swap back to base asset
     */
    function _withdrawAllAllocations() internal {
        for (uint256 i = 0; i < vaultList.length; i++) {
            address vault = vaultList[i];
            if (!whitelistedVaults[vault]) continue;

            try IVault(vault).balanceOf(address(this)) returns (
                uint256 shares
            ) {
                if (shares > 0) {
                    // Redeem from vault
                    address vaultAsset = vaultToken[vault];
                    uint256 balanceBefore = IERC20(vaultAsset).balanceOf(
                        address(this)
                    );

                    try
                        IVault(vault).redeem(
                            shares,
                            address(this),
                            address(this)
                        )
                    {
                        uint256 balanceAfter = IERC20(vaultAsset).balanceOf(
                            address(this)
                        );
                        uint256 received = balanceAfter - balanceBefore;

                        // Swap back to base asset if needed
                        if (vaultAsset != address(asset) && received > 0) {
                            _swapTokens(vaultAsset, address(asset), received);
                        }
                    } catch Error(string memory reason) {
                        emit VaultError(vault, reason);
                    } catch {
                        emit VaultError(vault, "Redeem failed");
                    }
                }
            } catch {
                emit VaultError(vault, "balanceOf failed");
            }
            allocations[vault] = 0;
        }
    }

    /**
     * @notice Emergency withdraw from a specific vault
     */
    function emergencyWithdraw(address vault) external onlyOwner nonReentrant {
        uint256 shares = IVault(vault).balanceOf(address(this));
        if (shares > 0) {
            IVault(vault).redeem(shares, address(this), address(this));

            // Try to swap back if different token
            address vaultAsset = vaultToken[vault];
            if (vaultAsset != address(asset)) {
                uint256 balance = IERC20(vaultAsset).balanceOf(address(this));
                if (balance > 0) {
                    _swapTokens(vaultAsset, address(asset), balance);
                }
            }

            allocations[vault] = 0;
        }
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    function setVaultWhitelist(address vault, bool status) external onlyOwner {
        if (status && !whitelistedVaults[vault]) {
            vaultList.push(vault);
        }
        whitelistedVaults[vault] = status;
        emit VaultWhitelisted(vault, status);
    }

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

    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
        emit OperatorUpdated(_operator);
    }

    function setPerformanceFee(uint256 _fee) external onlyOwner {
        if (_fee > 1000) revert InvalidFee();
        performanceFee = _fee;
        emit PerformanceFeeUpdated(_fee);
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        feeRecipient = _feeRecipient;
    }

    function setRebalanceDelay(uint256 _delay) external onlyOwner {
        rebalanceDelay = _delay;
    }

    function setSwapModule(address _swapModule) external onlyOwner {
        swapModule = SwapModule(_swapModule);
        emit SwapModuleUpdated(_swapModule);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    function totalAssets() public view returns (uint256 total) {
        total = asset.balanceOf(address(this));

        for (uint256 i = 0; i < vaultList.length; i++) {
            address vault = vaultList[i];
            if (whitelistedVaults[vault]) {
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
                            // Note: This is in vault's token, would need price conversion
                            // For now, we approximate as equal value
                            total += vaultAssets;
                        }
                    }
                }
            }
        }
    }

    function convertToShares(
        uint256 assets
    ) public view returns (uint256 shares) {
        uint256 supply = totalSupply();
        if (supply == 0) {
            return assets;
        }
        uint256 _totalAssets = totalAssets();
        if (_totalAssets == 0) {
            return assets;
        }
        return (assets * supply) / _totalAssets;
    }

    function convertToAssets(
        uint256 shares
    ) public view returns (uint256 assets) {
        uint256 supply = totalSupply();
        if (supply == 0) return 0;
        return (shares * totalAssets()) / supply;
    }

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
}
