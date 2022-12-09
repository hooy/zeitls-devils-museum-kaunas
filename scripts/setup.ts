import { ethers, network } from "hardhat";

const configs: Record<string, any> = {
    goerli: {
        token: "0x",
        auction: "0x",
        metadata: [
            { id: 0, ipfs: "https://ipfs.io/ipfs/QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/" },
        ],
    },
}

async function main() {
    const config = configs[network.name];

    const Token = await ethers.getContractFactory("ZtlDevils");
    const token = await Token.attach(config.token);

    // make auction house as token minter
    let tx = await token.setMinter(config.auction);
    console.log(`Transaction ${tx.hash}`);

    // update metadata
    tx = await token.updateMetadata(
        [config.metadata[0].id],
        [config.metadata[0].ipfs]
    );
    console.log(`Transaction ${tx.hash}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
