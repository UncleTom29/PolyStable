// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IVaultEngine.sol";
import "../interfaces/ISurplusBuffer.sol";
import "../core/PriceOracle.sol";
import "../tokens/PUSD.sol";

/// @title VaultEngine
/// @author PolyStable Team
/// @notice Core CDP engine: manages vaults, collateral, debt, interest accrual, and DOT staking
contract VaultEngine is IVaultEngine, Pausable, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Roles ───────────────────────────────────────────────────────────────
    bytes32 public constant COLLATERAL_ADMIN_ROLE = keccak256("COLLATERAL_ADMIN_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");

    // ─── Constants ────────────────────────────────────────────────────────────
    /// @dev Staking precompile address and selectors
    uint256 internal constant STAKING_PRECOMPILE = 0x800;
    uint256 internal constant STAKING_BOND_SELECTOR = 0x6dd20151;
    uint256 internal constant STAKING_BOND_EXTRA_SELECTOR = 0xeaca88de;
    uint256 internal constant STAKING_UNBOND_SELECTOR = 0x27de9e32;
    uint256 internal constant STAKING_WITHDRAW_UNBONDED_SELECTOR = 0x548a6706;
    uint256 internal constant STAKING_CLAIM_REWARDS_SELECTOR = 0x2efe8a5f;
    uint256 internal constant STAKING_GET_PENDING_REWARDS_SELECTOR = 0xf6ed2017;

    /// @dev Ray (27 decimal fixed-point)
    uint256 internal constant RAY = 1e27;

    /// @dev Seconds per year
    uint256 internal constant SECONDS_PER_YEAR = 365 days;

    // ─── State ────────────────────────────────────────────────────────────────
    /// @notice Collateral types indexed by keccak256(token address)
    mapping(bytes32 => CollateralType) public collateralTypes;

    /// @notice Vaults indexed by vault ID
    mapping(uint256 => Vault) public vaults;

    /// @notice Next vault ID counter
    uint256 public nextVaultId;

    /// @notice The pUSD token
    PUSD public immutable pusd;

    /// @notice The price oracle
    PriceOracle public immutable oracle;

    /// @notice The surplus buffer
    ISurplusBuffer public immutable surplusBuffer;

    /// @notice Whether native DOT deposits should be auto-staked via the staking precompile
    bool public nativeAutoStakingEnabled = true;

    // ─── Events ───────────────────────────────────────────────────────────────
    event VaultOpened(uint256 indexed vaultId, address indexed owner, address indexed collateral, uint256 deposit, uint256 minted);
    event CollateralDeposited(uint256 indexed vaultId, uint256 amount);
    event CollateralWithdrawn(uint256 indexed vaultId, uint256 amount);
    event PUSDMinted(uint256 indexed vaultId, uint256 amount);
    event DebtRepaid(uint256 indexed vaultId, uint256 amount);
    event InterestAccrued(uint256 indexed vaultId, uint256 delta);
    event StakingRewardsHarvested(uint256 amount);
    event CollateralAdded(address indexed collateral, uint256 minRatio, uint256 debtCeiling);
    event CollateralUpdated(address indexed collateral);
    event NativeAutoStakingUpdated(bool enabled);
    event VaultLiquidated(uint256 indexed vaultId, address indexed liquidator, uint256 seized, uint256 debt);

    // ─── Custom Errors ────────────────────────────────────────────────────────
    error VaultEngine__BelowMinRatio(uint256 ratio, uint256 minRatio);
    error VaultEngine__DebtCeilingExceeded(uint256 req, uint256 ceiling);
    error VaultEngine__NotVaultOwner(uint256 vaultId, address caller);
    error VaultEngine__CollateralNotActive(address collateral);
    error VaultEngine__ZeroAmount();
    error VaultEngine__VaultNotFound(uint256 vaultId);
    error VaultEngine__TransferFailed();
    error VaultEngine__NativeMsgValueMismatch(uint256 sent, uint256 expected);
    error VaultEngine__VaultHealthy(uint256 ratio, uint256 minRatio);

    /// @param _pusd The pUSD token address
    /// @param _oracle The price oracle address
    /// @param _surplusBuffer The surplus buffer address
    constructor(address _pusd, address _oracle, address _surplusBuffer) {
        pusd = PUSD(_pusd);
        oracle = PriceOracle(_oracle);
        surplusBuffer = ISurplusBuffer(_surplusBuffer);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(COLLATERAL_ADMIN_ROLE, msg.sender);
        _grantRole(GUARDIAN_ROLE, msg.sender);
    }

    // ─── Admin Functions ──────────────────────────────────────────────────────

    /// @notice Add a new collateral type
    /// @param token The collateral token address (address(0) for native DOT)
    /// @param minRatio The minimum collateralization ratio (1e18 = 100%)
    /// @param stabilityFee The annual stability fee in ray (1.05e27 = 5% APY)
    /// @param liquidationBonus The liquidation bonus (5e16 = 5%)
    /// @param debtCeiling The maximum pUSD mintable against this collateral
    function addCollateral(
        address token,
        uint256 minRatio,
        uint256 stabilityFee,
        uint256 liquidationBonus,
        uint256 debtCeiling
    ) external onlyRole(COLLATERAL_ADMIN_ROLE) {
        bytes32 key = keccak256(abi.encodePacked(token));
        collateralTypes[key] = CollateralType({
            token: token,
            minRatio: minRatio,
            stabilityFee: stabilityFee,
            liquidationBonus: liquidationBonus,
            debtCeiling: debtCeiling,
            totalDebt: 0,
            active: true
        });
        emit CollateralAdded(token, minRatio, debtCeiling);
    }

    /// @notice Update collateral parameters
    /// @param token The collateral token address
    /// @param minRatio The new minimum ratio
    /// @param stabilityFee The new stability fee
    /// @param liquidationBonus The new liquidation bonus
    /// @param debtCeiling The new debt ceiling
    /// @param active Whether the collateral is active
    function updateCollateral(
        address token,
        uint256 minRatio,
        uint256 stabilityFee,
        uint256 liquidationBonus,
        uint256 debtCeiling,
        bool active
    ) external onlyRole(COLLATERAL_ADMIN_ROLE) {
        bytes32 key = keccak256(abi.encodePacked(token));
        CollateralType storage ct = collateralTypes[key];
        ct.minRatio = minRatio;
        ct.stabilityFee = stabilityFee;
        ct.liquidationBonus = liquidationBonus;
        ct.debtCeiling = debtCeiling;
        ct.active = active;
        emit CollateralUpdated(token);
    }

    /// @notice Enable or disable best-effort native DOT auto-staking hooks
    function setNativeAutoStakingEnabled(bool enabled) external onlyRole(COLLATERAL_ADMIN_ROLE) {
        nativeAutoStakingEnabled = enabled;
        emit NativeAutoStakingUpdated(enabled);
    }

    /// @notice Pause the vault engine
    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    /// @notice Unpause the vault engine
    function unpause() external onlyRole(GUARDIAN_ROLE) {
        _unpause();
    }

    // ─── Vault Operations ─────────────────────────────────────────────────────

    /// @notice Open a new CDP vault
    /// @param collateral The collateral token (address(0) for native DOT)
    /// @param deposit The amount of collateral to deposit
    /// @param mintAmount The amount of pUSD to mint
    /// @return vaultId The ID of the newly opened vault
    function openVault(
        address collateral,
        uint256 deposit,
        uint256 mintAmount
    ) external payable override whenNotPaused nonReentrant returns (uint256 vaultId) {
        if (deposit == 0) revert VaultEngine__ZeroAmount();

        bytes32 key = keccak256(abi.encodePacked(collateral));
        CollateralType storage ct = collateralTypes[key];
        if (!ct.active) revert VaultEngine__CollateralNotActive(collateral);

        // Handle native DOT vs ERC20
        if (collateral == address(0)) {
            if (msg.value != deposit) revert VaultEngine__NativeMsgValueMismatch(msg.value, deposit);
        } else {
            IERC20(collateral).safeTransferFrom(msg.sender, address(this), deposit);
        }

        vaultId = nextVaultId++;
        vaults[vaultId] = Vault({
            owner: msg.sender,
            collateral: collateral,
            lockedAmount: deposit,
            debt: 0,
            lastAccrual: block.timestamp
        });

        if (mintAmount > 0) {
            // Check debt ceiling
            if (ct.totalDebt + mintAmount > ct.debtCeiling) {
                revert VaultEngine__DebtCeilingExceeded(ct.totalDebt + mintAmount, ct.debtCeiling);
            }

            vaults[vaultId].debt = mintAmount;
            ct.totalDebt += mintAmount;

            // Check ratio
            uint256 ratio = _getCollateralRatio(vaultId);
            if (ratio < ct.minRatio) revert VaultEngine__BelowMinRatio(ratio, ct.minRatio);

            pusd.mint(msg.sender, mintAmount);
        }

        // Auto-stake DOT via staking precompile
        if (collateral == address(0)) {
            _bondNativeCollateral(deposit);
        }

        emit VaultOpened(vaultId, msg.sender, collateral, deposit, mintAmount);
    }

    /// @notice Deposit additional collateral into a vault
    /// @param vaultId The vault ID
    /// @param amount The amount of collateral to add (0 for native DOT using msg.value)
    function depositCollateral(uint256 vaultId, uint256 amount) external payable override whenNotPaused nonReentrant {
        Vault storage vault = vaults[vaultId];
        if (vault.owner == address(0)) revert VaultEngine__VaultNotFound(vaultId);
        if (vault.owner != msg.sender) revert VaultEngine__NotVaultOwner(vaultId, msg.sender);

        uint256 depositAmount = amount;
        if (vault.collateral == address(0)) {
            depositAmount = msg.value;
            if (depositAmount == 0) revert VaultEngine__ZeroAmount();
        } else {
            if (amount == 0) revert VaultEngine__ZeroAmount();
            IERC20(vault.collateral).safeTransferFrom(msg.sender, address(this), amount);
        }

        // Effects
        vault.lockedAmount += depositAmount;

        // Re-stake if DOT
        if (vault.collateral == address(0)) {
            _callStakingUint256(STAKING_BOND_EXTRA_SELECTOR, depositAmount);
        }

        emit CollateralDeposited(vaultId, depositAmount);
    }

    /// @notice Withdraw collateral from a vault
    /// @param vaultId The vault ID
    /// @param amount The amount to withdraw
    function withdrawCollateral(uint256 vaultId, uint256 amount) external override whenNotPaused nonReentrant {
        if (amount == 0) revert VaultEngine__ZeroAmount();

        Vault storage vault = vaults[vaultId];
        if (vault.owner == address(0)) revert VaultEngine__VaultNotFound(vaultId);
        if (vault.owner != msg.sender) revert VaultEngine__NotVaultOwner(vaultId, msg.sender);

        // Accrue interest first
        _accrueInterest(vaultId);

        // Check ratio after withdrawal
        uint256 newLocked = vault.lockedAmount - amount;
        vault.lockedAmount = newLocked;

        if (vault.debt > 0) {
            uint256 ratio = _getCollateralRatio(vaultId);
            bytes32 key = keccak256(abi.encodePacked(vault.collateral));
            if (ratio < collateralTypes[key].minRatio) {
                revert VaultEngine__BelowMinRatio(ratio, collateralTypes[key].minRatio);
            }
        }

        // Interactions
        if (vault.collateral == address(0)) {
            _callStakingUint256(STAKING_UNBOND_SELECTOR, amount);
            _callStakingUint32(STAKING_WITHDRAW_UNBONDED_SELECTOR, uint32(0));
            (bool ok,) = msg.sender.call{value: amount}("");
            if (!ok) revert VaultEngine__TransferFailed();
        } else {
            IERC20(vault.collateral).safeTransfer(msg.sender, amount);
        }

        emit CollateralWithdrawn(vaultId, amount);
    }

    /// @notice Mint additional pUSD from a vault
    /// @param vaultId The vault ID
    /// @param amount The amount of pUSD to mint
    function mintPUSD(uint256 vaultId, uint256 amount) external override whenNotPaused nonReentrant {
        if (amount == 0) revert VaultEngine__ZeroAmount();

        Vault storage vault = vaults[vaultId];
        if (vault.owner == address(0)) revert VaultEngine__VaultNotFound(vaultId);
        if (vault.owner != msg.sender) revert VaultEngine__NotVaultOwner(vaultId, msg.sender);

        // Accrue interest first
        _accrueInterest(vaultId);

        bytes32 key = keccak256(abi.encodePacked(vault.collateral));
        CollateralType storage ct = collateralTypes[key];

        // Check ceiling
        if (ct.totalDebt + amount > ct.debtCeiling) {
            revert VaultEngine__DebtCeilingExceeded(ct.totalDebt + amount, ct.debtCeiling);
        }

        // Effects
        vault.debt += amount;
        ct.totalDebt += amount;

        // Check ratio
        uint256 ratio = _getCollateralRatio(vaultId);
        if (ratio < ct.minRatio) {
            revert VaultEngine__BelowMinRatio(ratio, ct.minRatio);
        }

        // Interaction
        pusd.mint(msg.sender, amount);

        emit PUSDMinted(vaultId, amount);
    }

    /// @notice Repay pUSD debt on a vault
    /// @param vaultId The vault ID
    /// @param amount The amount of pUSD to repay
    function repayDebt(uint256 vaultId, uint256 amount) external override whenNotPaused nonReentrant {
        if (amount == 0) revert VaultEngine__ZeroAmount();

        Vault storage vault = vaults[vaultId];
        if (vault.owner == address(0)) revert VaultEngine__VaultNotFound(vaultId);

        // Accrue interest first
        _accrueInterest(vaultId);

        uint256 repay = amount > vault.debt ? vault.debt : amount;
        bytes32 key = keccak256(abi.encodePacked(vault.collateral));

        // Effects
        vault.debt -= repay;
        collateralTypes[key].totalDebt -= repay;

        // Interaction: burn pUSD from caller
        pusd.burn(msg.sender, repay);

        emit DebtRepaid(vaultId, repay);
    }

    /// @notice Get the collateralization ratio for a vault
    /// @param vaultId The vault ID
    /// @return The ratio in 1e18 units (1.5e18 = 150%)
    function getCollateralRatio(uint256 vaultId) external view override returns (uint256) {
        return _getCollateralRatio(vaultId);
    }

    /// @notice Get a vault's data
    /// @param vaultId The vault ID
    /// @return The vault struct
    function getVault(uint256 vaultId) external view override returns (Vault memory) {
        return vaults[vaultId];
    }

    /// @notice Get collateral type data
    /// @param collateral The collateral token address
    /// @return The collateral type struct
    function getCollateralType(address collateral) external view override returns (CollateralType memory) {
        bytes32 key = keccak256(abi.encodePacked(collateral));
        return collateralTypes[key];
    }

    /// @notice Liquidate a vault (callable by LiquidationEngine)
    /// @param vaultId The vault to liquidate
    /// @param liquidator The liquidator address
    /// @return seized The amount of collateral seized
    /// @return bonus The liquidation bonus amount
    function liquidateVault(
        uint256 vaultId,
        address liquidator
    ) external override onlyRole(LIQUIDATOR_ROLE) nonReentrant returns (uint256 seized, uint256 bonus) {
        Vault storage vault = vaults[vaultId];
        if (vault.owner == address(0)) revert VaultEngine__VaultNotFound(vaultId);

        _accrueInterest(vaultId);

        bytes32 key = keccak256(abi.encodePacked(vault.collateral));
        CollateralType storage ct = collateralTypes[key];

        uint256 ratio = _getCollateralRatio(vaultId);
        if (ratio >= ct.minRatio) revert VaultEngine__VaultHealthy(ratio, ct.minRatio);

        (uint256 price18,) = oracle.getPrice(vault.collateral);

        uint256 debtToClear = vault.debt;
        uint256 lockedAmount = vault.lockedAmount;
        seized = (debtToClear * (1e18 + ct.liquidationBonus)) / price18;
        if (seized > lockedAmount) seized = lockedAmount;

        bonus = seized - (debtToClear * 1e18 / price18);

        // Effects
        ct.totalDebt -= debtToClear;
        vault.debt = 0;
        vault.lockedAmount = 0;

        // Transfer remainder to owner
        uint256 remainder = lockedAmount > seized ? lockedAmount - seized : 0;

        // Interactions
        // Burn pUSD from liquidator
        pusd.burn(liquidator, debtToClear);

        // Transfer seized collateral to liquidator
        _transferLiquidationCollateral(vault.collateral, liquidator, vault.owner, seized, remainder);

        emit VaultLiquidated(vaultId, liquidator, seized, debtToClear);
    }

    /// @notice Harvest staking rewards and send to surplus buffer
    function harvestStakingRewards() external override {
        uint256 pending = _getPendingStakingRewards();
        if (pending == 0) return;

        if (!_callStakingAddressUint32(STAKING_CLAIM_REWARDS_SELECTOR, address(this), uint32(0))) {
            return;
        }

        // Send DOT rewards to surplus buffer
        (bool ok,) = address(surplusBuffer).call{value: pending}("");
        if (!ok) revert VaultEngine__TransferFailed();

        emit StakingRewardsHarvested(pending);
    }

    // ─── Internal Functions ───────────────────────────────────────────────────

    /// @dev Accrue interest for a vault using compound formula in ray math
    function _accrueInterest(uint256 vaultId) internal {
        Vault storage vault = vaults[vaultId];
        if (vault.debt == 0) {
            vault.lastAccrual = block.timestamp;
            return;
        }

        bytes32 key = keccak256(abi.encodePacked(vault.collateral));
        CollateralType storage ct = collateralTypes[key];

        uint256 elapsed = block.timestamp - vault.lastAccrual;
        if (elapsed == 0) return;

        // Compound: newDebt = debt * (rate^(elapsed/year))
        // Approximation: newDebt = debt * (1 + rate * elapsed / year) for small rates
        // For full compound: use per-second rate
        // stabilityFee is in ray (e.g., 1.05e27 for 5% APY)
        // Per-second rate: (stabilityFee - RAY) / SECONDS_PER_YEAR
        uint256 ratePerSecond = (ct.stabilityFee - RAY);
        uint256 interestFactor = RAY + (ratePerSecond * elapsed) / SECONDS_PER_YEAR;

        uint256 newDebt = (vault.debt * interestFactor) / RAY;
        uint256 delta = newDebt - vault.debt;

        // Effects
        vault.debt = newDebt;
        vault.lastAccrual = block.timestamp;
        ct.totalDebt += delta;

        // Interactions: send delta to surplus buffer
        if (delta > 0) {
            try surplusBuffer.receiveRevenueAmount(delta) {} catch {}
            emit InterestAccrued(vaultId, delta);
        }
    }

    /// @dev Get the collateralization ratio for a vault (view-only)
    function _getCollateralRatio(uint256 vaultId) internal view returns (uint256) {
        Vault storage vault = vaults[vaultId];
        if (vault.debt == 0) return type(uint256).max;

        // Use cached price for view function
        uint256 price18 = oracle.lastCachedPrice(vault.collateral);
        if (price18 == 0) return type(uint256).max;

        return (vault.lockedAmount * price18) / vault.debt;
    }

    /// @dev Build the `bond(address,uint256,bytes)` calldata manually to avoid MCOPY on the native path.
    function _bondNativeCollateral(uint256 amount) internal returns (bool ok) {
        if (!nativeAutoStakingEnabled) return false;

        assembly {
            let ptr := mload(0x40)
            mstore(ptr, shl(224, STAKING_BOND_SELECTOR))
            mstore(add(ptr, 0x04), address())
            mstore(add(ptr, 0x24), amount)
            mstore(add(ptr, 0x44), 0x60)
            mstore(add(ptr, 0x64), 0x01)
            mstore(add(ptr, 0x84), 0x00)
            ok := call(gas(), STAKING_PRECOMPILE, 0, ptr, 0xa4, 0, 0)
        }
    }

    function _callStakingUint256(uint256 selector, uint256 value) internal returns (bool ok) {
        if (!nativeAutoStakingEnabled) return false;

        assembly {
            let ptr := mload(0x40)
            mstore(ptr, shl(224, selector))
            mstore(add(ptr, 0x04), value)
            ok := call(gas(), STAKING_PRECOMPILE, 0, ptr, 0x24, 0, 0)
        }
    }

    function _callStakingUint32(uint256 selector, uint32 value) internal returns (bool ok) {
        if (!nativeAutoStakingEnabled) return false;

        assembly {
            let ptr := mload(0x40)
            mstore(ptr, shl(224, selector))
            mstore(add(ptr, 0x04), value)
            ok := call(gas(), STAKING_PRECOMPILE, 0, ptr, 0x24, 0, 0)
        }
    }

    function _callStakingAddressUint32(uint256 selector, address account, uint32 value) internal returns (bool ok) {
        if (!nativeAutoStakingEnabled) return false;

        assembly {
            let ptr := mload(0x40)
            mstore(ptr, shl(224, selector))
            mstore(add(ptr, 0x04), account)
            mstore(add(ptr, 0x24), value)
            ok := call(gas(), STAKING_PRECOMPILE, 0, ptr, 0x44, 0, 0)
        }
    }

    /// @dev Read pending rewards defensively because some environments expose an incompatible staking precompile.
    function _getPendingStakingRewards() internal view returns (uint256 pending) {
        if (!nativeAutoStakingEnabled) return 0;

        bool ok;
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, shl(224, STAKING_GET_PENDING_REWARDS_SELECTOR))
            mstore(add(ptr, 0x04), address())
            mstore(add(ptr, 0x24), 0x00)
            ok := staticcall(gas(), STAKING_PRECOMPILE, ptr, 0x24, add(ptr, 0x24), 0x20)
            if and(ok, eq(returndatasize(), 0x20)) {
                pending := mload(add(ptr, 0x24))
            }
        }
    }

    function _transferLiquidationCollateral(
        address collateral,
        address liquidator,
        address owner,
        uint256 seized,
        uint256 remainder
    ) internal {
        if (collateral == address(0)) {
            (bool ok,) = liquidator.call{value: seized}("");
            if (!ok) revert VaultEngine__TransferFailed();
            if (remainder > 0) {
                (bool ok2,) = owner.call{value: remainder}("");
                if (!ok2) revert VaultEngine__TransferFailed();
            }
            return;
        }

        IERC20(collateral).safeTransfer(liquidator, seized);
        if (remainder > 0) {
            IERC20(collateral).safeTransfer(owner, remainder);
        }
    }

    receive() external payable {}
}
