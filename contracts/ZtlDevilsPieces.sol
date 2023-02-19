// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./opensea/IProxyRegistry.sol";
import "./IZtlDevilsTreasury.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title Zeitls Devil's Piece token contract.
 */
contract ZtlDevilsPieces is Ownable, ERC721Enumerable {
    using ECDSA for bytes32;

    /// @notice Address which private key signed the permission for a piece mint.
    address public signer;

    /// @notice Contract for holding funds from purchases. 
    IZtlDevilsTreasury public treasury;

    /// @notice OpenSea's Proxy Registry.
    IProxyRegistry public immutable proxyRegistry;

    /// @notice Piece metadata uri.
    string public uri;

    constructor(
        address owner,
        address _signer,
        IZtlDevilsTreasury _treasury, 
        IProxyRegistry _proxyRegistry, 
        string memory _uri
    ) ERC721("Zeitls Devils Pieces", "DEVILS-PIECES") {
        _transferOwnership(owner);
        signer = _signer;
        proxyRegistry = _proxyRegistry;
        treasury = _treasury;
        uri = _uri;
    }

    /**
     * @notice Override isApprovedForAll to whitelist user's OpenSea proxy accounts to enable gas-less listings.
     */
    function isApprovedForAll(address owner, address operator) public view override(IERC721, ERC721) returns (bool) {
        // Whitelist OpenSea proxy contract for easy trading.
        if (address(proxyRegistry) != address(0x0) && proxyRegistry.proxies(owner) == operator) {
            return true;
        }
        return super.isApprovedForAll(owner, operator);
    }

    /**
     * @notice Purchase Devils pieces with permission.
     * @dev Used signature where each piece included with a price. 
     * @param pieces id of pieces. 
     * @param prices price per piece according to index. 
     * @param deadline the time util price is effective.
     * @param signature off-chain signed permission.  
     */
    function purchase(uint256[] calldata pieces, uint256[] calldata prices, uint256 deadline, bytes calldata signature) public payable {
        require(pieces.length == prices.length, "Invalid arrays size");
        require(block.timestamp <= deadline, "Price offer expired");

        bytes32 msgHash;
        uint256 totalAmount;

        for (uint i = 0; i < pieces.length; i++) {
            require(!_exists(pieces[i]), "Piece already exist");
            totalAmount += prices[i];
            msgHash = keccak256(bytes.concat(msgHash, abi.encodePacked(pieces[i], prices[i], deadline)));
        }

        require(msg.value >= totalAmount, "Insufficient funds");
        require(_verifySignature(msgHash.toEthSignedMessageHash(), signature), "Invalid signature provided");

        for (uint i = 0; i < pieces.length; i++) {
            _safeMint(_msgSender(), pieces[i]);
        }

        treasury.keep{ value: totalAmount }();
    }

    /**
     * @notice Updates Key token metadata source.
     */
    function setURI(string calldata _uri) external onlyOwner {
        uri = _uri;
    }

    /**
    * @dev Verify provided signature, it must be signed by the contract signer. 
    */
    function _verifySignature(bytes32 msgHash, bytes calldata signature) internal view returns (bool) {
        address recovered = msgHash.recover(signature);
        return recovered == signer;
    }

    function _baseURI() internal view override returns (string memory) {
        return uri;
    }
}