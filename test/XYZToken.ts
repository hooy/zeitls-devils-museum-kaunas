import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("XYZToken", () => {

    async function deployFixture() {
        const [deployer, owner, buyer ] = await ethers.getSigners();

        const Token = await ethers.getContractFactory("XYZToken");
        const token = await Token.deploy(owner.address);

        return { deployer, token, owner, buyer };
    }

    describe("deployment", function () {
        it("should set contract owner address contract from constructor args", async function () {
            const { token, deployer, owner } = await loadFixture(deployFixture);

            expect(await token.owner()).not.to.equal(deployer.address);
            expect(await token.owner()).to.equal(owner.address);
        });
    });

    // async function deployFixture() {
    //     const [owner, buyer, beneficiar] = await ethers.getSigners();
    //
    //     const ZUToken = await ethers.getContractFactory("XYZToken");
    //     const token = await upgrades.deployProxy(ZUToken);
    //
    //     return { token, owner, buyer, beneficiar };
    // }
    //
    // describe("deployment", function () {
    //     it("should set deployer as contract owner", async function () {
    //         const { token, owner } = await loadFixture(deployFixture);
    //
    //         expect(await token.owner()).to.equal(owner.address);
    //     });
    // });

    // describe("redeem token", function () {
    //     it("should redeem token", async () => {
    //         const { token, buyer } = await loadFixture(deployFixture);
    //
    //         const tx = await token.connect(buyer).redeem(1, { value: ethers.utils.parseEther("0.1") });
    //
    //         expect(tx).to.emit(token, "Transfer")
    //             .withArgs(ethers.constants.AddressZero, buyer.address, 1);
    //
    //         expect(await token.ownerOf(1)).to.equal(buyer.address);
    //         expect(await token.balanceOf(buyer.address)).to.equal(1);
    //         expect(await token.totalSupply()).to.equal(1);
    //     });
    //
    //     it("should redeem token in batch", async () => {
    //         const { token, buyer } = await loadFixture(deployFixture);
    //
    //         const tx = await token.connect(buyer).redeem(4, { value: ethers.utils.parseEther("0.4") });
    //
    //         for (let i = 0; i < 4; i++) {
    //             expect(tx).to.emit(token, "Transfer")
    //                 .withArgs(ethers.constants.AddressZero, buyer.address, i + 1);
    //         }
    //
    //         expect(await token.ownerOf(1)).to.equal(buyer.address);
    //         expect(await token.ownerOf(2)).to.equal(buyer.address);
    //         expect(await token.ownerOf(3)).to.equal(buyer.address);
    //         expect(await token.ownerOf(4)).to.equal(buyer.address);
    //         expect(await token.balanceOf(buyer.address)).to.equal(4);
    //         expect(await token.totalSupply()).to.equal(4);
    //     });
    //
    //     it("should fail on token redeem with wrong price", async () => {
    //         const { token, buyer } = await loadFixture(deployFixture);
    //
    //         await expect(token.connect(buyer).redeem(1, { value: ethers.utils.parseEther("0.01") }))
    //             .to.be.revertedWith("Price not met");
    //     });
    //
    //     it("should fail purchase on exceeded purchase limit", async () => {
    //         const { token, buyer } = await loadFixture(deployFixture);
    //
    //         for (let i = 0; i < 10; i++) {
    //            await token.connect(buyer).redeem(1, { value: ethers.utils.parseEther("0.1") });
    //         }
    //
    //         expect(await token.balanceOf(buyer.address)).to.equal(10);
    //
    //         await expect(token.connect(buyer).redeem(1, { value: ethers.utils.parseEther("0.1") }))
    //             .to.be.revertedWith("Purchase limit exceeded");
    //     });
    // });
    //
    // describe("withdraw", function () {
    //     it("should withdraw ether", async () => {
    //         const { token, buyer, beneficiar } = await loadFixture(deployFixture);
    //         const profit = ethers.utils.parseEther("1");
    //
    //         await token.connect(buyer).redeem(1, { value: profit });
    //
    //         await expect(token.withdraw(beneficiar.address)).to.changeEtherBalances(
    //             [token, beneficiar],
    //             [profit.mul(-1), profit]
    //         );
    //     });
    // })
});
