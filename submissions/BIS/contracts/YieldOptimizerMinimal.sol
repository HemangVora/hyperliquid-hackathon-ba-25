// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IVault.sol";
import "./IGlueXRouter.sol";

/**
 * @title YieldOptimizerMinimal
 * @notice Minimal yield optimizer with GlueX Router integration
 * @dev Stripped down version to fit within block gas limits
 */
contract YieldOptimizerMinimal is ERC20, Ownable {
    // ============================================
    // STATE VARIABLES
    // ============================================

    IERC20 public immutable asset;
    IGlueXRouter public glueXRouter;

    mapping(address => bool) public whitelistedVaults;
    address[] public vaultList;
    mapping(address => uint256) public allocations;

    address public operator;
    uint256 public lastRebalance;
    uint256 public constant REBALANCE_DELAY = 1 hours;

    // ============================================
    // EVENTS
    // ============================================

    event VaultWhitelisted(address indexed vault, bool status);
    event Rebalanced(address[] vaults, uint256[] amounts);
    event OperatorUpdated(address indexed newOperator);
    event TokenSwapped(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    // ============================================
    // ERRORS
    // ============================================

    error Unauthorized();
    error VaultNotWhitelisted();
    error InvalidAmount();
    error RebalanceTooSoon();
    error TransferFailed();
    error SwapFailed();

    // ============================================
    // CONSTRUCTOR
    // ============================================

    constructor(
        address _asset,
        address _glueXRouter,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        asset = IERC20(_asset);
        glueXRouter = IGlueXRouter(_glueXRouter);
        operator = msg.sender;
    }

    // ============================================
    // CORE DEPOSIT/WITHDRAW
    // ============================================

    function deposit(uint256 assets) external returns (uint256 shares) {
        if (assets == 0) revert InvalidAmount();

        if (!asset.transferFrom(msg.sender, address(this), assets))
            revert TransferFailed();

        shares = totalSupply() == 0
            ? assets
            : (assets * totalSupply()) / totalAssets();
        _mint(msg.sender, shares);
    }

    function withdraw(uint256 shares) external returns (uint256 assets) {
        if (shares == 0) revert InvalidAmount();

        assets = (shares * totalAssets()) / totalSupply();
        _burn(msg.sender, shares);

        if (!asset.transfer(msg.sender, assets)) revert TransferFailed();
    }

    // ============================================
    // VAULT MANAGEMENT
    // ============================================

    function whitelistVault(address vault, bool status) external onlyOwner {
        if (status && !whitelistedVaults[vault]) {
            vaultList.push(vault);
        }
        whitelistedVaults[vault] = status;
        emit VaultWhitelisted(vault, status);
    }

    function setOperator(address newOperator) external onlyOwner {
        operator = newOperator;
        emit OperatorUpdated(newOperator);
    }

    function setGlueXRouter(address newRouter) external onlyOwner {
        glueXRouter = IGlueXRouter(newRouter);
    }

    // ============================================
    // REBALANCING
    // ============================================

    function rebalance(
        address[] calldata targetVaults,
        uint256[] calldata targetAmounts,
        address[] calldata tokensNeeded,
        bytes[] calldata swapData
    ) external {
        if (msg.sender != operator && msg.sender != owner())
            revert Unauthorized();
        if (block.timestamp < lastRebalance + REBALANCE_DELAY)
            revert RebalanceTooSoon();

        lastRebalance = block.timestamp;

        // Withdraw from all current vaults
        for (uint256 i = 0; i < vaultList.length; i++) {
            address vault = vaultList[i];
            if (allocations[vault] > 0) {
                try
                    IVault(vault).redeem(
                        allocations[vault],
                        address(this),
                        address(this)
                    )
                {
                    allocations[vault] = 0;
                } catch {}
            }
        }

        // Execute swaps if needed
        for (uint256 i = 0; i < swapData.length; i++) {
            if (swapData[i].length > 0) {
                _executeSwap(tokensNeeded[i], swapData[i]);
            }
        }

        // Deposit to target vaults
        for (uint256 i = 0; i < targetVaults.length; i++) {
            if (!whitelistedVaults[targetVaults[i]])
                revert VaultNotWhitelisted();
            if (targetAmounts[i] > 0) {
                _depositToVault(targetVaults[i], targetAmounts[i]);
            }
        }

        emit Rebalanced(targetVaults, targetAmounts);
    }

    function _depositToVault(address vault, uint256 amount) internal {
        address vaultAsset = IVault(vault).asset();
        IERC20(vaultAsset).approve(vault, amount);

        try IVault(vault).deposit(amount, address(this)) returns (
            uint256 shares
        ) {
            allocations[vault] = shares;
        } catch {
            IERC20(vaultAsset).approve(vault, 0);
        }
    }

    function _executeSwap(address tokenOut, bytes memory swapData) internal {
        (bool success, ) = address(glueXRouter).call(swapData);
        if (!success) revert SwapFailed();

        emit TokenSwapped(address(asset), tokenOut, 0, 0);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    function totalAssets() public view returns (uint256) {
        uint256 total = asset.balanceOf(address(this));

        for (uint256 i = 0; i < vaultList.length; i++) {
            address vault = vaultList[i];
            if (allocations[vault] > 0) {
                try IVault(vault).convertToAssets(allocations[vault]) returns (
                    uint256 assets
                ) {
                    total += assets;
                } catch {}
            }
        }

        return total;
    }

    function getVaultCount() external view returns (uint256) {
        return vaultList.length;
    }

    function getAllocations()
        external
        view
        returns (address[] memory, uint256[] memory)
    {
        uint256[] memory amounts = new uint256[](vaultList.length);
        for (uint256 i = 0; i < vaultList.length; i++) {
            amounts[i] = allocations[vaultList[i]];
        }
        return (vaultList, amounts);
    }

    // ============================================
    // EMERGENCY
    // ============================================

    function emergencyWithdraw(
        address token,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
}
