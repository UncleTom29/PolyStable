// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title PGOV
/// @author PolyStable Team
/// @notice Governance token for the PolyStable protocol with voting power delegation
contract PGOV is ERC20, ERC20Permit, ERC20Votes, AccessControl {
    /// @notice Maximum total supply: 100 million pGOV
    uint256 public constant MAX_SUPPLY = 100_000_000e18;

    /// @notice Custom error for zero-balance delegation attempt (dust attack prevention)
    error PGOV__ZeroBalanceDelegation(address delegator);

    /// @notice Custom error for max supply exceeded
    error PGOV__MaxSupplyExceeded(uint256 requested, uint256 maxSupply);

    /// @param initialHolder The address that receives the full initial supply
    constructor(address initialHolder)
        ERC20("PolyStable Governance", "pGOV")
        ERC20Permit("PolyStable Governance")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _mint(initialHolder, MAX_SUPPLY);
    }

    /// @notice Delegate voting power. Reverts if msg.sender has zero balance.
    /// @param delegatee The address to delegate voting power to
    function delegate(address delegatee) public override {
        if (balanceOf(msg.sender) == 0) revert PGOV__ZeroBalanceDelegation(msg.sender);
        super.delegate(delegatee);
    }

    /// @inheritdoc ERC20
    function _update(address from, address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._update(from, to, amount);
    }

    /// @inheritdoc ERC20Permit
    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
