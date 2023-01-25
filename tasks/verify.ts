import { task } from "hardhat/config";
import { getState } from "./config";

task("verify-etherscan", "Verify Zeitls Devils contracts on etherscan")
    .setAction(async function (args, { network, run }) {
        const state = getState(network.name);

        for (let [contract, def] of Object.entries(state.contracts())) {
            console.log(`Verifying ${contract} contract`);

            try {
                await run("verify:verify", {
                    address: def.address,
                    constructorArguments: def.constructorArgs,
                });
            } catch ({ message }) {
                if ((message as string).includes('Reason: Already Verified')) {
                    continue;
                }
                console.error(message);
            }
        }
    });