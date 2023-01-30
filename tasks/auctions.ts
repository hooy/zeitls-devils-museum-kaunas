import { task } from "hardhat/config";
import { getState } from "./config";
import { wei } from "../test/utils";
import { BigNumber } from "ethers";

const auctions: [number, BigNumber, boolean][] = [
    [6660010009000062, wei("1.4"), true],
    [6660010003001519, wei("0.4"), true],
    [6660010009000031, wei("0.9"), true],
    [6660010009000232, wei("1.5"), false],
    [6660010003001895, wei("2.5"), false],
    [6660010003001841, wei("1.5"), false],
    [6660010003000689, wei("2.5"), false],
    [6660010003000796, wei("0.5"), false],
    [6660010009000410, wei("0.5"), false],
    [6660010003001932, wei("0.5"), false],
    [6660010003000119, wei("2.5"), false],
    [6660010005000001, wei("2.5"), false],
    [6660010008000012, wei("1.5"), false]
];

task("auctions", "Create Zeitls Devils auction lots")
    .setAction(async function (args, { network, ethers }) {
        const contracts = getState(network.name).contracts();

        const AuctionHouse = await ethers.getContractFactory("ZtlDevilsAuctionHouse");
        const auctionHouse = AuctionHouse.attach(contracts["ZtlDevilsAuctionHouse"].address);

        let tx;

        if (await auctionHouse.paused()) {
            tx = await auctionHouse.unpause();
            console.log("Auction paused, unpause:", tx.hash);
            await tx.wait();
        }

        const ids = [];
        const prices = [];
        const whitelist = [];
      
        for (let [id, price, limited] of auctions) {
            const a = await auctionHouse.auctions(id);

            // does auction not exist otherwise skip
            if (a[0].eq(0)) {
               ids.push(id);
               prices.push(price);
               whitelist.push(limited); 
            } else {
                console.log(`Auction ${id} already exist`);
            }
        }  

        tx = await auctionHouse.createAuctions(ids, prices, whitelist);

        await tx.wait();

        console.log(`List auctions:`, tx.hash);
    });