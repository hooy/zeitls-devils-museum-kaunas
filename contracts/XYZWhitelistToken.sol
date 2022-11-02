// SPDX-License-Identifier: MIT

pragma solidity ^0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract XYZWhitelistToken is Ownable, ERC721 {

    uint public totalSupply = 0;

    constructor() ERC721('XYZWhitelistToken', 'XYZWT') {}

    function mint(address target) external onlyOwner {
        totalSupply++;
        _safeMint(target, totalSupply);
    }
}
