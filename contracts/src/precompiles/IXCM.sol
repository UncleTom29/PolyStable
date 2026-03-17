// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IXCM
/// @author PolyStable Team
/// @notice Interface for the Polkadot XCM precompile at 0x0000000000000000000000000000000000000804
interface IXCM {
    /// @notice Multilocation struct for XCM destinations
    struct Multilocation {
        uint8 parents;
        bytes[] interior;
    }

    /// @notice Transfer assets cross-chain via XCM
    /// @param asset The asset multilocation
    /// @param dest The destination multilocation
    /// @param beneficiary The beneficiary multilocation
    /// @param amount The amount to transfer
    /// @param feeItem The index of the asset to use for fees
    /// @return success Whether the transfer succeeded
    function transferAssets(
        Multilocation calldata asset,
        Multilocation calldata dest,
        Multilocation calldata beneficiary,
        uint256 amount,
        uint8 feeItem
    ) external returns (bool);

    /// @notice Execute an XCM message locally
    /// @param message The encoded XCM message
    /// @param maxWeight The maximum weight to use for execution
    /// @return outcome The execution outcome code
    function execute(bytes calldata message, uint256 maxWeight) external returns (uint8);

    /// @notice Send an XCM message to a destination
    /// @param dest The destination multilocation
    /// @param message The encoded XCM message
    /// @return success Whether the send succeeded
    function sendXCM(Multilocation calldata dest, bytes calldata message) external returns (bool);
}
