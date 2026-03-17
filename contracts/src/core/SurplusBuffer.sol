// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/ISurplusBuffer.sol";

/// @title SurplusBuffer
/// @author PolyStable Team
/// @notice Accumulates stability fees from vaults and absorbs protocol losses
contract SurplusBuffer is ISurplusBuffer, AccessControl, ReentrancyGuard {
    /// @notice Role for withdrawing surplus (Governor)
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    /// @notice Role for VaultEngine to call receiveRevenue and absorbLoss
    bytes32 public constant VAULT_ENGINE_ROLE = keccak256("VAULT_ENGINE_ROLE");

    /// @notice The current surplus balance (in pUSD equivalent, ray units)
    uint256 public surplusBalance;

    /// @notice The total system debt (accumulated losses)
    uint256 public totalSystemDebt;

    /// @notice The vault engine address
    address public vaultEngine;

    /// @notice Emitted when revenue is received
    event RevenueReceived(address indexed from, uint256 amount);

    /// @notice Emitted when a loss is absorbed
    event LossAbsorbed(uint256 amount, uint256 newSurplus);

    /// @notice Emitted when system is insolvent (surplus < loss)
    event SystemDebt(uint256 debtAmount, uint256 totalDebt);

    /// @notice Emitted when surplus is withdrawn
    event SurplusWithdrawn(address indexed to, uint256 amount);

    // Custom errors
    error SurplusBuffer__InsufficientSurplus(uint256 available, uint256 requested);
    error SurplusBuffer__ZeroAmount();
    error SurplusBuffer__ZeroAddress();
    error SurplusBuffer__TransferFailed();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNOR_ROLE, msg.sender);
    }

    /// @notice Update the vault engine address
    /// @param _vaultEngine The new vault engine address
    function updateVaultEngine(address _vaultEngine) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_vaultEngine == address(0)) revert SurplusBuffer__ZeroAddress();
        vaultEngine = _vaultEngine;
        _grantRole(VAULT_ENGINE_ROLE, _vaultEngine);
    }

    /// @notice Receive stability fee revenue from VaultEngine
    function receiveRevenue() external payable override {
        surplusBalance += msg.value;
        emit RevenueReceived(msg.sender, msg.value);
    }

    /// @notice Receive revenue as a direct amount (non-payable, for accounting)
    /// @param amount The amount to add to surplus balance
    function receiveRevenueAmount(uint256 amount) external onlyRole(VAULT_ENGINE_ROLE) {
        surplusBalance += amount;
        emit RevenueReceived(msg.sender, amount);
    }

    /// @notice Absorb a loss from a liquidation deficit
    /// @param amount The loss amount to absorb
    function absorbLoss(uint256 amount) external override onlyRole(VAULT_ENGINE_ROLE) {
        if (amount == 0) revert SurplusBuffer__ZeroAmount();
        emit LossAbsorbed(amount, surplusBalance > amount ? surplusBalance - amount : 0);
        if (amount <= surplusBalance) {
            surplusBalance -= amount;
        } else {
            uint256 deficit = amount - surplusBalance;
            surplusBalance = 0;
            totalSystemDebt += deficit;
            emit SystemDebt(deficit, totalSystemDebt);
        }
    }

    /// @notice Withdraw surplus to an address (Governor only)
    /// @param to The recipient address
    /// @param amount The amount to withdraw
    function withdraw(address to, uint256 amount) external override onlyRole(GOVERNOR_ROLE) nonReentrant {
        if (amount == 0) revert SurplusBuffer__ZeroAmount();
        if (to == address(0)) revert SurplusBuffer__ZeroAddress();
        if (amount > surplusBalance) revert SurplusBuffer__InsufficientSurplus(surplusBalance, amount);
        surplusBalance -= amount;
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert SurplusBuffer__TransferFailed();
        emit SurplusWithdrawn(to, amount);
    }

    /// @notice Get the health ratio of the surplus buffer
    /// @return health The ratio of surplus to system debt (1e18 = fully backed)
    function getHealth() external view override returns (uint256 health) {
        if (totalSystemDebt == 0) return type(uint256).max;
        return (surplusBalance * 1e18) / totalSystemDebt;
    }

    receive() external payable {
        surplusBalance += msg.value;
        emit RevenueReceived(msg.sender, msg.value);
    }
}
