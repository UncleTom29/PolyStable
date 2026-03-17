// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../precompiles/IXCM.sol";

/// @title XCMExecutor
/// @author PolyStable Team
/// @notice Executes governance actions locally or cross-chain via XCM
contract XCMExecutor is AccessControl {
    /// @notice Role for Governor to call execute
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    /// @notice The XCM precompile
    IXCM public constant XCM = IXCM(0x0000000000000000000000000000000000000804);

    /// @notice Parachain endpoint configuration
    struct ParachainEndpoint {
        bytes32 paraId;
        IXCM.Multilocation dest;
        bool active;
    }

    /// @notice Registry mapping hub placeholder addresses to parachain endpoints
    mapping(address => ParachainEndpoint) public parachainRegistry;

    // Events
    event XCMDispatched(address indexed target, bytes32 indexed paraId, bytes32 calldataHash);
    event LocalExecuted(address indexed target);
    event EndpointRegistered(address indexed hubPlaceholder, bytes32 paraId);

    // Custom errors
    error XCMExecutor__ExecutionFailed(address target);
    error XCMExecutor__ZeroAddress();
    error XCMExecutor__LengthMismatch();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNOR_ROLE, msg.sender);
    }

    /// @notice Check if a parachain endpoint is active
    /// @param hubPlaceholder The placeholder address
    /// @return True if the endpoint is registered and active
    function isEndpointActive(address hubPlaceholder) external view returns (bool) {
        return parachainRegistry[hubPlaceholder].active;
    }

    /// @notice Register a parachain endpoint
    /// @param hubPlaceholder The placeholder address representing the parachain on Hub
    /// @param ep The endpoint configuration
    function registerEndpoint(
        address hubPlaceholder,
        ParachainEndpoint calldata ep
    ) external onlyRole(GOVERNOR_ROLE) {
        if (hubPlaceholder == address(0)) revert XCMExecutor__ZeroAddress();
        parachainRegistry[hubPlaceholder] = ep;
        emit EndpointRegistered(hubPlaceholder, ep.paraId);
    }

    /// @notice Execute governance actions, routing to XCM or local execution
    /// @param targets The target addresses
    /// @param values The ETH values to send
    /// @param calldatas The calldatas
    function execute(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas,
        bytes32 /* descriptionHash */
    ) external onlyRole(GOVERNOR_ROLE) {
        if (targets.length != values.length || targets.length != calldatas.length) {
            revert XCMExecutor__LengthMismatch();
        }

        for (uint256 i = 0; i < targets.length; ) {
            ParachainEndpoint storage ep = parachainRegistry[targets[i]];

            if (ep.active) {
                // Route via XCM
                bytes memory xcmMsg = encodeXCMTransact(calldatas[i], 1_000_000_000);
                XCM.sendXCM(ep.dest, xcmMsg);
                emit XCMDispatched(targets[i], ep.paraId, keccak256(calldatas[i]));
            } else {
                // Execute locally
                (bool ok,) = targets[i].call{value: values[i]}(calldatas[i]);
                if (!ok) revert XCMExecutor__ExecutionFailed(targets[i]);
                emit LocalExecuted(targets[i]);
            }

            unchecked {
                i++;
            }
        }
    }

    /// @notice Encode a Transact XCM instruction in SCALE-compatible format
    /// @param innerCall The inner call bytes
    /// @param maxWeight The maximum weight for execution
    /// @return The encoded XCM message bytes
    function encodeXCMTransact(
        bytes calldata innerCall,
        uint256 maxWeight
    ) public pure returns (bytes memory) {
        // XCM Transact encoding:
        // - 0x01: Transact instruction identifier
        // - weight: SCALE compact-encoded uint64
        // - innerCall: prefixed with its SCALE compact length
        bytes memory weightEncoded = _encodeCompactU64(uint64(maxWeight));
        bytes memory callLengthEncoded = _encodeCompactU64(uint64(innerCall.length));

        return abi.encodePacked(
            uint8(0x01),        // Transact instruction
            weightEncoded,      // max weight (compact u64)
            callLengthEncoded,  // call length (compact u64)
            innerCall           // the actual call bytes
        );
    }

    /// @dev SCALE compact encode a uint64
    function _encodeCompactU64(uint64 value) internal pure returns (bytes memory) {
        if (value < 64) {
            return abi.encodePacked(uint8(value << 2));
        } else if (value < 16384) {
            uint16 v = uint16(value << 2) | 1;
            return abi.encodePacked(uint8(v), uint8(v >> 8));
        } else if (value < 1073741824) {
            uint32 v = uint32(value << 2) | 2;
            return abi.encodePacked(uint8(v), uint8(v >> 8), uint8(v >> 16), uint8(v >> 24));
        } else {
            // Big-integer mode
            return abi.encodePacked(uint8(0x03), uint64(value));
        }
    }

    receive() external payable {}
}
