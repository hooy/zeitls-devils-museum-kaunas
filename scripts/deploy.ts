import { ethers, network, upgrades } from "hardhat";

const configs: Record<string, any> = {
    goerli: {
        openseaRegistry: ethers.constants.AddressZero,
        owner: "0x9f594da9f93f727d671EC4AA6B1f5A5B94a36A98",
        maintainer: "0x9f594da9f93f727d671EC4AA6B1f5A5B94a36A98",
        weth: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
        whitelistUri: "ipfs://",
        timeBuffer: 30 * 60, // 30 min
        duration: 7 * 24 * 60 * 60, // 1 week
        minBidDiff: 3, // 3%
    }
}

async function main() {
    const config = configs[network.name];

    const Token = await ethers.getContractFactory("ZtlDevils");
    const token = await Token.deploy(config.owner, config.openseaRegistry);

    const Whitelist = await ethers.getContractFactory("ZtlDevilsWhitelist");
    const whitelist = await Whitelist.deploy(config.whitelistUri);

    const Treasury = await ethers.getContractFactory("ZtlDevilsTreasury");
    const treasury = await upgrades.deployProxy(Treasury, [config.maintainer]);

    const AuctionHouse = await ethers.getContractFactory("ZtlDevilsAuctionHouse");
    const auctionHouse = await upgrades.deployProxy(AuctionHouse, [
        token.address, treasury.address, whitelist.address, config.weth,
        config.timeBuffer, config.duration, config.minBidDiff
    ]);

    console.log(`
        Token address: ${token.address}
        Whitelist address: ${whitelist.address}
        Treasury address: ${treasury.address}
        AuctionHouse address: ${auctionHouse.address}

        Do not forget to run setup from token owner account!!!
    `);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
