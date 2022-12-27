// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.16;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableMapUpgradeable.sol";

contract ZtlDevilsTreasury is OwnableUpgradeable {
    using EnumerableMapUpgradeable for EnumerableMapUpgradeable.AddressToUintMap;

    event Reward(address indexed payee, uint256 amount);

    // Income stream from marketplaces as creators fee
    uint public royalty;

    // Income from direct sells on the website
    uint public income;

    // Organization's address for project maintenance coverage
    address public maintainer;

    // Total shares percentage for affiliates
    uint public shares;

    // Addresses of project success affiliated individuals
    EnumerableMapUpgradeable.AddressToUintMap private affiliates;

    function initialize(address _maintainer) public initializer {
        __Ownable_init();
        royalty = 0;
        income = 0;

        maintainer = _maintainer;
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
    function keep() external payable {
        income += msg.value;
    }

    /**
     * @notice Distribute income between maintainer and affiliates according to the shares.
     */
    function distribute() external onlyOwner {
        uint total = income + royalty;

        // 20% from direct sells must be kept for the project maintenance
        uint reserve = total * 20 / 100;
        uint avail = total - reserve;

        // distribute rewards to affiliates
        uint sent = 0;
        for (uint8 i = 0; i < affiliates.length(); i++) {
            (address affiliate, uint256 share) = affiliates.at(i);
            uint amount = avail * share / 100;
            payable(affiliate).transfer(amount);
            sent += amount;
            emit Reward(affiliate, amount);
        }

        uint reward = reserve + (avail * (100 - shares) / 100);
        payable(maintainer).transfer(reward);
        emit Reward(maintainer, reward);

        if (total != (sent + reward)) {
            revert("Wrong share distribution");
        }

        income = 0;
        royalty = 0;
    }

    function isAffiliate(address addr) view external returns (bool) {
       return affiliates.contains(addr);
    }

    function addAffiliates(address[] calldata _affiliates, uint256[] calldata _shares) external onlyOwner {
        require(_affiliates.length == _shares.length, "Wrong array sizes");

        for (uint i = 0; i < _affiliates.length; i++) {
            bool present = affiliates.set(_affiliates[i], _shares[i]);
            shares += _shares[i];

            if (!present) {
                revert("Share overwrite is forbidden");
            }

            if (shares > 100) {
                revert("Shares total amount for affiliates limit exceeded");
            }
        }
    }

    function removeAffiliates(address[] calldata _affiliates) external onlyOwner {
        for (uint i = 0; i < _affiliates.length; i++) {
            (bool has, uint share) = affiliates.tryGet(_affiliates[i]);

            if (has) {
                affiliates.remove(_affiliates[i]);
                shares -= share;
            }
        }
    }
}
