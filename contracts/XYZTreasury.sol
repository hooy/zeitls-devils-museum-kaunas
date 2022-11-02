// SPDX-License-Identifier: MIT

pragma solidity ^0.8.16;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

contract XYZTreasury is OwnableUpgradeable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    uint private royalty;

    uint private auction;

    address payable public maintainer;

    EnumerableSetUpgradeable.AddressSet private affiliates;

    function initialize() public initializer {
        __Ownable_init();
        royalty = 0;
        auction = 0;
    }

    /**
     * @notice Collects creators fee from marketplaces
     */
    receive() external payable {
        royalty += msg.value;
    }

    /**
     * @notice Collects funds received from the auction house.
     */
    function release() external payable {
        auction += msg.value;
    }

    function distribute() external onlyOwner {
        uint reserve = auction * 20 / 100;
        maintainer.transfer(reserve);

        uint share = auction * 5 / 100;
        for (uint8 i = 0; i < affiliates.length(); i++) {
            payable(affiliates.at(i)).transfer(share);
        }

        uint total = reserve + affiliates.length() * share;
        if (auction != total) {
            revert("Wrong share distribution");
        }

        auction = 0;
    }

    function addAffiliates(address[] calldata _affiliates) external onlyOwner {
        for (uint i = 0; i < _affiliates.length; i++) {
            affiliates.add(_affiliates[i]);
        }

        if (affiliates.length() > 20) {
            revert("Affiliate limit exceeded");
        }
    }

    function removeAffiliates(address[] calldata _affiliates) external onlyOwner {
        for (uint i = 0; i < _affiliates.length; i++) {
            affiliates.remove(_affiliates[i]);
        }
    }
}
