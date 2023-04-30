import { ethers, upgrades } from "hardhat";
import {
  PocketChef,
  PocketRegistry,
  PocketVault,
  Multicall3,
} from "../../typechain-types";

async function main() {
  /**
   * @dev Deploy multicall3
   */
  const Multicall3Contract = await ethers.getContractFactory("Multicall3");
  const Multicall3 = (await Multicall3Contract.deploy()) as Multicall3;

  /**
   * @dev Deploy contract
   */
  const PocketChefContract = await ethers.getContractFactory("PocketChef");
  const Chef = (await upgrades.deployProxy(PocketChefContract, [], {
    unsafeAllow: ["constructor", "delegatecall"],
  })) as PocketChef;

  /**
   * @dev Deploy contract
   */
  const PocketRegistryContract = await ethers.getContractFactory(
    "PocketRegistry"
  );
  const Registry = (await upgrades.deployProxy(PocketRegistryContract, [], {
    unsafeAllow: ["constructor"],
  })) as PocketRegistry;

  /**
   * @dev Deploy contract
   */
  const PocketVaultContract = await ethers.getContractFactory("PocketVault");
  const Vault = (await upgrades.deployProxy(PocketVaultContract, [], {
    unsafeAllow: ["constructor"],
  })) as PocketVault;

  /**
   * @dev Configure registry
   */
  await Registry.grantRole(
    Registry.OPERATOR(),
    "0xAC118F16238b5aba99f3C9dDDB74D3e635136FEC" /// OPERATOR
  );
  await Registry.grantRole(Registry.RELAYER(), Chef.address);
  await Registry.grantRole(Registry.RELAYER(), Vault.address);

  /**
   * @dev Whitelist addresses
   */
  await Registry.whitelistAddress(
    "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6", // Wrapped ETher
    true
  );
  await Registry.whitelistAddress(
    "0x4648a43B2C14Da09FdF82B161150d3F634f40491", // Universal router
    true
  );
  await Registry.whitelistAddress(
    "0x000000000022d473030f116ddee9f6b43ac78ba3", // permit2
    true
  );
  // await Registry.whitelistAddress(
  //   "0x55d398326f99059fF775485246999027B3197955", // USDT
  //   true
  // );
  // await Registry.whitelistAddress(
  //   "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", // BTCB
  //   true
  // );

  /**
   * @dev Linking components
   */
  await Vault.setRegistry(Registry.address);
  await Vault.setPermit2("0x000000000022d473030f116ddee9f6b43ac78ba3");
  await Chef.setRegistry(Registry.address);
  await Chef.setVault(Vault.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
