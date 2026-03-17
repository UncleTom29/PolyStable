// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IStaking
/// @author PolyStable Team
/// @notice Interface for the Polkadot staking precompile at 0x0000000000000000000000000000000000000800
interface IStaking {
    /// @notice Bond tokens for staking
    /// @param controller The controller account
    /// @param amount The amount to bond
    /// @param payee The reward destination encoded as bytes
    function bond(address controller, uint256 amount, bytes calldata payee) external;

    /// @notice Bond extra tokens to an existing staking position
    /// @param amount The additional amount to bond
    function bondExtra(uint256 amount) external;

    /// @notice Schedule unbonding of staked tokens
    /// @param amount The amount to unbond
    function unbond(uint256 amount) external;

    /// @notice Withdraw unbonded tokens after the unbonding period
    /// @param numSlashingSpans The number of slashing spans to remove
    function withdrawUnbonded(uint32 numSlashingSpans) external;

    /// @notice Nominate validators
    /// @param targets The list of validator addresses to nominate
    function nominate(address[] calldata targets) external;

    /// @notice Stop nominating / chill the staking position
    function chill() external;

    /// @notice Get the staked balance for an account
    /// @param staker The staker's address
    /// @return The staked balance
    function getStakedBalance(address staker) external view returns (uint256);

    /// @notice Get pending staking rewards for an account
    /// @param staker The staker's address
    /// @return The pending rewards amount
    function getPendingRewards(address staker) external view returns (uint256);

    /// @notice Claim staking rewards
    /// @param staker The staker's address
    /// @param era The era to claim rewards for
    function claimRewards(address staker, uint32 era) external;
}
