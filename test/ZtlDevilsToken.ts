import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { artifacts, ethers } from "hardhat";
import { shouldBehaveLikeERC721, shouldBehaveLikeERC721Enumerable } from "./openzeppelin/ERC721.behavior";

describe("ZtlDevils", () => {

    async function deployFixture() {
        const [deployer, owner, buyer] = await ethers.getSigners();

        const Token = await ethers.getContractFactory("ZtlDevils");
        const token = await Token.deploy(owner.address, ethers.constants.AddressZero);

        await token.connect(owner).setMinter(deployer.address);

        return { deployer, token, owner, buyer };
    }

    describe("deployment", function () {
        it("should set contract owner address contract from constructor args", async function () {
            const { token, deployer, owner } = await loadFixture(deployFixture);

            const contractOwner = await token.owner();
            expect(contractOwner).not.to.equal(deployer.address);
            expect(contractOwner).to.equal(owner.address);
        });
    });

    describe("ERC721", async function () {
        const signers = await ethers.getSigners();
        const accounts = signers.map(s => s.address);

        beforeEach(async function () {
            const Registry = await ethers.getContractFactory("ProxyRegistryMock");
            const registry = await Registry.deploy(accounts[0]);

            const Token = artifacts.require('ZtlDevils');
            this.token = await Token.new(accounts[0], registry.address);
            await this.token.setMinter(accounts[0]);
        });

        shouldBehaveLikeERC721("ERC721", ...accounts);
        shouldBehaveLikeERC721Enumerable("ERC721", ...accounts);
    });

    describe("management", function () {
        it("should change minter", async function () {
            const { token, owner, deployer } = await loadFixture(deployFixture);

            expect(await token.minter()).to.be.equal(deployer.address);

            const tx = await token.connect(owner).setMinter(ethers.constants.AddressZero);

            expect(tx).to.emit(this.token, "MinterUpdated")
                .withArgs(ethers.constants.AddressZero);
        });

        it("should change owner", async function () {
            const { token, owner, deployer } = await loadFixture(deployFixture);

            const tx = await token.connect(owner).transferOwnership(deployer.address);

            expect(tx).to.emit(this.token, "OwnershipTransferred")
                .withArgs(owner.address, deployer.address);
        });
    });

    describe("token", function () {
        it("should mint token", async function () {
            const { token, owner, deployer } = await loadFixture(deployFixture);

            expect(await token.exists(1)).to.be.equal(false);

            const tx = await token.connect(deployer).mint(owner.address, 1);

            expect(tx).to.emit(this.token, "TokenCreated")
                .withArgs(1, owner.address);

            expect(tx).to.emit(this.token, "Transfer")
                .withArgs(ethers.constants.AddressZero, owner.address, 1);

            expect(await token.exists(1)).to.be.equal(true);
        });

        it("should burn token", async function () {
            const { token, owner, deployer } = await loadFixture(deployFixture);

            await token.connect(deployer).mint(owner.address, 1);

            const tx = await token.connect(deployer).burn(1);

            expect(tx).to.emit(this.token, "TokenBurned")
                .withArgs(1);

            expect(tx).to.emit(this.token, "Transfer")
                .withArgs(owner.address, ethers.constants.AddressZero, 1);

            expect(await token.exists(1)).to.be.equal(false);
        });
    });

    describe("metadata", function () {
        it("should update metadata and return correct link according to token id", async function () {
            const { token, owner } = await loadFixture(deployFixture);

            await expect(token.tokenURI(1)).to.be.revertedWith("ERC721: invalid token ID");

            await token.connect(owner).updateMetadata(
                [0, 10],
                ["a", "b"],
            );

            await token.mint(owner.address, 5);
            await token.mint(owner.address, 15);

            expect(await token.tokenURI(5)).to.equal("a");
            expect(await token.tokenURI(15)).to.equal("b");
        });

        it("should expand metadata links", async () => {
            const { token, owner } = await loadFixture(deployFixture);

            await token.mint(owner.address, 5);
            await token.mint(owner.address, 15);
            await token.mint(owner.address, 25);
            await token.mint(owner.address, 35);

            await token.connect(owner).updateMetadata(
                [0, 10],
                ["a", "b"],
            );

            expect(await token.tokenURI(15)).to.equal("b");
            expect(await token.tokenURI(25)).to.equal("b");
            expect(await token.tokenURI(35)).to.equal("b");

            await token.connect(owner).updateMetadata(
                [0, 10, 20, 30],
                ["a", "b", "c", "d"],
            );

            expect(await token.tokenURI(15)).to.equal("b");
            expect(await token.tokenURI(25)).to.equal("c");
            expect(await token.tokenURI(35)).to.equal("d");
        });
    });

    describe("marketplace", function () {

        async function marketplaceFixture() {
            const [deployer, operator, stranger] = await ethers.getSigners();

            const Registry = await ethers.getContractFactory("ProxyRegistryMock");
            const registry = await Registry.deploy(operator.address);

            const Token = await ethers.getContractFactory("ZtlDevils");
            const token = await Token.deploy(deployer.address, registry.address);

            return { deployer, operator, stranger, token };
        }

        it("should bypass approved for all for a marketplace", async function () {
            const { deployer, operator, token } = await loadFixture(marketplaceFixture);
            expect(await token.isApprovedForAll(deployer.address, operator.address)).to.be.equal(true);
        });

        it("should forbid approved for all for a stranger", async () => {
            const { deployer, stranger, token } = await loadFixture(marketplaceFixture);
            expect(await token.isApprovedForAll(deployer.address, stranger.address)).to.be.equal(false);
        });
    });
});
