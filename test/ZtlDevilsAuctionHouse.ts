import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { neg, toStruct, wei } from "./utils";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("ZtlDevilsAuctionHouse", () => {

    const DURATION = 24 * 60 * 60; // 24 hours
    const TIME_BUFFER = 5 * 60; // 5 min
    const MIN_BID_DIFF = 2; // 2% between bids
    const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

    function sign(signer: SignerWithAddress) {
        // working example on how sign address using web3js
        // const web3js = (account: SignerWithAddress) => {
        //     let m = (config.networks.hardhat.accounts as HardhatNetworkHDAccountsConfig).mnemonic;
        //     const wallet = ethers.Wallet.fromMnemonic(m);
        //     const acc = new Web3().eth.accounts.privateKeyToAccount(wallet.privateKey);
        //     const data = Web3.utils.padRight(account.address, 64);
        //     return acc.sign(data).signature;
        // }

        return (account: SignerWithAddress) => {
            const data = account.address.padEnd(66, "0");
            return signer.signMessage(ethers.utils.arrayify(data));
        }
    }

    async function deployFixture() {
        const [deployer, signer, owner, buyer, ...others] = await ethers.getSigners();

        const Token = await ethers.getContractFactory("ZtlDevils");
        const token = await Token.deploy(owner.address, ethers.constants.AddressZero);

        const Treasury = await ethers.getContractFactory("ZtlDevilsTreasury");
        const treasury = await upgrades.deployProxy(Treasury, [ethers.constants.AddressZero]);

        const ZtlKey = await ethers.getContractFactory("ZtlKey");
        const ztlkey = await ZtlKey.deploy("https://abc.xyz");

        const AuctionHouse = await ethers.getContractFactory("ZtlDevilsAuctionHouse");
        const auctionHouse = await upgrades.deployProxy(AuctionHouse, [
            token.address, treasury.address, ztlkey.address, signer.address,
            WETH_ADDRESS, TIME_BUFFER, DURATION, MIN_BID_DIFF
        ]);

        await token.connect(owner).setMinter(auctionHouse.address);
        await auctionHouse.unpause();

        return { deployer, token, auctionHouse, treasury, ztlkey, owner, buyer, signer, sign: sign(signer), others };
    }

    describe("deployment", function () {
        it("should set contract owner address contract from constructor args", async function () {
            const { token, deployer, owner } = await loadFixture(deployFixture);

            const contractOwner = await token.owner();
            expect(contractOwner).not.to.equal(deployer.address);
            expect(contractOwner).to.equal(owner.address);
        });

        it("should set time buffer", async function () {
            const { auctionHouse  } = await loadFixture(deployFixture);

            expect(await auctionHouse.timeBuffer()).to.be.equal(TIME_BUFFER);

            const newTimeBuffer = TIME_BUFFER + 60;
            const tx = await auctionHouse.setTimeBuffer(newTimeBuffer);

            await expect(tx).to.emit(auctionHouse, "AuctionTimeBufferUpdated")
                .withArgs(newTimeBuffer);

            expect(await auctionHouse.timeBuffer()).to.be.equal(newTimeBuffer);
        });

        it("should set min increment percentage", async function () {
            const { auctionHouse  } = await loadFixture(deployFixture);

            expect(await auctionHouse.minBidIncrementPercentage()).to.be.equal(MIN_BID_DIFF);

            const newMinDiff = MIN_BID_DIFF + 2;
            const tx = await auctionHouse.setMinBidIncrementPercentage(newMinDiff);

            await expect(tx).to.emit(auctionHouse, "AuctionMinBidIncrementPercentageUpdated")
                .withArgs(newMinDiff);

            expect(await auctionHouse.minBidIncrementPercentage()).to.be.equal(newMinDiff);
        });
    });

    describe("listing", function () {
        it("list single auction", async function () {
            const { auctionHouse } = await loadFixture(deployFixture);

            const tokenId = 1;
            const price = wei("0.1");

            const tx = await auctionHouse.createAuction(tokenId, price, false);

            await expect(tx).to.emit(auctionHouse, "AuctionCreated")
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

        it("list many auctions", async function () {
            const { auctionHouse } = await loadFixture(deployFixture);

            const tokenIds = [666, 6666, 66666];
            const prices = [wei("66"), wei("6"), wei("0.6")];
            const limited = [true, false, false];

            const tx = await auctionHouse.createAuctions(tokenIds, prices, limited);

            for (let i = 0; i < 3; i++) {
                await expect(tx).to.emit(auctionHouse, "AuctionCreated")
                    .withArgs(tokenIds[i], prices[i]);

                expect(toStruct(await auctionHouse.auctions(tokenIds[i]))).to.deep.equal({
                    reservePrice: prices[i],
                    amount: 0,
                    startTime: 0,
                    endTime: 0,
                    bidder: ethers.constants.AddressZero,
                    settled: false,
                    limited: limited[i],
                });
            }
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
            const { auctionHouse, buyer, others, sign, deployer } = await loadFixture(deployFixture);
            await auctionHouse.createAuction(tokenId, price, false);
            this.auctionHouse = auctionHouse;
            this.buyer = buyer;
            this.sign = sign;
            this.deployer = deployer;
            this.secondBuyer = others[0];
            this.others = others;
        });

        it("should activate auction timer with the first bid", async function () {
            const tx = await this.auctionHouse.connect(this.buyer)
                .bid(tokenId, this.sign(this.buyer), { value: price });

            const blockTime = await time.latest();
            const duration = await this.auctionHouse.duration();

            await expect(tx).to.emit(this.auctionHouse, "AuctionStarted")
                .withArgs(tokenId, blockTime, blockTime + duration);

            await expect(tx).to.emit(this.auctionHouse, "AuctionBid")
                .withArgs(tokenId, this.buyer.address, price, false);

            await expect(tx).to.changeEtherBalances(
                [this.auctionHouse, this.buyer],
                [price, neg(price)]
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

        it("should calculate next bid amount", async function () {
            expect(await this.auctionHouse.nextBidAmount(tokenId))
                .to.be.equal(0);

            const nextPrice = (p: BigNumber) => p.add(p.mul(MIN_BID_DIFF).div(100));
            let bidValue = price;

            // do five sequential bids with 2% raise
            for (let i = 0; i < 5; i++) {
                await this.auctionHouse.connect(this.others[i])
                    .bid(tokenId, this.sign(this.others[i]), { value: bidValue });

                expect(await this.auctionHouse.nextBidAmount(tokenId))
                    .to.be.equal(nextPrice(bidValue));

                bidValue = nextPrice(bidValue)
            }
        });

        it("should refund the previous bidder when the following user creates a bid", async function () {
            await this.auctionHouse.connect(this.buyer)
                .bid(tokenId, this.sign(this.buyer), { value: price });

            const secondBid = price.mul(2);
            const tx = await this.auctionHouse.connect(this.secondBuyer)
                .bid(tokenId, this.sign(this.secondBuyer), { value: secondBid });

            await expect(tx).to.changeEtherBalances(
                [this.auctionHouse, this.buyer, this.secondBuyer],
                [secondBid.sub(price), price, neg(secondBid)]
            );

            const { amount, bidder } = await this.auctionHouse.auctions(tokenId);

            expect(bidder).to.equal(this.secondBuyer.address);
            expect(amount).to.equal(secondBid);
        });

        it("should extend auction when bid made in buffer time", async function () {
            await this.auctionHouse.connect(this.buyer)
                .bid(tokenId, this.sign(this.buyer), { value: price });

            const blockTime = await time.latest();
            const duration = await this.auctionHouse.duration();

            let nextBlockTime = blockTime + duration - TIME_BUFFER / 2;
            await time.setNextBlockTimestamp(nextBlockTime);

            const tx = this.auctionHouse.connect(this.secondBuyer)
                .bid(tokenId, this.sign(this.secondBuyer), { value: price.mul(2) });

            await expect(tx).to.emit(this.auctionHouse, "AuctionBid")
                .withArgs(tokenId, this.secondBuyer.address, price.mul(2), true);

            await expect(tx).to.emit(this.auctionHouse, "AuctionExtended")
                .withArgs(tokenId, nextBlockTime + TIME_BUFFER);
        });
    });

    describe("settle", function () {
        const tokenId = 1;
        const price = wei("1");

        beforeEach(async function () {
            const { auctionHouse, treasury, token, buyer, sign } = await loadFixture(deployFixture);
            await auctionHouse.createAuction(tokenId, price, false);
            this.auctionHouse = auctionHouse;
            this.treasury = treasury;
            this.token = token;
            this.buyer = buyer;
            this.sign = sign;
        });

        it("should allow auction settle and token claim after release time", async function () {
            await this.auctionHouse.connect(this.buyer)
                .bid(tokenId, this.sign(this.buyer), { value: price });

            const { endTime } = await this.auctionHouse.auctions(tokenId);

            await time.increaseTo(endTime);

            const tx = await this.auctionHouse.connect(this.buyer).settleAuction(tokenId);

            await expect(tx).to.emit(this.auctionHouse, "AuctionSettled")
                .withArgs(tokenId, this.buyer.address, price);

            await expect(tx).to.emit(this.token, "TokenCreated")
                .withArgs(1, this.buyer.address);

            await expect(tx).to.emit(this.token, "Transfer")
                .withArgs(ethers.constants.AddressZero, this.buyer.address, tokenId);

            await expect(tx).to.changeEtherBalances(
                [this.auctionHouse, this.treasury],
                [neg(price), price]
            );

            expect(await this.token.totalSupply()).to.be.equal(1);
            expect(await this.token.balanceOf(this.buyer.address)).to.be.equal(1);

            const { settled } = await this.auctionHouse.auctions(tokenId);
            expect(settled).to.be.equal(true);
        });
    });

    describe("direct purchase", function () {
        const tokenId = 1;
        const price = wei("1");

        function generateSign(signer: SignerWithAddress, tokenId: number, price: BigNumber, expireTime: number) {
            const hash = ethers.utils.solidityKeccak256(
                ["uint256", "uint256", "uint40"],
                [tokenId, price, expireTime]
            );
            return signer.signMessage(ethers.utils.arrayify(hash));
        }

        beforeEach(async function () {
            const { auctionHouse, buyer, signer, token, treasury } = await loadFixture(deployFixture);
            this.auctionHouse = auctionHouse;
            this.buyer = buyer;
            this.token = token;
            this.treasury = treasury;
            this.signer = signer;
        });

        it("should permit purchase", async function () {
            const expireTime = await time.latest() + 3600;
            await time.setNextBlockTimestamp(expireTime - 1800);

            const sign = generateSign(this.signer, tokenId, price, expireTime);

            const tx = await this.auctionHouse.connect(this.buyer)
                .purchase(tokenId, price, expireTime, sign, { value: price });

            await expect(tx).to.emit(this.auctionHouse, "AuctionSettled")
                .withArgs(tokenId, this.buyer.address, price);

            await expect(tx).to.emit(this.token, "Transfer")
                .withArgs(ethers.constants.AddressZero, this.buyer.address, tokenId);

            await expect(tx).to.changeEtherBalances(
                [this.buyer, this.treasury],
                [neg(price), price]
            );

            expect(await this.token.totalSupply()).to.be.equal(1);
            expect(await this.token.balanceOf(this.buyer.address)).to.be.equal(1);
        });

        it("should forbid expired signature", async function () {
            const expireTime = await time.latest();
            const sign = generateSign(this.signer, tokenId, price, expireTime);

            await expect(this.auctionHouse.connect(this.buyer)
                .purchase(tokenId, price, expireTime, sign, { value: price }))
                .to.be.revertedWith("Signature with a fixed price has been expired");
        });

        it("should forbid underpaid transaction", async function () {
            const expireTime = await time.latest() + 3600;
            const sign = generateSign(this.signer, tokenId, price, expireTime);

            await expect(this.auctionHouse.connect(this.buyer)
                .purchase(tokenId, price, expireTime, sign, { value: wei("0.1") }))
                .to.be.revertedWith("Insufficient funds for a purchase");
        });

        it("should forbid purchase for existing auction", async function () {
            await this.auctionHouse.createAuction(tokenId, price, false);

            const expireTime = await time.latest() + 3600;
            const sign = generateSign(this.signer, tokenId, price, expireTime);

            await expect(this.auctionHouse.connect(this.buyer)
                .purchase(tokenId, price, expireTime, sign, { value: price }))
                .to.be.revertedWith("Token already listed");
        });

        it("should forbid purchase for existing token", async function () {
            const expireTime = await time.latest() + 3600;
            const sign = generateSign(this.signer, tokenId, price, expireTime);

            await this.auctionHouse.connect(this.buyer)
                .purchase(tokenId, price, expireTime, sign, { value: price });

            await expect(this.auctionHouse.connect(this.buyer)
                .purchase(tokenId, price, expireTime, sign, { value: price }))
                .to.be.revertedWith("Token already exist");
        });

        it("should forbid invalid signature", async function () {
            const expireTime = await time.latest() + 3600;
            const sign = generateSign(this.buyer, tokenId, price, expireTime);

            await expect(this.auctionHouse.connect(this.buyer)
                .purchase(tokenId, price, expireTime, sign, { value: price }))
                .to.be.revertedWith("Wrong signature is provided");
        });
    });

    describe("exclusive sale", function () {
        const tokenId = 1;
        const price = wei("1");

        beforeEach(async function () {
            const { auctionHouse, token, ztlkey, buyer, others, sign } = await loadFixture(deployFixture);
            await auctionHouse.createAuction(tokenId, price, true);
            await auctionHouse.createAuction(tokenId + 1, price, false);

            this.auctionHouse = auctionHouse;
            this.token = token;
            this.ztlkey = ztlkey;
            this.buyer = buyer;
            this.sign = sign;
            this.party1 = others[6];
            this.party2 = others[7];
        });

        it("should allow bid when sender is whitelisted", async function () {
            await this.auctionHouse.addWhitelistAddress([this.party1.address, this.party2.address]);
           
            const tx = await this.auctionHouse.connect(this.party1)
                .bid(tokenId, this.sign(this.party1), { value: price });

            await expect(tx).to.emit(this.auctionHouse, "AuctionBid")
                .withArgs(tokenId, this.party1.address, price, false);
        });

        it("should allow bid when a sender has Zeitls Key", async function () {
            await this.ztlkey.mint(this.buyer.address);

            const tx = await this.auctionHouse.connect(this.buyer)
                .bid(tokenId, this.sign(this.buyer), { value: price });

            await expect(tx).to.emit(this.auctionHouse, "AuctionBid")
                .withArgs(tokenId, this.buyer.address, price, false);
        });

        it("should allow bid on basic sale", async function () {
            await this.ztlkey.mint(this.buyer.address);
            await this.auctionHouse.addWhitelistAddress([this.buyer.address]);

            const tx = await this.auctionHouse.connect(this.buyer)
                .bid(tokenId, this.sign(this.buyer), { value: price });

            await expect(tx).to.emit(this.auctionHouse, "AuctionBid")
                .withArgs(tokenId, this.buyer.address, price, false);
        });

        it("should forbid bid on limited auction without whitelist or key", async function () {
            await expect(this.auctionHouse.connect(this.buyer)
                .bid(tokenId, this.sign(this.buyer), { value: price }))
                .to.be.revertedWith("Sender is not whitelisted");
        });
    });
});
