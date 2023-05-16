import hardhatConfig from "./hardhat.config";

export default {
  ...hardhatConfig,
  networks: {
    ...(hardhatConfig as any).networks,
    hardhat: {
      ...(hardhatConfig as any).networks.hardhat,
      forking: {
        url: (hardhatConfig as any).networks.xdc.url,
        blockNumber: 60572383,
      },
    },
  },
};
