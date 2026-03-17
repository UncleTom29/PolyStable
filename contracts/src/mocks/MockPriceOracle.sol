// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockPriceOracle {
    mapping(address => uint256) public prices;
    mapping(address => uint256) public lastCachedPrice;

    function setPrice(address collateral, uint256 price) external {
        prices[collateral] = price;
        lastCachedPrice[collateral] = price;
    }

    function getPrice(address collateral) external returns (uint256 price18, uint8 decimals) {
        price18 = prices[collateral];
        if (price18 == 0) price18 = 10e18;
        lastCachedPrice[collateral] = price18;
        decimals = 18;
    }

    function getTWAP(address collateral) external view returns (uint256) {
        return prices[collateral];
    }

    function registerFeed(address, address) external {}
}
