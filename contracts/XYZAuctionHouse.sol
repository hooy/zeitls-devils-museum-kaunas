// SPDX-License-Identifier: MIT

pragma solidity ^0.8.16;

import {PausableUpgradeable} from '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import {OwnableUpgradeable} from '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import "./IXYZToken.sol";
import "./IXYZTreasury.sol";


contract XYZAuctionHouse is PausableUpgradeable, OwnableUpgradeable {

    event AuctionCreated(uint256 indexed tokenId, uint256 reservePrice);

    event AuctionStarted(uint256 indexed tokenId, uint40 startTime, uint40 endTime);

    event AuctionBid(uint256 indexed tokenId, address sender, uint256 value, bool extended);

    event AuctionExtended(uint256 indexed tokenId, uint256 endTime);

    event AuctionSettled(uint256 indexed tokenId, address winner, uint256 amount);

    event AuctionTimeBufferUpdated(uint256 timeBuffer);

    event AuctionReservePriceUpdated(uint256 reservePrice);

    event AuctionMinBidIncrementPercentageUpdated(uint256 minBidIncrementPercentage);

    struct Auction {
        // The minimum price for a token
        uint256 reservePrice;
        // The current highest bid amount
        uint256 amount;
        // The time that the auction started
        uint40 startTime;
        // The time that the auction is scheduled to end
        uint40 endTime;
        // The address of the current highest bid
        address payable bidder;
        // Whether or not the auction has been settled
        bool settled;
        // Limited auction is available only for whitelisted addresses
        bool limited;
    }

    // The ERC721 token contract
    IXYZToken public token;

    // Contract for holding auction released funds
    IXYZTreasury public treasury;

    // The ERC721 whitelist token contract for community members
    IERC721 public whitelist;

    // The minimum amount of time left in an auction after a new bid is created
    uint40 public timeBuffer;

    // The duration of a single auction
    uint40 public duration;

    // The minimum percentage difference between the last bid amount and the current bid
    uint8 public minBidIncrementPercentage;

    // Token ID to the auction
    mapping (uint => Auction) public auctions;

    /**
    * @notice Initialize the auction and base contracts,
     * populate configuration values, and pause the contract.
     * @dev This function can only be called once.
     */
    function initialize(
        IXYZToken _token,
        IXYZTreasury _treasury,
        IERC721 _whitelist,
        uint40 _timeBuffer,
        uint40 _duration,
        uint8 _minBidIncrementPercentage
    ) external initializer {
        __Pausable_init();
        __Ownable_init();

        _pause();

        token = _token;
        treasury = _treasury;
        whitelist = _whitelist;
        timeBuffer = _timeBuffer;
        duration = _duration;
        minBidIncrementPercentage = _minBidIncrementPercentage;
    }

    /**
     * @notice Pause the Nouns auction house.
     * @dev This function can only be called by the owner when the
     * contract is unpaused. While no new auctions can be started when paused,
     * anyone can settle an ongoing auction.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the Nouns auction house.
     * @dev This function can only be called by the owner when the contract is paused.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Create an auction.
     */
    function createAuction(uint256 tokenId, uint256 price, bool limited) external onlyOwner whenNotPaused {
        _createAuction(tokenId, price, limited);
    }

    function createAuctions(uint256[] calldata tokenIds, uint256[] calldata prices, bool[] calldata limited) external onlyOwner whenNotPaused {
        for (uint i = 0; i < tokenIds.length; i++) {
            _createAuction(tokenIds[i], prices[i], limited[i]);
        }
    }

    /**
     * @notice Create a bid for a token, with a given amount.
     * @dev This contract only accepts payment in ETH.
     */
    function bid(uint256 tokenId) external payable whenNotPaused {
        Auction storage auction = auctions[tokenId];

        require(auction.reservePrice > 0, "Auction does not exist");
        require(!auction.limited || whitelist.balanceOf(msg.sender) > 0, "Sender is not whitelisted");
        require(msg.value >= auction.reservePrice, 'Must send at least reservePrice');
        require(auction.startTime == 0 || block.timestamp < auction.endTime, 'Auction expired');
        require(
            msg.value >= auction.amount + ((auction.amount * minBidIncrementPercentage) / 100),
            'Must send more than last bid by minBidIncrementPercentage amount'
        );

        // the first bid on the auction, start the countdown
        if (auction.startTime == 0) {
            auction.startTime = uint40(block.timestamp);
            auction.endTime = auction.startTime + duration;
            emit AuctionStarted(tokenId, auction.startTime, auction.endTime);
        }

        address payable lastBidder = auction.bidder;

        // Refund the last bidder, if applicable
        if (lastBidder != address(0)) {
            _safeTransferETHWithFallback(lastBidder, auction.amount);
        }

        auction.amount = msg.value;
        auction.bidder = payable(msg.sender);

        // Extend the auction if the bid was received within `timeBuffer` of the auction end time
        bool extended = auction.endTime - uint40(block.timestamp) < timeBuffer;
        if (extended) {
            auction.endTime = auction.endTime = uint40(block.timestamp) + timeBuffer;
        }

        emit AuctionBid(tokenId, msg.sender, msg.value, extended);

        if (extended) {
            emit AuctionExtended(tokenId, auction.endTime);
        }
    }

    function settleAuction(uint256 tokenId) external {
        _settleAuction(tokenId);
    }

    function _createAuction(uint tokenId, uint reservePrice, bool limited) internal {
        require(reservePrice > 0, "Reserve price must be defined");
        require(auctions[tokenId].reservePrice == 0, "Auction already exist");
        require(!token.exists(tokenId), "Token already exist");

        Auction memory auction = Auction({
            reservePrice: reservePrice,
            amount: 0,
            startTime: 0,
            endTime: 0,
            bidder: payable(0),
            settled: false,
            limited: limited
        });

        auctions[tokenId] = auction;

        emit AuctionCreated(tokenId, reservePrice);
    }

    /**
     * @notice Settle an auction, finalizing the bid and paying out to the owner.
     * @dev If there are no bids, the Noun is burned.
     */
    function _settleAuction(uint256 tokenId) internal {
        Auction memory auction = auctions[tokenId];

        require(auction.startTime != 0, "Auction hasn't begun");
        require(!auction.settled, "Auction has already been settled");
        require(block.timestamp >= auction.endTime, "Auction hasn't completed");

        auction.settled = true;

        token.mint(auction.bidder, tokenId);

        if (auction.amount > 0) {
            treasury.release{ value: auction.amount }();
        }

        emit AuctionSettled(tokenId, auction.bidder, auction.amount);
    }

    /**
     * @notice Transfer ETH. If the ETH transfer fails, wrap the ETH and try send it as WETH.
     */
    function _safeTransferETHWithFallback(address to, uint256 amount) internal {
        if (!_safeTransferETH(to, amount)) {
//            IWETH(weth).deposit{ value: amount }();
//            IERC20(weth).transfer(to, amount);
            // todo handle or do not refund
        }
    }

    /**
     * @notice Transfer ETH and return the success status.
     * @dev This function only forwards 30,000 gas to the callee.
     */
    function _safeTransferETH(address to, uint256 value) internal returns (bool) {
        (bool success, ) = to.call{ value: value, gas: 30_000 }(new bytes(0));
        return success;
    }
}
