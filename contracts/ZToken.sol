// SPDX-License-Identifier: MIT

pragma solidity ^0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ZToken is Ownable, ERC721 {
    uint price = 0.1 ether;

    uint256 public totalSupply = 0;

    constructor() ERC721("ZToken", "ZT") {}

    function redeem() public payable returns (uint) {
        require(msg.value >= price, "Price not met");

        uint nextId = totalSupply + 1;
        _safeMint(_msgSender(), nextId);
        return nextId;
    }

    function _baseURI() internal pure override returns (string memory) {
        return "https://example.com/";
    }

    function _afterTokenTransfer(address from, address to, uint256 tokenId) internal override {
        super._afterTokenTransfer(from, to, tokenId);

        totalSupply++;
    }

    // @dev The balance transfer from a contract to an owners
    function withdraw(address payable _receiver) external onlyOwner {
        if (address(this).balance > 0) {
            _receiver.transfer(address(this).balance);
        }
    }

    // @dev Allow to withdraw ERC20 tokens from contract itself
    function withdrawERC20(IERC20 _tokenContract) external onlyOwner {
        uint256 balance = _tokenContract.balanceOf(address(this));
        if (balance > 0) {
            _tokenContract.transfer(msg.sender, balance);
        }
    }

    // @dev Allow to withdraw ERC721 tokens from contract itself
    function approveERC721(IERC721 _tokenContract) external onlyOwner {
        _tokenContract.setApprovalForAll(msg.sender, true);
    }
}
