import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";


describe("ZToken", () => {

    async function deployFixture() {
        const [owner, buyer, beneficiar] = await ethers.getSigners();

        const ZToken = await ethers.getContractFactory("ZToken");
        const token = await ZToken.deploy();

        return { token, owner, buyer, beneficiar };
    }

    describe("deployment", function () {
        it("should set deployer as contract owner", async function () {
            const { token, owner } = await loadFixture(deployFixture);

            expect(await token.owner()).to.equal(owner.address);
        });
    });

    describe("redeem token", function () {
        it("should redeem token with base price", async () => {
            const { token, buyer } = await loadFixture(deployFixture);

            const tx = await token.connect(buyer).redeem({ value: ethers.utils.parseEther("0.1") });

            expect(tx).to.emit(token, "Transfer")
                .withArgs(ethers.constants.AddressZero, buyer.address, 1);

            expect(await token.ownerOf(1)).to.equal(buyer.address);
            expect(await token.balanceOf(buyer.address)).to.equal(1);
            expect(await token.totalSupply()).to.equal(1);
        });

        it("should fail on token redeem with wrong price", async () => {
            const { token, buyer } = await loadFixture(deployFixture);

            await expect(token.connect(buyer).redeem({ value: ethers.utils.parseEther("0.01") }))
                .to.be.revertedWith("Price not met");
        });
    });

    describe("withdraw", function () {
        it("should withdraw ether", async () => {
            const { token, buyer, beneficiar } = await loadFixture(deployFixture);
            const profit = ethers.utils.parseEther("1");

            await token.connect(buyer).redeem({ value: profit });

            await expect(token.withdraw(beneficiar.address)).to.changeEtherBalances(
                [token, beneficiar],
                [profit.mul(-1), profit]
            );
        });
    })
});
