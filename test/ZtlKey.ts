import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("ZtlKey", () => {

    async function deployFixture() {
        const [deployer, ...others] = await ethers.getSigners();

        const Whitelist = await ethers.getContractFactory("ZtlKey");
        const whitelist = await Whitelist.deploy("https://abc.xyz");

        return { deployer, others, whitelist };
    }

    describe("management", function () {
        it("add", async function () {
            const { others, whitelist } = await loadFixture(deployFixture);

            await whitelist.mint(others[0].address);

            expect(await whitelist.balanceOf(others[0].address)).to.be.equal(1);
            expect(await whitelist.balanceOf(others[1].address)).to.be.equal(0);
        });

        it("add batch", async function () {
            const { others, whitelist } = await loadFixture(deployFixture);

            await whitelist.mintBatch([others[1].address, others[2].address]);

            expect(await whitelist.balanceOf(others[0].address)).to.be.equal(0);
            expect(await whitelist.balanceOf(others[1].address)).to.be.equal(1);
            expect(await whitelist.balanceOf(others[2].address)).to.be.equal(1);
        });
    });
});
