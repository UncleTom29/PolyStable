// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ISurplusBuffer
/// @author PolyStable Team
/// @notice Interface for the SurplusBuffer contract
interface ISurplusBuffer {
    function receiveRevenue() external payable;
    function receiveRevenueAmount(uint256 amount) external;
    function absorbLoss(uint256 amount) external;
    function withdraw(address to, uint256 amount) external;
    function getHealth() external view returns (uint256);
    function surplusBalance() external view returns (uint256);
    function totalSystemDebt() external view returns (uint256);
}
