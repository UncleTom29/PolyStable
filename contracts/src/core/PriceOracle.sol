// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/// @title PriceOracle
/// @author PolyStable Team
/// @notice Price oracle with Chainlink feeds, staleness checks, TWAP via circular buffer, and fallback cache
contract PriceOracle is AccessControl {
    /// @notice Role for registering and updating price feeds
    bytes32 public constant ORACLE_ADMIN_ROLE = keccak256("ORACLE_ADMIN_ROLE");

    /// @notice Maximum staleness for price data (1 hour)
    uint256 public constant MAX_STALENESS = 1 hours;

    /// @notice Number of prices stored in the circular buffer for TWAP
    uint8 public constant BUFFER_SIZE = 8;

    struct PriceFeed {
        address feed;
        uint8 decimals;
    }

    struct PriceBuffer {
        uint256[8] prices;
        uint8 head;
        uint8 count;
    }

    /// @notice Mapping from collateral token to Chainlink feed
    mapping(address => PriceFeed) public priceFeeds;

    /// @notice Circular buffer of recent prices per asset
    mapping(address => PriceBuffer) private _priceBuffers;

    /// @notice Last cached price per asset (fallback)
    mapping(address => uint256) public lastCachedPrice;

    /// @notice Emitted when a price feed is registered or updated
    event FeedRegistered(address indexed collateral, address indexed feed);

    /// @notice Emitted when oracle falls back to cached price
    event OracleFallback(address indexed collateral, uint256 cachedPrice);

    // Custom errors
    error PriceOracle__FeedNotFound(address collateral);
    error PriceOracle__InvalidPrice(address collateral, int256 price);
    error PriceOracle__NoCachedPrice(address collateral);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ADMIN_ROLE, msg.sender);
    }

    /// @notice Register or update a Chainlink price feed for a collateral
    /// @param collateral The collateral token address (address(0) for native DOT)
    /// @param feed The Chainlink aggregator address
    function registerFeed(address collateral, address feed) external onlyRole(ORACLE_ADMIN_ROLE) {
        uint8 dec = AggregatorV3Interface(feed).decimals();
        priceFeeds[collateral] = PriceFeed({ feed: feed, decimals: dec });
        emit FeedRegistered(collateral, feed);
    }

    /// @notice Get the current price normalized to 18 decimals
    /// @param collateral The collateral token address
    /// @return price18 The price normalized to 18 decimals
    /// @return decimals The original decimals of the price feed
    function getPrice(address collateral) public returns (uint256 price18, uint8 decimals) {
        PriceFeed memory pf = priceFeeds[collateral];
        if (pf.feed == address(0)) revert PriceOracle__FeedNotFound(collateral);

        try AggregatorV3Interface(pf.feed).latestRoundData() returns (
            uint80,
            int256 answer,
            uint256,
            uint256 updatedAt,
            uint80
        ) {
            if (answer <= 0) {
                return _fallback(collateral, pf.decimals);
            }
            if (block.timestamp - updatedAt > MAX_STALENESS) {
                return _fallback(collateral, pf.decimals);
            }

            price18 = _normalize(uint256(answer), pf.decimals);
            decimals = pf.decimals;

            // Update circular buffer and cache
            lastCachedPrice[collateral] = price18;
            _pushBuffer(collateral, price18);
        } catch {
            return _fallback(collateral, pf.decimals);
        }
    }

    /// @notice Get the TWAP (median of last 8 prices) for a collateral
    /// @param collateral The collateral token address
    /// @return twap The TWAP price normalized to 18 decimals
    function getTWAP(address collateral) external view returns (uint256 twap) {
        PriceBuffer storage buf = _priceBuffers[collateral];
        uint8 count = buf.count;
        if (count == 0) revert PriceOracle__NoCachedPrice(collateral);

        uint256[] memory prices = new uint256[](count);
        for (uint8 i = 0; i < count; i++) {
            prices[i] = buf.prices[i];
        }

        // Sort (insertion sort for small N)
        for (uint8 i = 1; i < count; i++) {
            uint256 key = prices[i];
            int8 j = int8(i) - 1;
            while (j >= 0 && prices[uint8(j)] > key) {
                prices[uint8(j + 1)] = prices[uint8(j)];
                j--;
            }
            prices[uint8(j + 1)] = key;
        }

        // Return median
        if (count % 2 == 0) {
            twap = (prices[count / 2 - 1] + prices[count / 2]) / 2;
        } else {
            twap = prices[count / 2];
        }
    }

    /// @dev Push a price into the circular buffer
    function _pushBuffer(address collateral, uint256 price) internal {
        PriceBuffer storage buf = _priceBuffers[collateral];
        buf.prices[buf.head] = price;
        buf.head = (buf.head + 1) % BUFFER_SIZE;
        if (buf.count < BUFFER_SIZE) buf.count++;
    }

    /// @dev Return the cached price as fallback
    function _fallback(address collateral, uint8 dec) internal returns (uint256 price18, uint8 decimals) {
        uint256 cached = lastCachedPrice[collateral];
        if (cached == 0) revert PriceOracle__NoCachedPrice(collateral);
        emit OracleFallback(collateral, cached);
        return (cached, dec);
    }

    /// @dev Normalize a price to 18 decimals
    function _normalize(uint256 price, uint8 dec) internal pure returns (uint256) {
        if (dec < 18) {
            return price * (10 ** (18 - dec));
        } else if (dec > 18) {
            return price / (10 ** (dec - 18));
        }
        return price;
    }
}
