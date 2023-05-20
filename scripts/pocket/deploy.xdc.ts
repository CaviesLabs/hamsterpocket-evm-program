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
    "0xf9c5E4f6E627201aB2d6FB6391239738Cf4bDcf9", // V2 Router
    true
  );
  await Registry.whitelistAddress(
    "0x951857744785E80e2De051c32EE7b25f9c458C42", // WxDC
    true
  );
  await Registry.whitelistAddress(
    "0x17476dc3eda45aD916cEAdDeA325B240A7FB259D", // XTT
    true
  );
  await Registry.whitelistAddress(
    "0x374a7CE8Fda576a92e3A17c47f47C6B7AEcEF39D", // CHUPA
    true
  );

  /**
   * @dev Linking components
   */
  await Vault.setRegistry(Registry.address);
  await Vault.initEtherman("0x951857744785E80e2De051c32EE7b25f9c458C42");

  await Chef.setRegistry(Registry.address);
  await Chef.setVault(Vault.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
