// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./XCMExecutor.sol";

/// @title PolyStableGovernor
/// @author PolyStable Team
/// @notice On-chain governor for PolyStable. Routes proposals to XCMExecutor for cross-chain execution.
contract PolyStableGovernor is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    /// @notice The XCM executor for cross-chain proposal execution
    XCMExecutor public immutable xcmExecutor;

    /// @param _token The pGOV voting token
    /// @param _timelock The timelock controller
    /// @param _xcmExecutor The XCM executor
    constructor(
        IVotes _token,
        TimelockController _timelock,
        address _xcmExecutor
    )
        Governor("PolyStableGovernor")
        GovernorSettings(
            7200,   // 1 day voting delay (in blocks)
            36000,  // 5 days voting period
            10_000e18 // proposal threshold
        )
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4) // 4% quorum
        GovernorTimelockControl(_timelock)
    {
        xcmExecutor = XCMExecutor(payable(_xcmExecutor));
    }

    /// @notice Get the proposal threshold (max of 0.1% of supply or 10_000e18)
    /// @return The proposal threshold
    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        uint256 supply = IERC20(address(token())).totalSupply();
        uint256 oneTenth = supply / 1000; // 0.1%
        uint256 minimum = 10_000e18;
        return oneTenth > minimum ? oneTenth : minimum;
    }

    /// @notice Execute a proposal, routing XCM targets to XCMExecutor
    /// @param proposalId The proposal ID
    /// @param targets The target addresses
    /// @param values The ETH values
    /// @param calldatas The calldatas
    /// @param descriptionHash The description hash
    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        // Separate XCM targets from local targets
        bool hasXCMTargets = false;
        for (uint256 i = 0; i < targets.length; i++) {
            if (xcmExecutor.isEndpointActive(targets[i])) {
                hasXCMTargets = true;
                break;
            }
        }

        if (hasXCMTargets) {
            // Route all targets through XCMExecutor
            xcmExecutor.execute(targets, values, calldatas, descriptionHash);
        } else {
            // Standard timelock execution
            super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
        }
    }

    // ─── Required overrides ────────────────────────────────────────────────

    function votingDelay() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }

    function votingPeriod() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(Governor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function proposalNeedsQueuing(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.proposalNeedsQueuing(proposalId);
    }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint48) {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }
}
