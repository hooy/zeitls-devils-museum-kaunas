import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { neg, perc, wei } from "./utils";

describe("ZtlDevilsTreasury", () => {

    async function deployFixture() {
        const [deployer, maintainer, buyer, ...others] = await ethers.getSigners();

        const Treasury = await ethers.getContractFactory("ZtlDevilsTreasury");
        const treasury = await upgrades.deployProxy(Treasury, [maintainer.address]);

        return { deployer, maintainer, buyer, treasury, others };
    }

    it("auction sale", async function () {
        const { treasury, buyer } = await loadFixture(deployFixture);

        const tx = await treasury.connect(buyer).keep({ value: wei("1") });

        await expect(tx).to.changeEtherBalances(
            [treasury, buyer],
            [wei("1"), wei("1").mul(-1)]
        );

        expect(await treasury.income()).to.be.equal(wei("1"));
    });

    it("royalty", async function () {
        const { treasury, buyer } = await loadFixture(deployFixture);

        const tx = await buyer.sendTransaction({
            to: treasury.address,
            value: wei("1"),
        });

        await expect(tx).to.changeEtherBalances(
            [treasury, buyer],
            [wei("1"), wei("1").mul(-1)]
        );

        expect(await treasury.royalty()).to.be.equal(wei("1"));
    });

    describe("affiliates", function () {
        it("add affiliates", async function () {
            const { treasury, others } = await loadFixture(deployFixture);

            await treasury.addAffiliates(
                [others[0].address, others[1].address, others[2].address],
                [15, 3, 5]
            );

            expect(await treasury.isAffiliate(others[0].address)).to.be.equal(true);
            expect(await treasury.isAffiliate(others[1].address)).to.be.equal(true);
            expect(await treasury.isAffiliate(others[2].address)).to.be.equal(true);
            expect(await treasury.isAffiliate(others[3].address)).to.be.equal(false);

            expect(await treasury.shares()).to.be.equal(23);
        });

        it("remove affiliates", async function () {
            const { treasury, others } = await loadFixture(deployFixture);

            await treasury.addAffiliates(
                [others[0].address, others[1].address, others[2].address],
                [5, 5, 5]
            );

            await treasury.removeAffiliates([others[1].address]);

            expect(await treasury.isAffiliate(others[0].address)).to.be.equal(true);
            expect(await treasury.isAffiliate(others[1].address)).to.be.equal(false);
            expect(await treasury.isAffiliate(others[2].address)).to.be.equal(true);
            expect(await treasury.isAffiliate(others[3].address)).to.be.equal(false);

            expect(await treasury.shares()).to.be.equal(10);
        });

        it("forbid share limit exceeding", async function () {
            const { treasury, others } = await loadFixture(deployFixture);

            await expect(treasury.addAffiliates([others[0].address, others[1].address], [150, 950]))
                .to.be.revertedWith("Shares total amount for affiliates limit exceeded");

            await treasury.addAffiliates([others[0].address, others[1].address], [150, 150]);

            await expect(treasury.addAffiliates([others[2].address], [850]))
                .to.be.revertedWith("Shares total amount for affiliates limit exceeded");
        });

        it("forbid share overwrite", async function () {
            const { treasury, others } = await loadFixture(deployFixture);

            await treasury.addAffiliates([others[0].address, others[1].address], [15, 15]);

            await expect(treasury.addAffiliates([others[0].address], [30]))
                .to.be.revertedWith("Share overwrite is forbidden");
        });
    });

    describe("distribution", function () {
        it("maintainer only", async function () {
            const { treasury, maintainer, buyer } = await loadFixture(deployFixture);

            await buyer.sendTransaction({
                to: treasury.address,
                value: wei("1"),
            }); 

            const tx = await treasury.distribute(); 

            await expect(tx).to.changeEtherBalances(
                [treasury, maintainer],
                [wei("1").mul(-1), wei("1")]
            );
        });

        it("distribute auction income", async function () {
            const { treasury, maintainer, buyer, others } = await loadFixture(deployFixture);

            const total = wei("15");
            const affi = perc(total, 0.8);

            await treasury.addAffiliates(
                [others[0].address, others[1].address, others[2].address],
                [150, 30, 50]
            );

            // funds from auctions
            await treasury.connect(buyer).keep({ value: wei("10") });

            // funds from royalty
            await buyer.sendTransaction({
                to: treasury.address,
                value: wei("5"),
            });

            const tx = await treasury.distribute();

            await expect(tx).to.changeEtherBalances(
                [treasury, maintainer, others[0], others[1], others[2]],
                [
                    neg(total),
                    total.sub(affi).add(perc(affi, 0.77)),
                    perc(affi, 0.15),
                    perc(affi, 0.03),
                    perc(affi, 0.05),
                ]
            );

            expect(await treasury.income()).to.be.equal(0);
            expect(await treasury.royalty()).to.be.equal(0);

            expect(await ethers.provider.getBalance(treasury.address)).to.be.equal(wei("0"));

            expect(tx).to.emit(this.treasury, "Reward")
                .withArgs(maintainer, total.sub(affi).add(perc(affi, 0.77)));

            expect(tx).to.emit(this.treasury, "Reward")
                .withArgs(others[0], perc(affi, 0.15));

            expect(tx).to.emit(this.treasury, "Reward")
                .withArgs(others[1], perc(affi, 0.03));

            expect(tx).to.emit(this.treasury, "Reward")
                .withArgs(others[2], perc(affi, 0.05));
        });
    });

    (process.env.FORK ? describe : describe.skip)("Gnosis Wallet", function () {
        it("transfer to gnosis wallet", async function () {
            const gnosisWallet = "0xd228EB6F69258D07dA7b1235C995133Cd80caD5b"; // wallet on goerli
            const Treasury = await ethers.getContractFactory("ZtlDevilsTreasury");
            const treasury = await upgrades.deployProxy(Treasury, [gnosisWallet]);

            const [owner] = await ethers.getSigners();

            await owner.sendTransaction({
                to: treasury.address,
                value: wei("1"),
            }); 

            const tx = await treasury.distribute();

            await expect(tx).to.changeEtherBalances(
                [treasury, gnosisWallet],
                [wei("1").mul(-1), wei("1")]
            );
        });
    });
});
