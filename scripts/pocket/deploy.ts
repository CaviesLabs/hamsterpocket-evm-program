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
  await Multicall3.deployTransaction.wait(30);
  console.log("Multicall3 deployed at", Multicall3.address);

  /**
   * @dev Deploy contract
   */
  const PocketChefContract = await ethers.getContractFactory("PocketChef");
  const Chef = (await upgrades.deployProxy(PocketChefContract, [], {
    unsafeAllow: ["constructor", "delegatecall"],
  })) as PocketChef;
  await Chef.deployTransaction.wait(30);
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
  await Registry.deployTransaction.wait(30);
  console.log("Registry deployed at", Registry.address);

  /**
   * @dev Deploy contract
   */
  const PocketVaultContract = await ethers.getContractFactory("PocketVault");
  const Vault = (await upgrades.deployProxy(PocketVaultContract, [], {
    unsafeAllow: ["constructor"],
  })) as PocketVault;
  await Vault.deployTransaction.wait(30);
  console.log("Vault deployed at", Vault.address);

  /**
   * @dev Configure registry
   */
  await Registry.grantRole(
    Registry.OPERATOR(),
    "0xC988c21E794B0ad2008EAB90371d30eAd2c0c6f8" /// OPERATOR
  );
  await Registry.grantRole(Registry.RELAYER(), Chef.address);
  await Registry.grantRole(Registry.RELAYER(), Vault.address);

  /**
   * @dev Whitelist addresses
   */
  await Registry.whitelistAddress(
    "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
    true
  );
  await Registry.whitelistAddress(
    "0x55d398326f99059fF775485246999027B3197955", // USDT
    true
  );
  await Registry.whitelistAddress(
    "0x2170ed0880ac9a755fd29b2688956bd959f933f8", // ETH
    true
  );
  await Registry.whitelistAddress(
    "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", // BTCB
    true
  );
  await Registry.whitelistAddress(
    "0x5Dc88340E1c5c6366864Ee415d6034cadd1A9897", // Universal router
    true
  );
  await Registry.whitelistAddress(
    "0x000000000022d473030f116ddee9f6b43ac78ba3", // permit2
    true
  );

  /**
   * @dev Linking components
   */
  await Vault.setRegistry(Registry.address);
  await Vault.setPermit2("0x000000000022d473030f116ddee9f6b43ac78ba3");
  await Vault.setQuoter("0x78D78E420Da98ad378D7799bE8f4AF69033EB077");

  await Chef.setRegistry(Registry.address);
  await Chef.setVault(Vault.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
