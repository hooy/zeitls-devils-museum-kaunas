import { ethers } from "hardhat";

async function main() {
  const ZToken = await ethers.getContractFactory("ZToken");
  const contract = await ZToken.deploy();

  await contract.deployed();

  console.log(`Contract address ${contract.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
