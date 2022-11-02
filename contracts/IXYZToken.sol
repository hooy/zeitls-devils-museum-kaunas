// SPDX-License-Identifier: MIT

pragma solidity ^0.8.16;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IXYZToken is IERC721 {
    function mint(address target, uint tokenId) external;
    function exists(uint tokenId) external view returns (bool);
}
