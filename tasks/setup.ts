import { task } from "hardhat/config";
import { getConfig, getState } from "./config";

task("setup", "Setup Zeitls Devils contracts")
    .setAction(async function (args, { network, ethers }) {
        const config = await getConfig(network.name);
        const contracts = getState(network.name).contracts();

        const Token = await ethers.getContractFactory("ZtlDevils");
        const token = Token.attach(contracts["ZtlDevils"].address);

        // make auction house as token minter
        let tx = await token.setMinter(contracts["ZtlDevilsAuctionHouse"].address);
        await tx.wait();
        console.log(`Link token contract with auction house: ${tx.hash}`);

        // update metadata
        tx = await token.updateMetadata(
            [config.metadata[0].id],
            [config.metadata[0].uri]
        );
        await tx.wait();
        console.log(`Update token metadata: ${tx.hash}`);
    });