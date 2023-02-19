import { task } from "hardhat/config";
import { DeploymentConfigSchema, getConfig, getState } from "./config";

task("deploy-pieces", "Deploy Zeitls Devils Pieces contracts")
    .setAction(async function (args, { network, ethers }) {
        const config = await getConfig(network.name);
        const state = getState(network.name);

        const treasury = state.address("ZtlDevilsTreasury")();

        if (!treasury) {
            throw new Error("Treasury address does not present in the state");
        }

        const cargs = [
            config.owner,
            config.signerKYC,
            treasury,
            config.openseaRegistry,
            config.piecesURI
        ] as const;

        const Pieces = await ethers.getContractFactory("ZtlDevilsPieces");
        const pieces = await Pieces.deploy(...cargs);

        state.update("ZtlDevilsPieces", { address: pieces.address, constructorArgs: cargs.slice() });

        console.log("Zeitls Devils Pieces:", pieces.address);
    });