import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { artifacts, ethers, upgrades } from "hardhat";
import { shouldBehaveLikeERC721, shouldBehaveLikeERC721Enumerable } from "./openzeppelin/ERC721.behavior";

describe("ZtlDevilsPieces", () => {

    async function deployFixture() {
        const [deployer, owner, signer, buyer, ...others] = await ethers.getSigners();

        const Treasury = await ethers.getContractFactory("ZtlDevilsTreasury");
        const treasury = await upgrades.deployProxy(Treasury, [ethers.constants.AddressZero]);
        
        const Pieces = await ethers.getContractFactory("ZtlDevilsPieces");
        const pieces = await Pieces.deploy(owner.address, signer.address, treasury.address, ethers.constants.AddressZero, "");

        return { deployer, pieces, treasury, owner, signer, buyer, others };
    }

    describe("deployment", function () {
        it("should set contract owner address contract from constructor args", async function () {
            const { pieces, deployer, owner } = await loadFixture(deployFixture);

            const contractOwner = await pieces.owner();
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

            const Pieces = artifacts.require('ZtlDevilsPiecesMock');
            this.pieces = await Pieces.new(accounts[0], accounts[2], ethers.constants.AddressZero, registry.address);
        });

        shouldBehaveLikeERC721("ERC721", ...accounts);
        shouldBehaveLikeERC721Enumerable("ERC721", ...accounts);
    });

    describe("management", function () {
        it("should change owner", async function () {
            const { pieces, owner, deployer } = await loadFixture(deployFixture);

            const tx = pieces.connect(owner).transferOwnership(deployer.address);

            await expect(tx).to.emit(pieces, "OwnershipTransferred")
                .withArgs(owner.address, deployer.address);
        });
    });

    describe("purchase", function () {
        function sign(signer: SignerWithAddress, tokenIds: number[], prices: BigNumber[], deadline: number): Promise<string> {
            let msgHash = ethers.constants.HashZero; 

            for (let i = 0; i < tokenIds.length; i++) {
                const pack = ethers.utils.solidityPack(
                    ["uint256", "uint256", "uint256"],
                    [tokenIds[i], prices[i], deadline]
                );

                msgHash = ethers.utils.solidityKeccak256(["bytes"], [ethers.utils.concat([msgHash, pack])]);
            }

            return signer.signMessage(ethers.utils.arrayify(msgHash));
        }

        it("should purchase single piece", async function () {
            const { pieces, signer, buyer } = await loadFixture(deployFixture);

            const tokenIds = [1];
            const prices = [ethers.utils.parseEther("1")];
            const deadline = (await time.latest()) + 3600;

            const signature = await sign(signer, tokenIds, prices, deadline); 

            const tx = pieces.connect(buyer).purchase(tokenIds, prices, deadline, signature, { value: ethers.utils.parseEther("1") });

            await expect(tx).to.emit(pieces, "Transfer")
                .withArgs(ethers.constants.AddressZero, buyer.address, tokenIds[0]);
        });

        it("should purchase many pieces", async function() {
            const { pieces, signer, buyer, treasury } = await loadFixture(deployFixture);

            const tokenIds = [1, 100, 1000, 11000];
            const prices = ["0.1", "0.5", "0.3", "0.1"].map(v => ethers.utils.parseEther(v));
            const deadline = (await time.latest()) + 3600;

            const signature = await sign(signer, tokenIds, prices, deadline); 

            const tx = pieces.connect(buyer).purchase(tokenIds, prices, deadline, signature, { value: ethers.utils.parseEther("1") });

            for (const tokenId of tokenIds) {
                await expect(tx).to.emit(pieces, "Transfer")
                    .withArgs(ethers.constants.AddressZero, buyer.address, tokenId);
            }

            await expect(tx).to.changeEtherBalances(
                [buyer, treasury],
                [ethers.utils.parseEther("1").mul(-1), ethers.utils.parseEther("1")],
            );
        });

        it("should forbid purchase after deadline", async function() {
            const { pieces, signer, buyer } = await loadFixture(deployFixture);

            const tokenIds = [1];
            const prices = [ethers.utils.parseEther("1")];
            const deadline = (await time.latest()) + 3600;

            const signature = await sign(signer, tokenIds, prices, deadline); 

            await time.increase(3660);

            const tx = pieces.connect(buyer).purchase(tokenIds, prices, deadline, signature, { value: ethers.utils.parseEther("1") });

            await expect(tx).to.be.rejectedWith("Price offer expired");
        });
    });

    describe("metadata", function () {
    });

    describe("marketplace", function () {

        async function marketplaceFixture() {
            const [deployer, signer, operator, stranger] = await ethers.getSigners();

            const Registry = await ethers.getContractFactory("ProxyRegistryMock");
            const registry = await Registry.deploy(operator.address);

            const Pieces = await ethers.getContractFactory("ZtlDevilsPieces");
            const pieces = await Pieces.deploy(deployer.address, signer.address, ethers.constants.AddressZero, registry.address, "");

            return { deployer, operator, stranger, pieces };
        }

        it("should bypass approved for all for a marketplace", async function () {
            const { deployer, operator, pieces } = await loadFixture(marketplaceFixture);
            expect(await pieces.isApprovedForAll(deployer.address, operator.address)).to.be.equal(true);
        });

        it("should forbid approved for all for a stranger", async () => {
            const { deployer, stranger, pieces } = await loadFixture(marketplaceFixture);
            expect(await pieces.isApprovedForAll(deployer.address, stranger.address)).to.be.equal(false);
        });
    });
});