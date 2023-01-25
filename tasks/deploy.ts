import { TransactionReceipt } from "@ethersproject/providers";
import { task } from "hardhat/config";
import { DeploymentConfig, DeploymentConfigSchema, DeploymentContract, getState, State } from "./config";

const definition = (config: DeploymentConfig, state: State): DeploymentContract[] => {
    return [
        {
            type: "Regular",
            name: "ZtlDevils",
            args: [config.owner, config.openseaRegistry],
        },
        {
            type: "Regular",
            name: "ZtlDevilsWhitelist",
            args: [config.whitelistUri],
        },
        {
            type: "Upgradeable",
            name: "ZtlDevilsTreasury",
            args: [config.maintainer],
        },
        {
            type: "Upgradeable",
            name: "ZtlDevilsAuctionHouse",
            args: [
                state.address("ZtlDevils"), 
                state.address("ZtlDevilsTreasury"), 
                state.address("ZtlDevilsWhitelist"),
                config.signerKYC, config.weth, config.timeBuffer,
                config.duration, config.minBidDiff
            ]
        }
    ];
}

task("deploy", "Deploy Zeitls Devils contracts")
    .setAction(async function (args, { network, ethers, upgrades }) {
        const raw = await import(`./config/config.${network.name}`);
        const config = DeploymentConfigSchema.parse(raw.default)
        const state = getState(network.name);
        const deployment = definition(config, state);

        const printDeploymentTx = (tx: TransactionReceipt) => {
            console.log("Transaction:", tx.transactionHash);
            console.log("Block hash:", tx.blockHash);
            console.log("Block number:", tx.blockNumber);
        };

        for (let contract of deployment) {
            console.log("\n");
            console.log("================================================================================");
            console.log("Type:", contract.type);
            console.log("Contract:", contract.name);

            const factory = await ethers.getContractFactory(contract.name);
            const args = contract.args.map(arg => {
                return (arg instanceof Function) ? arg() : arg;
            });

            if (contract.type === "Regular") {
                const instance = await factory.deploy(...args);
                await instance.deployed();
                state.update(contract.name, { address: instance.address, constructorArgs: args });
                console.log("Address:", instance.address);
                const tx = await instance.deployTransaction.wait(1);
                printDeploymentTx(tx);
            } else if (contract.type === "Upgradeable") {
                const proxy = await upgrades.deployProxy(factory, args);
                await proxy.deployed();
                const impl = await upgrades.erc1967.getImplementationAddress(proxy.address);
                state.update(contract.name, { address: proxy.address, impl, initArgs: args });
                console.log("Proxy:", proxy.address);
                console.log("Implementation:", impl);
                const tx = await proxy.deployTransaction.wait(1);
                printDeploymentTx(tx);
            } else {
                throw new Error("Unsupported contract type");
            }

            console.log("================================================================================");
        }

        console.log("\n");
        console.log("Deployment done. Do not forget to verify contracts and initialize");
    });
