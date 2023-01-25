import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-truffle5";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from 'dotenv'
import "./tasks";

// read secrets from .env file
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.16',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        enabled: !!process.env.FORK ?? false,
        url: `https://eth-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_GOERLI_API_KEY}`,
        blockNumber: 8374190, // for predictable tests
      }
    },
    goerli: {
      url: `https://eth-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_GOERLI_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY!!]
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY
  },
};

export default config;
