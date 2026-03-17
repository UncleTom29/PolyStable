// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/// @title PolyStableTimelock
/// @author PolyStable Team
/// @notice 48-hour timelock for PolyStable governance actions
contract PolyStableTimelock is TimelockController {
    /// @notice Emitted after each execution for audit trail
    event XCMExecutionLog(bytes32 indexed calldataHash);

    /// @param minDelay The minimum delay (48 hours)
    /// @param proposers Initial proposers list
    /// @param executors Initial executors list
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors
    )
        TimelockController(
            minDelay,
            proposers,
            executors,
            address(0) // self-administered, admin revoked
        )
    {}

    /// @notice Execute a scheduled operation with audit logging
    /// @param target The target address
    /// @param value The ETH value to send
    /// @param payload The calldata
    /// @param predecessor The predecessor operation ID
    /// @param salt The salt for operation ID
    function execute(
        address target,
        uint256 value,
        bytes calldata payload,
        bytes32 predecessor,
        bytes32 salt
    ) public payable override {
        emit XCMExecutionLog(keccak256(payload));
        super.execute(target, value, payload, predecessor, salt);
    }

    /// @notice Execute a batch of scheduled operations with audit logging
    /// @param targets The target addresses
    /// @param values The ETH values to send
    /// @param payloads The calldatas
    /// @param predecessor The predecessor operation ID
    /// @param salt The salt for operation ID
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata payloads,
        bytes32 predecessor,
        bytes32 salt
    ) public payable override {
        for (uint256 i = 0; i < payloads.length; i++) {
            emit XCMExecutionLog(keccak256(payloads[i]));
        }
        super.executeBatch(targets, values, payloads, predecessor, salt);
    }
}
