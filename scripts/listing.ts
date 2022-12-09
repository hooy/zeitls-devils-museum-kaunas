import { ethers, network } from "hardhat";
import { wei } from "../test/utils";

const configs: Record<string, any> = {
    goerli: {
        auction: "0x",
    },
}

async function main() {
    const config = configs[network.name];

    const AuctionHouse = await ethers.getContractFactory("ZtlDevilsAuctionHouse");
    const auctionHouse = await AuctionHouse.attach(config.auction);

    // list new auctions
    let tx = await auctionHouse.createAuctions(
        [666, 6660001],
        [wei("1"), wei("0.1")],
        [true, false]
    );
    console.log(`Transaction ${tx.hash}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
