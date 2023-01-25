import fs from "fs";
import { z, ZodError } from "zod";
import Web3 from "web3";

export const Address = z.string().refine(value => Web3.utils.isAddress(value), {
    message: "Wrong address value provided",
});

export const DeploymentConfigSchema = z.object({
    openseaRegistry: Address,
    owner: Address,
    maintainer: Address,
    weth: Address,
    whitelistUri: z.string(),
    signerKYC: Address,
    timeBuffer: z.number(),
    duration: z.number(),
    minBidDiff: z.number(), 
    metadata: z.array(z.object({
        id: z.number(),
        uri: z.string(),
    })),
});

export type DeploymentConfig = z.infer<typeof DeploymentConfigSchema>;

export type DeploymentContract = {
    type: "Regular" | "Upgradeable";
    name: string;
    args: unknown[];
}

const ContractInfoSchema = z.object({ 
    address: Address, 
    impl: Address.optional(),
    constructorArgs: z.array(z.unknown()).optional(),
    initArgs: z.array(z.unknown()).optional(),
});

export type ContractInfo = z.infer<typeof ContractInfoSchema>;

// Define structure for network state - simple address in the network
const NetworkStateSchema = z.record(z.string(), ContractInfoSchema);

export type NetworkState = z.infer<typeof NetworkStateSchema>;

export async function getConfig(network: string) {
    const raw = await import(`./config.${network}`);
    try {
        return DeploymentConfigSchema.parse(raw.default);
    } catch (e) {
        if (e instanceof ZodError) {
            console.log(e.issues);
        }
        throw new Error(`Invalid ${network} network config`);
    }
}

export function getState(network: string) {
    const path = `state.${network}.json`;
    if (fs.existsSync(path)) {
        console.log("Network state file found");        
    } else {
        console.log(`Network file for ${network} not found, create it`);
        fs.appendFileSync(path, JSON.stringify({}));
    }

    const readState = () => {
        const raw = fs.readFileSync(path, "utf-8");
        try {
            return NetworkStateSchema.parse(JSON.parse(raw)); 
        } catch (e) {
            if (e instanceof ZodError) {
                console.log(e.issues);
            }
            throw new Error(`Invalid ${network} network state`);
        }
    };

    return {
        contracts: readState,
        address: (contract: string): () => string => {
            return () => {
                try {
                    const state = readState(); 
                    return state[contract].address;
                } catch (e) {
                    console.error(`State missing address for ${contract}`);
                    throw e;
                }
            }
        },
        update: (contract: string, info: ContractInfo): void => {
            const state = readState(); 
            state[contract] = info;
            fs.writeFileSync(path, JSON.stringify(state, null, 4));
        }
    };
}

export type State = ReturnType<typeof getState>;
