// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IVault.sol";

/**
 * @title YieldOptimizerMini
 * @notice Ultra-minimal yield optimizer to fit within gas limits
 */
contract YieldOptimizerMini {
    IERC20 public immutable asset;
    address public owner;
    address public operator;

    mapping(address => bool) public whitelistedVaults;
    mapping(address => uint256) public balances;

    uint256 public totalShares;
    uint256 public lastRebalance;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Rebalanced(address[] vaults, uint256[] amounts);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner, "Not operator");
        _;
    }

    constructor(address _asset) {
        asset = IERC20(_asset);
        owner = msg.sender;
        operator = msg.sender;
    }

    function deposit(uint256 amount) external returns (uint256 shares) {
        require(amount > 0, "Zero amount");

        uint256 totalAssets = getTotalAssets();
        shares = totalShares == 0
            ? amount
            : (amount * totalShares) / totalAssets;

        asset.transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += shares;
        totalShares += shares;

        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 shares) external returns (uint256 assets) {
        require(shares > 0 && balances[msg.sender] >= shares, "Invalid shares");

        assets = (shares * getTotalAssets()) / totalShares;

        // Withdraw from vaults if needed
        uint256 available = asset.balanceOf(address(this));
        if (available < assets) {
            _withdrawFromVaults(assets - available);
        }

        balances[msg.sender] -= shares;
        totalShares -= shares;
        asset.transfer(msg.sender, assets);

        emit Withdrawn(msg.sender, assets);
    }

    function rebalance(
        address[] calldata vaults,
        uint256[] calldata amounts
    ) external onlyOperator {
        require(block.timestamp >= lastRebalance + 1 hours, "Too soon");
        require(vaults.length == amounts.length, "Length mismatch");

        // Withdraw all
        for (uint256 i = 0; i < vaults.length; i++) {
            if (whitelistedVaults[vaults[i]]) {
                uint256 vaultShares = IVault(vaults[i]).balanceOf(
                    address(this)
                );
                if (vaultShares > 0) {
                    IVault(vaults[i]).redeem(
                        vaultShares,
                        address(this),
                        address(this)
                    );
                }
            }
        }

        // Deposit to new allocations
        for (uint256 i = 0; i < vaults.length; i++) {
            require(whitelistedVaults[vaults[i]], "Not whitelisted");
            if (amounts[i] > 0) {
                asset.approve(vaults[i], amounts[i]);
                IVault(vaults[i]).deposit(amounts[i], address(this));
            }
        }

        lastRebalance = block.timestamp;
        emit Rebalanced(vaults, amounts);
    }

    function whitelistVault(address vault, bool status) external onlyOwner {
        whitelistedVaults[vault] = status;
    }

    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
    }

    function getTotalAssets() public view returns (uint256 total) {
        total = asset.balanceOf(address(this));
        // Note: Would need to iterate vaults to get full value, simplified for gas
    }

    function _withdrawFromVaults(uint256 needed) internal {
        // Simplified: would need vault list to implement properly
        // For now, assume manual emergency withdrawals
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }
}
