// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ZtlDevilsWhitelist is Ownable, ERC721 {

    uint public totalSupply = 0;

    string public uri;

    constructor(string memory _uri) ERC721('Zeitls Devils Private', 'DEVILS-PVT') {
        uri = _uri;
    }

    function _baseURI() internal view override returns (string memory) {
        return uri;
    }


    function mint(address target) external onlyOwner {
        totalSupply++;
        _safeMint(target, totalSupply);
    }

    function mintBatch(address[] calldata targets) external onlyOwner {
        for (uint i = 0; i < targets.length; i++) {
            totalSupply++;
            _safeMint(targets[i], totalSupply);
        }
    }

    function burn(uint id) external onlyOwner {
        totalSupply--;
        _burn(id);
    }

    function burnBatch(uint[] calldata ids) external onlyOwner {
        for (uint i = 0; i < ids.length; i++) {
            totalSupply--;
            _burn(ids[i]);
        }
    }
}
