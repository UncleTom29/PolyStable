// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "../interfaces/IVaultEngine.sol";
import "../interfaces/ILiquidationEngine.sol";
import "../interfaces/ISurplusBuffer.sol";
import "../core/PriceOracle.sol";
import "../core/VaultEngine.sol";

/// @title LiquidationEngine
/// @author PolyStable Team
/// @notice Handles liquidation of undercollateralized vaults
contract LiquidationEngine is ILiquidationEngine, ReentrancyGuard, AccessControl {
    /// @notice The vault engine
    VaultEngine public immutable vaultEngine;

    /// @notice The surplus buffer
    ISurplusBuffer public immutable surplusBuffer;

    // Events
    event Liquidated(
        uint256 indexed vaultId,
        address indexed liquidator,
        uint256 debt,
        uint256 seized,
        uint256 bonus
    );
    event BatchLiquidationCompleted(uint256 total, uint256 liquidated);

    // Custom errors
    error LiquidationEngine__VaultNotLiquidatable(uint256 vaultId, uint256 ratio);
    error LiquidationEngine__ZeroAddress();

    /// @param _vaultEngine The vault engine address
    /// @param _surplusBuffer The surplus buffer address
    constructor(address _vaultEngine, address _surplusBuffer) {
        if (_vaultEngine == address(0) || _surplusBuffer == address(0)) revert LiquidationEngine__ZeroAddress();
        vaultEngine = VaultEngine(payable(_vaultEngine));
        surplusBuffer = ISurplusBuffer(_surplusBuffer);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Check if a vault is liquidatable
    /// @param vaultId The vault ID to check
    /// @return True if the vault can be liquidated
    function isLiquidatable(uint256 vaultId) public view override returns (bool) {
        IVaultEngine.Vault memory vault = vaultEngine.getVault(vaultId);
        if (vault.owner == address(0) || vault.debt == 0) return false;

        IVaultEngine.CollateralType memory ct = vaultEngine.getCollateralType(vault.collateral);
        uint256 ratio = vaultEngine.getCollateralRatio(vaultId);
        return ratio < ct.minRatio;
    }

    /// @notice Liquidate an undercollateralized vault
    /// @param vaultId The vault ID to liquidate
    function liquidate(uint256 vaultId) public override nonReentrant {
        IVaultEngine.Vault memory vault = vaultEngine.getVault(vaultId);
        IVaultEngine.CollateralType memory ct = vaultEngine.getCollateralType(vault.collateral);

        uint256 ratio = vaultEngine.getCollateralRatio(vaultId);
        if (ratio >= ct.minRatio) {
            revert LiquidationEngine__VaultNotLiquidatable(vaultId, ratio);
        }

        uint256 debt = vault.debt;

        // Call liquidateVault on VaultEngine — it handles all the logic
        (uint256 seized, uint256 bonus) = vaultEngine.liquidateVault(vaultId, msg.sender);

        emit Liquidated(vaultId, msg.sender, debt, seized, bonus);
    }

    /// @notice Batch liquidate multiple vaults, skipping healthy ones
    /// @param vaultIds The array of vault IDs to liquidate
    /// @return count The number of successful liquidations
    function batchLiquidate(uint256[] calldata vaultIds) external override returns (uint256 count) {
        uint256 total = vaultIds.length;
        for (uint256 i = 0; i < total; ) {
            try this.liquidate(vaultIds[i]) {
                unchecked {
                    count++;
                    i++;
                }
            } catch {
                unchecked {
                    i++;
                }
            }
        }
        emit BatchLiquidationCompleted(total, count);
    }
}
