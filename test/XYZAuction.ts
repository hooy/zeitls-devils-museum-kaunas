import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { toStruct, wei } from "./utils";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("XYZAuction", () => {

    async function deployFixture() {
        const [deployer, owner, buyer, ...others] = await ethers.getSigners();

        const DURATION = 24 * 60 * 60; // 24 hours
        const TIME_BUFFER = 5 * 60; // 5 min
        const MIN_BID_DIFF = 2; // 2% between bids

        const Token = await ethers.getContractFactory("XYZToken");
        const token = await Token.deploy(owner.address);

        const Treasury = await ethers.getContractFactory("XYZTreasury");
        const treasury = await Treasury.deploy();

        const Whitelist = await ethers.getContractFactory("XYZWhitelistToken");
        const whitelist = await Whitelist.deploy();

        const AuctionHouse = await ethers.getContractFactory("XYZAuctionHouse");
        const auctionHouse = await upgrades.deployProxy(AuctionHouse, [
            token.address, treasury.address, whitelist.address, TIME_BUFFER, DURATION, MIN_BID_DIFF
        ]);

        await token.connect(owner).setMinter(auctionHouse.address);
        await auctionHouse.unpause();

        return { deployer, token, auctionHouse, treasury, whitelist, owner, buyer, others };
    }

    // todo: ownable through Gnosis multisig

    describe("deployment", function () {
        it("should set contract owner address contract from constructor args", async function () {
            const { token, deployer, owner } = await loadFixture(deployFixture);

            expect(await token.owner()).not.to.equal(deployer.address);
            expect(await token.owner()).to.equal(owner.address);
        });
    });

    describe("listing", function () {
        describe("single lot listing", function () {
            it("should list lot auction", async function () {
                const { auctionHouse } = await loadFixture(deployFixture);

                const tokenId = 1;
                const price = wei("0.1");

                const tx = await auctionHouse.createAuction(tokenId, price, false);

                expect(tx).to.emit(auctionHouse, "AuctionCreated")
                    .withArgs(tokenId, price);

                expect(toStruct(await auctionHouse.auctions(tokenId))).to.deep.equal({
                    reservePrice: price,
                    amount: 0,
                    startTime: 0,
                    endTime: 0,
                    bidder: ethers.constants.AddressZero,
                    settled: false,
                    limited: false,
                })
            });
        });

        describe("forbid listing", function () {
            const tokenId = 1;

            let token: Contract;
            let auctionHouse: Contract;
            let owner: SignerWithAddress;
            let others: SignerWithAddress[];

            beforeEach(async function () {
                const fixture = await loadFixture(deployFixture);
                token = fixture.token;
                auctionHouse = fixture.auctionHouse;
                owner = fixture.owner;
                others = fixture.others;
            });

            it("should forbid not permitted listing", async function () {
                await expect(auctionHouse.connect(others[0]).createAuction(tokenId, wei("1"), false))
                    .to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("should forbid with zero reserve price", async function () {
                await expect(auctionHouse.createAuction(tokenId, wei("0"), false))
                    .to.be.revertedWith("Reserve price must be defined");
            });

            it("should forbid secondary listing", async function () {
                await auctionHouse.createAuction(tokenId, wei("1"), false);

                await expect(auctionHouse.createAuction(tokenId, wei("2"), false))
                    .to.be.revertedWith("Auction already exist");
            });

            it("should forbid listing on existing token", async function () {
                await token.connect(owner).setMinter(owner.address);
                await token.connect(owner).mint(owner.address, tokenId);

                await expect(auctionHouse.createAuction(tokenId, wei("1"), false))
                    .to.be.revertedWith("Token already exist");
            });
        });
    });

    describe("bidding", function () {
        const tokenId = 1;
        const price = wei("1");

        beforeEach(async function () {
            const { auctionHouse, buyer, others } = await loadFixture(deployFixture);
            await auctionHouse.createAuction(tokenId, price, false);
            this.auctionHouse = auctionHouse;
            this.buyer = buyer;
            this.secondBuyer = others[0];
        });

        it("should activate auction timer with the first bid", async function () {
            const tx = await this.auctionHouse.connect(this.buyer).bid(tokenId, { value: price });

            const blockTime = await time.latest();
            const duration = await this.auctionHouse.duration();

            expect(tx).to.emit(this.auctionHouse, "AuctionStarted")
                .withArgs(tokenId, blockTime, blockTime + duration);

            expect(tx).to.emit(this.auctionHouse, "AuctionBid")
                .withArgs(tokenId, this.buyer.address, price, false);

            await expect(tx).to.changeEtherBalances(
                [this.auctionHouse, this.buyer],
                [price, price.mul(-1)]
            );

            expect(toStruct(await this.auctionHouse.auctions(tokenId))).to.deep.equal({
                reservePrice: price,
                amount: price,
                startTime: blockTime,
                endTime: blockTime + duration,
                bidder: this.buyer.address,
                settled: false,
                limited: false,
            });
        });

        it("should refund the previous bidder when the following user creates a bid", async function () {
            await this.auctionHouse.connect(this.buyer).bid(tokenId, { value: price });

            const secondBid = price.mul(2);
            const tx = await this.auctionHouse.connect(this.secondBuyer)
                .bid(tokenId, { value: secondBid });

            await expect(tx).to.changeEtherBalances(
                [this.auctionHouse, this.buyer, this.secondBuyer],
                [secondBid.sub(price), price, secondBid.mul(-1)]
            );

            const { amount, bidder } = await this.auctionHouse.auctions(tokenId);

            expect(bidder).to.equal(this.secondBuyer.address);
            expect(amount).to.equal(secondBid);
        });
    });

    describe("settle", function () {
        const tokenId = 1;
        const price = wei("1");

        beforeEach(async function () {
            const { auctionHouse, treasury, token, buyer } = await loadFixture(deployFixture);
            await auctionHouse.createAuction(tokenId, price, false);
            this.auctionHouse = auctionHouse;
            this.treasury = treasury;
            this.token = token;
            this.buyer = buyer;
        });

        it("should allow auction settle and token claim after release time", async function () {
            await this.auctionHouse.connect(this.buyer).bid(tokenId, { value: price });

            const { endTime } = await this.auctionHouse.auctions(tokenId);

            await time.increaseTo(endTime);

            const tx = await this.auctionHouse.connect(this.buyer).settleAuction(tokenId);

            expect(tx).to.emit(this.auctionHouse, "AuctionSettled")
                .withArgs(tokenId, this.buyer.address, price);

            expect(tx).to.emit(this.token, "Transfer")
                .withArgs(ethers.constants.AddressZero, this.buyer.address, tokenId);

            await expect(tx).to.changeEtherBalances(
                [this.auctionHouse, this.treasury],
                [price.mul(-1), price]
            );

            expect(await this.token.totalSupply()).to.be.equal(1);
            expect(await this.token.balanceOf(this.buyer.address)).to.be.equal(1);
        });
    });

    describe("whitelist", function () {
        const tokenId = 1;
        const price = wei("1");

        beforeEach(async function () {
            const { auctionHouse, token, whitelist, buyer } = await loadFixture(deployFixture);
            await auctionHouse.createAuction(tokenId, price, true);
            this.auctionHouse = auctionHouse;
            this.token = token;
            this.whitelist = whitelist;
            this.buyer = buyer;
        });

        it("should allow bid when sender is whitelisted", async function () {
            await this.whitelist.mint(this.buyer.address);

            const tx = await this.auctionHouse.connect(this.buyer).bid(tokenId, { value: price });

            expect(tx).to.emit(this.auctionHouse, "AuctionBid")
                .withArgs(tokenId, this.buyer.address, price, false);
        });

        it("should forbid bid on limited auction without whitelist", async function () {
            await expect(this.auctionHouse.connect(this.buyer).bid(tokenId, { value: price }))
                .to.be.revertedWith("Sender is not whitelisted");
        });
    });
});
