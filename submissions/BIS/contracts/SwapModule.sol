// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IGlueXRouter.sol";

/**
 * @title SwapModule
 * @notice Handles token swapping operations via GlueX Router
 * @dev Separate module to reduce main contract size and improve modularity
 */
contract SwapModule is Ownable {
    // ============================================
    // STATE VARIABLES
    // ============================================

    /// @notice GlueX Router for executing swaps
    IGlueXRouter public glueXRouter;

    /// @notice Default slippage tolerance in basis points (e.g., 50 = 0.5%)
    uint256 public defaultSlippageBps;

    /// @notice Authorized callers (typically the main optimizer contract)
    mapping(address => bool) public authorizedCallers;

    // ============================================
    // EVENTS
    // ============================================

    event TokenSwapped(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    event RouterUpdated(address indexed newRouter);
    event SlippageUpdated(uint256 newSlippage);
    event CallerAuthorized(address indexed caller, bool status);

    // ============================================
    // ERRORS
    // ============================================

    error Unauthorized();
    error SwapFailed();
    error InvalidSlippage();

    // ============================================
    // MODIFIERS
    // ============================================

    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender] && msg.sender != owner()) {
            revert Unauthorized();
        }
        _;
    }

    // ============================================
    // CONSTRUCTOR
    // ============================================

    constructor(
        address _glueXRouter,
        uint256 _defaultSlippageBps
    ) Ownable(msg.sender) {
        glueXRouter = IGlueXRouter(_glueXRouter);
        defaultSlippageBps = _defaultSlippageBps;
    }

    // ============================================
    // SWAP FUNCTIONS
    // ============================================

    /**
     * @notice Execute token swap via GlueX Router
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount to swap
     * @param slippageBps Custom slippage (0 = use default)
     * @return amountOut Amount received after swap
     */
    function executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 slippageBps
    ) external onlyAuthorized returns (uint256 amountOut) {
        // Use custom slippage or default
        uint256 slippage = slippageBps > 0 ? slippageBps : defaultSlippageBps;

        // Transfer tokens from caller
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        // Get quote from GlueX Router
        IGlueXRouter.QuoteRequest memory request = IGlueXRouter.QuoteRequest({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            slippageBps: slippage,
            receiver: msg.sender
        });

        IGlueXRouter.QuoteResponse memory quote = glueXRouter.getQuote(request);

        // Approve router to spend tokens
        IERC20(tokenIn).approve(address(glueXRouter), amountIn);

        // Execute swap (tokens will be sent directly to msg.sender via receiver param)
        amountOut = glueXRouter.executeSwap(quote);

        if (amountOut < quote.minAmountOut) revert SwapFailed();

        emit TokenSwapped(tokenIn, tokenOut, amountIn, amountOut);
    }

    /**
     * @notice Get swap quote without executing
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount to swap
     * @return expectedOut Expected output amount
     * @return minOut Minimum output amount (with slippage)
     */
    function getSwapQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 expectedOut, uint256 minOut) {
        IGlueXRouter.QuoteRequest memory request = IGlueXRouter.QuoteRequest({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            slippageBps: defaultSlippageBps,
            receiver: address(0)
        });

        IGlueXRouter.QuoteResponse memory quote = glueXRouter.getQuote(request);
        return (quote.amountOut, quote.minAmountOut);
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Authorize/deauthorize a caller
     * @param caller Address to authorize
     * @param status Authorization status
     */
    function setAuthorizedCaller(
        address caller,
        bool status
    ) external onlyOwner {
        authorizedCallers[caller] = status;
        emit CallerAuthorized(caller, status);
    }

    /**
     * @notice Update GlueX Router address
     * @param _router New router address
     */
    function setGlueXRouter(address _router) external onlyOwner {
        glueXRouter = IGlueXRouter(_router);
        emit RouterUpdated(_router);
    }

    /**
     * @notice Update default slippage tolerance
     * @param _slippageBps New slippage in basis points
     */
    function setDefaultSlippage(uint256 _slippageBps) external onlyOwner {
        if (_slippageBps > 1000) revert InvalidSlippage(); // Max 10%
        defaultSlippageBps = _slippageBps;
        emit SlippageUpdated(_slippageBps);
    }

    /**
     * @notice Emergency token recovery
     * @param token Token address to recover
     * @param amount Amount to recover
     */
    function recoverToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
}
