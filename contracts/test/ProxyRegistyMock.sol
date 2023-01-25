// SPDX-License-Identifier: MIT

pragma solidity ^0.8.16;

import { IProxyRegistry} from "../opensea/IProxyRegistry.sol";

contract ProxyRegistryMock is IProxyRegistry {

    address operator;

    constructor(address _operator) {
        operator = _operator;
    }

    function proxies(address) external view returns (address) {
        return operator;
    }
}
