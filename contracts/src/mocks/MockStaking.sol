// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockStaking {
    mapping(address => uint256) public stakedBalances;
    mapping(address => uint256) public pendingRewards;

    event Bonded(address indexed controller, uint256 amount);
    event BondedExtra(uint256 amount);
    event Unbonded(uint256 amount);
    event RewardsClaimed(address indexed staker, uint32 era);

    function bond(address controller, uint256 amount, bytes calldata) external {
        stakedBalances[controller] += amount;
        emit Bonded(controller, amount);
    }

    function bondExtra(uint256 amount) external {
        stakedBalances[msg.sender] += amount;
        emit BondedExtra(amount);
    }

    function unbond(uint256 amount) external {
        if (stakedBalances[msg.sender] >= amount) {
            stakedBalances[msg.sender] -= amount;
        }
        emit Unbonded(amount);
    }

    function withdrawUnbonded(uint32) external {}

    function nominate(address[] calldata) external {}

    function chill() external {}

    function getStakedBalance(address staker) external view returns (uint256) {
        return stakedBalances[staker];
    }

    function getPendingRewards(address staker) external view returns (uint256) {
        return pendingRewards[staker];
    }

    function claimRewards(address staker, uint32 era) external {
        pendingRewards[staker] = 0;
        emit RewardsClaimed(staker, era);
    }

    function setRewards(address staker, uint256 amount) external {
        pendingRewards[staker] = amount;
    }

    receive() external payable {}
}
