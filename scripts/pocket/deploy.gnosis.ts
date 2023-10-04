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
  console.log("Multicall3 deployed at", Multicall3.address);

  /**
   * @dev Deploy contract
   */
  const PocketChefContract = await ethers.getContractFactory("PocketChef");
  const Chef = (await upgrades.deployProxy(PocketChefContract, [], {
    unsafeAllow: ["constructor", "delegatecall"],
  })) as PocketChef;
  console.log("Chef deployed at", Chef.address);

  /**
   * @dev Deploy contract
   */
  const PocketRegistryContract = await ethers.getContractFactory(
    "PocketRegistry"
  );
  const Registry = (await upgrades.deployProxy(PocketRegistryContract, [], {
    unsafeAllow: ["constructor"],
  })) as PocketRegistry;
  console.log("Registry deployed at", Registry.address);

  /**
   * @dev Deploy contract
   */
  const PocketVaultContract = await ethers.getContractFactory("PocketVault");
  const Vault = (await upgrades.deployProxy(PocketVaultContract, [], {
    unsafeAllow: ["constructor"],
  })) as PocketVault;
  console.log("Vault deployed at", Vault.address);

  /**
   * @dev Configure registry
   */
  await Registry.grantRole(
    await Registry.OPERATOR(),
    "0x95C7022924A0379FeE2b950DdaE0195F6bC30E13" /// OPERATOR
  );
  await Registry.grantRole(await Registry.RELAYER(), Chef.address);
  await Registry.grantRole(await Registry.RELAYER(), Vault.address);

  /**
   * @dev Whitelist addresses
   */
  await Registry.whitelistAddress(
    "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d", // WXDAI
    true
  );
  await Registry.whitelistAddress(
    "0x1c232f01118cb8b424793ae03f870aa7d0ac7f77", // PCS Router v2
    true
  );
  await Registry.whitelistAddress(
    "0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb", // GNO
    true
  );
  await Registry.whitelistAddress(
    "0x8e5bBbb09Ed1ebdE8674Cda39A0c169401db4252", // WBTC
    true
  );
  await Registry.whitelistAddress(
    "0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1", // WETH
    true
  );

  /**
   * @dev Linking components
   */
  await Vault.setRegistry(Registry.address);
  await Vault.initEtherman("0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d");

  await Chef.setRegistry(Registry.address);
  await Chef.setVault(Vault.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
