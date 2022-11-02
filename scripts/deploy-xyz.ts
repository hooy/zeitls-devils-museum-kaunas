import { ethers, upgrades } from "hardhat";

const config = {
    owner: "",
    timeBuffer: 30 * 60, // 30 min
    duration: 7 * 24 * 60 * 60, // 1 week
    minBidDiff: 3, // 3%

}

async function main() {
    const Token = await ethers.getContractFactory("XYZToken");
    const token = await Token.deploy(config.owner);

    const Whitelist = await ethers.getContractFactory("XYZWhitelistToken");
    const whitelist = await Whitelist.deploy();

    const Treasury = await ethers.getContractFactory("XYZTreasury");
    const treasury = await upgrades.deployProxy(Treasury);

    const AuctionHouse = await ethers.getContractFactory("XYZAuction");
    const auctionHouse = await upgrades.deployProxy(AuctionHouse, [
        token.address, treasury.address, whitelist.address,
        config.timeBuffer, config.duration, config.minBidDiff
    ]);

    console.log(`
        Token address: ${token.address}
        Whitelist address: ${whitelist.address}
        Treasury address: ${treasury.address}
        AuctionHouse address: ${auctionHouse.address}
    `);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
