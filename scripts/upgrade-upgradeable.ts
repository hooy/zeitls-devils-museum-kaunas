import { ethers, upgrades } from "hardhat";

async function main() {
    const ZUToken = await ethers.getContractFactory("ZUToken");
    const contract = await upgrades.upgradeProxy("0x9A2669418bedfB0e6f77E7e3e0eC53831Ae87Bc2", ZUToken);
    await contract.deployed();

    console.log(`Contract address ${contract.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
