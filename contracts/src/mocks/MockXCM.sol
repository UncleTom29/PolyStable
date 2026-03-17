// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "../precompiles/IXCM.sol";

contract MockXCM {
    event XCMSent(bytes32 destHash, bytes message);
    event XCMExecuted(uint256 maxWeight);

    function transferAssets(
        IXCM.Multilocation calldata,
        IXCM.Multilocation calldata,
        IXCM.Multilocation calldata,
        uint256,
        uint8
    ) external returns (bool) {
        return true;
    }

    function execute(bytes calldata message, uint256 maxWeight) external returns (uint8) {
        emit XCMExecuted(maxWeight);
        return 0;
    }

    function sendXCM(IXCM.Multilocation calldata dest, bytes calldata message) external returns (bool) {
        emit XCMSent(keccak256(abi.encode(dest)), message);
        return true;
    }

    receive() external payable {}
}
