// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title PUSD
/// @author PolyStable Team
/// @notice USD-pegged stablecoin of the PolyStable protocol. Minted against CDP collateral.
contract PUSD is ERC20, ERC20Permit, AccessControl {
    /// @notice Role for minting pUSD (VaultEngine)
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Role for burning pUSD (VaultEngine + LiquidationEngine)
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    /// @notice Maximum total supply: 1 billion pUSD
    uint256 public constant MAX_SUPPLY = 1_000_000_000e18;

    /// @notice Maximum pUSD per address (10M)
    uint256 public constant MAX_PER_ADDRESS = 10_000_000e18;

    /// @notice Emitted when pUSD is minted
    event Minted(address indexed to, uint256 amount);

    /// @notice Emitted when pUSD is burned
    event Burned(address indexed from, uint256 amount);

    // Custom errors
    error PUSD__MaxSupplyExceeded(uint256 requested, uint256 maxSupply);
    error PUSD__MaxPerAddressExceeded(address account, uint256 newBalance, uint256 maxPerAddress);
    error PUSD__ZeroAmount();

    constructor() ERC20("PolyStable USD", "pUSD") ERC20Permit("PolyStable USD") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Mint pUSD to a recipient
    /// @param to The recipient address
    /// @param amount The amount to mint
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (amount == 0) revert PUSD__ZeroAmount();
        if (totalSupply() + amount > MAX_SUPPLY) revert PUSD__MaxSupplyExceeded(totalSupply() + amount, MAX_SUPPLY);
        _mint(to, amount);
        emit Minted(to, amount);
    }

    /// @notice Burn pUSD from an account
    /// @param from The account to burn from
    /// @param amount The amount to burn
    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        if (amount == 0) revert PUSD__ZeroAmount();
        _burn(from, amount);
        emit Burned(from, amount);
    }

    /// @notice Override to enforce 10M per-address mint cap
    /// @param from The sender address (address(0) for mints)
    /// @param to The recipient address
    /// @param amount The transfer amount
    function _update(address from, address to, uint256 amount) internal override {
        // Only enforce cap on mints (from == address(0))
        if (from == address(0) && to != address(0)) {
            uint256 newBalance = balanceOf(to) + amount;
            if (newBalance > MAX_PER_ADDRESS) {
                revert PUSD__MaxPerAddressExceeded(to, newBalance, MAX_PER_ADDRESS);
            }
        }
        super._update(from, to, amount);
    }
}
