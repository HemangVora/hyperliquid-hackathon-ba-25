// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IGlueXRouter
 * @notice Interface for GlueX Router API for executing swaps and reallocations
 */
interface IGlueXRouter {
    struct QuoteRequest {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 slippageBps; // Slippage in basis points
        address receiver;
    }

    struct QuoteResponse {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
        uint256 minAmountOut;
        bytes routeData;
    }

    /**
     * @notice Get a quote for a swap
     * @param request Quote request parameters
     * @return response Quote response with route data
     */
    function getQuote(
        QuoteRequest calldata request
    ) external view returns (QuoteResponse memory response);

    /**
     * @notice Execute a swap based on quote
     * @param quote Quote data from getQuote
     * @return amountOut Actual amount received
     */
    function executeSwap(
        QuoteResponse calldata quote
    ) external returns (uint256 amountOut);

    /**
     * @notice Execute a vault reallocation
     * @param fromVault Source vault to withdraw from
     * @param toVault Destination vault to deposit to
     * @param amount Amount to reallocate
     * @return success Whether the reallocation succeeded
     */
    function reallocate(
        address fromVault,
        address toVault,
        uint256 amount
    ) external returns (bool success);
}
