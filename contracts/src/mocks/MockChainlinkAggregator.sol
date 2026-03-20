// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MockChainlinkAggregator
/// @notice Minimal Chainlink-compatible aggregator for testnet seeding
contract MockChainlinkAggregator {
    int256 private _answer;
    uint8 private immutable _decimals;
    string private _description;
    uint80 private _roundId;

    event AnswerUpdated(int256 current, uint80 roundId, uint256 updatedAt);

    constructor(int256 initialAnswer, uint8 decimals_, string memory description_) {
        _answer = initialAnswer;
        _decimals = decimals_;
        _description = description_;
        _roundId = 1;
        emit AnswerUpdated(initialAnswer, _roundId, block.timestamp);
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function description() external view returns (string memory) {
        return _description;
    }

    function version() external pure returns (uint256) {
        return 1;
    }

    function getRoundData(
        uint80 roundId_
    )
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (roundId_, _answer, block.timestamp, block.timestamp, roundId_);
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _answer, block.timestamp, block.timestamp, _roundId);
    }

    function updateAnswer(int256 newAnswer) external {
        _roundId += 1;
        _answer = newAnswer;
        emit AnswerUpdated(newAnswer, _roundId, block.timestamp);
    }
}
