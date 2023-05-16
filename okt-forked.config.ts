import hardhatConfig from "./hardhat.config";

export default {
  ...hardhatConfig,
  networks: {
    ...(hardhatConfig as any).networks,
    hardhat: {
      ...(hardhatConfig as any).networks.hardhat,
      forking: {
        url: (hardhatConfig as any).networks.okt.url,
        blockNumber: 19473000,
      },
    },
  },
};
