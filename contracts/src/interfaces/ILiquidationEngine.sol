// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ILiquidationEngine
/// @author PolyStable Team
/// @notice Interface for the LiquidationEngine contract
interface ILiquidationEngine {
    function liquidate(uint256 vaultId) external;
    function batchLiquidate(uint256[] calldata vaultIds) external returns (uint256 count);
    function isLiquidatable(uint256 vaultId) external view returns (bool);
}
