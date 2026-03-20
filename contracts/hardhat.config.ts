import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "hardhat-gas-reporter";
import "dotenv/config";

const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const RPC_URL = process.env.RPC_URL ?? "https://services.polkadothub-rpc.com/testnet";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      // Keep Cancun for OpenZeppelin 5.x compatibility, but avoid viaIR because
      // the native staking path on Polkadot Hub testnet is sensitive to the
      // extra MCOPY-based bytecode the IR pipeline emits.
      evmVersion: "cancun",
    },
  },
  networks: {
    polkadotHubTestnet: {
      chainId: 420420417,
      url: RPC_URL,
      accounts: [PRIVATE_KEY],
    },
    localhost: {
      chainId: 31337,
      url: "http://127.0.0.1:8545",
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      polkadotHubTestnet: process.env.ETHERSCAN_API_KEY ?? "verifyContract",
    },
    customChains: [
      {
        network: "polkadotHubTestnet",
        chainId: 420420417,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/testnet/evm/420420417/etherscan",
          browserURL: "https://blockscout-testnet.polkadot.io",
        },
      },
    ],
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
