/**
 * Import libraries
 */
import dotenv from "dotenv";
import { extendEnvironment, HardhatUserConfig } from "hardhat/config";
import Web3 from "web3";
import "@nomicfoundation/hardhat-toolbox";
import "tsconfig-paths/register";
import "@openzeppelin/hardhat-upgrades";
/**
 * Config dotenv first
 */
dotenv.config();

/**
 * Default hardhat configs
 */
const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.19",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 9999999,
          },
        },
      },
    ],
  },
};

/**
 * Extract env vars
 */
const privateKey = process.env.PRIVATE_KEY || "";

/**
 * If private key is available, attach network configs
 */
if (privateKey) {
  config.networks = {
    ganache: {
      url: "http://127.0.0.1:7545",
      chainId: 5777,
    },
    hardhat_local: {
      url: "http://127.0.0.1:8545",
      accounts: [privateKey],
      gasPrice: 250000000000,
    },
    hardhat: {
      forking: {
        url: `https://bsc-dataseed1.binance.org`,
        enabled: true,
      },
      gas: "auto",
      gasPrice: "auto",
      chainId: 56,
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_ID}`,
      accounts: [privateKey],
      chainId: 4,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_ID}`,
      accounts: [privateKey],
      gas: "auto",
      gasPrice: "auto",
      chainId: 1,
    },
    bsc_testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      accounts: [privateKey],
      gas: "auto",
      gasPrice: "auto",
      chainId: 97,
    },
    bsc: {
      url: "https://bsc-dataseed1.binance.org",
      accounts: [privateKey],
      gas: "auto",
      gasPrice: "auto",
      chainId: 56,
    },
    hamsterbox: {
      url: "https://rpc.hamsterbox.xyz",
      accounts: [privateKey],
      gas: "auto",
      gasPrice: 0,
      chainId: 5722,
    },
    arbitrum: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts: [privateKey],
      gas: "auto",
      gasPrice: "auto",
      chainId: 42161,
    },
    goerli: {
      url: "https://goerli.blockpi.network/v1/rpc/public",
      accounts: [privateKey],
      gas: "auto",
      gasPrice: "auto",
      chainId: 5,
    },
    mumbai: {
      url: "https://polygon-mumbai.blockpi.network/v1/rpc/public",
      accounts: [privateKey],
      gas: "auto",
      gasPrice: "auto",
      chainId: 80001,
    },
    xdc: {
      url: "https://erpc.xinfin.network",
      accounts: [privateKey],
      gas: "auto",
      gasPrice: "auto",
      chainId: 50,
    },
    okt: {
      url: "https://okc-mainnet.gateway.pokt.network/v1/lb/6275309bea1b320039c893ff",
      accounts: [privateKey],
      gas: "auto",
      gasPrice: "auto",
      chainId: 66,
    },
    gnosis: {
      url: "https://rpc.ankr.com/gnosis",
      accounts: [privateKey],
      gas: "auto",
      gasPrice: "auto",
      chainId: 100,
    },
    avaxc: {
      url: "https://rpc.ankr.com/avalanche",
      accounts: [privateKey],
      gas: "auto",
      gasPrice: "auto",
      chainId: 43114,
    },
    klaytn: {
      url: "https://klaytn.blockpi.network/v1/rpc/public",
      accounts: [privateKey],
      gas: "auto",
      gasPrice: "auto",
      chainId: 8217,
    },
    mantle: {
      url: "https://rpc.mantle.xyz",
      accounts: [privateKey],
      gas: "auto",
      gasPrice: "auto",
      chainId: 5000,
    },
    scroll_sepolia: {
      url: "https://scroll-sepolia.blockpi.network/v1/rpc/public",
      accounts: [privateKey],
      gas: "auto",
      gasPrice: "auto",
      chainId: 534351,
    },
  };
}

/**
 * Load etherscan key
 */
const etherscanKey = process.env.ETHERSCAN_KEY || "";

if (etherscanKey) {
  config.etherscan = {
    apiKey: etherscanKey,
  };
}

export default config;

extendEnvironment((hre) => {
  (hre as any).Web3 = Web3;
  const key = Object.keys(config.networks || {}).find(
    (key) =>
      (config.networks || {})[key]?.chainId === hre.network.config.chainId,
  );

  if (key) {
    // hre.network.provider is an EIP1193-compatible provider.
    (hre as any).web3 = new Web3(hre.network.provider);
  }
});
