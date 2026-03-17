// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IVaultEngine
/// @author PolyStable Team
/// @notice Interface for the VaultEngine contract
interface IVaultEngine {
    struct Vault {
        address owner;
        address collateral;
        uint256 lockedAmount;
        uint256 debt;
        uint256 lastAccrual;
    }

    struct CollateralType {
        address token;
        uint256 minRatio;
        uint256 stabilityFee;
        uint256 liquidationBonus;
        uint256 debtCeiling;
        uint256 totalDebt;
        bool active;
    }

    function getVault(uint256 vaultId) external view returns (Vault memory);
    function getCollateralType(address collateral) external view returns (CollateralType memory);
    function getCollateralRatio(uint256 vaultId) external view returns (uint256);
    function openVault(address collateral, uint256 deposit, uint256 mintAmount) external payable returns (uint256 vaultId);
    function depositCollateral(uint256 vaultId, uint256 amount) external payable;
    function withdrawCollateral(uint256 vaultId, uint256 amount) external;
    function mintPUSD(uint256 vaultId, uint256 amount) external;
    function repayDebt(uint256 vaultId, uint256 amount) external;
    function liquidateVault(uint256 vaultId, address liquidator) external returns (uint256 seized, uint256 bonus);
    function harvestStakingRewards() external;
}
