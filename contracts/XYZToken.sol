// SPDX-License-Identifier: MIT

pragma solidity ^0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract XYZToken is Ownable, ERC721Enumerable {

    event MinterUpdated(address indexed minter);

    // The address who has permissions to mint tokens
    address public minter;

    /**
     * @notice Require that the sender is the minter.
     */
    modifier onlyMinter() {
        require(msg.sender == minter, 'Sender is not the minter');
        _;
    }

    constructor(address owner) ERC721('XYZToken', 'XYZT') {
        _transferOwnership(owner);
    }

    function mint(address target, uint tokenId) external onlyMinter {
        _safeMint(target, tokenId);
    }

    function exists(uint tokenId) external view returns (bool) {
        return _exists(tokenId);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "https://ipfs.io/ipfs/QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/";
    }

    function setMinter(address _minter) external onlyOwner {
        minter = _minter;

        emit MinterUpdated(_minter);
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
