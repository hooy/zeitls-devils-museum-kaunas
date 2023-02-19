// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.17;

import "../ZtlDevilsPieces.sol";

contract ZtlDevilsPiecesMock is ZtlDevilsPieces {

    constructor(address owner, address _signer, IZtlDevilsTreasury _treasury, IProxyRegistry _proxyRegistry) ZtlDevilsPieces(owner, _signer, _treasury, _proxyRegistry, "ipfs://") {}

    function mint(address receiver, uint256 tokenId) external {
        _safeMint(receiver, tokenId);
    } 

}