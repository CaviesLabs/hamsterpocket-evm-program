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
    await Registry.OPERATOR(),
    "0x95C7022924A0379FeE2b950DdaE0195F6bC30E13" /// OPERATOR
  );
  await Registry.grantRole(await Registry.RELAYER(), Chef.address);
  await Registry.grantRole(await Registry.RELAYER(), Vault.address);

  /**
   * @dev Whitelist addresses
   */
  await Registry.whitelistAddress(
    "0xc97b81B8a38b9146010Df85f1Ac714aFE1554343", // V2 Router
    true
  );
  await Registry.whitelistAddress(
    "0x8F8526dbfd6E38E3D8307702cA8469Bae6C56C15", // WOKT
    true
  );
  await Registry.whitelistAddress(
    "0x97B05e6C5026D5480c4B6576A8699866eb58003b", // stOKT
    true
  );
  await Registry.whitelistAddress(
    "0x382bB369d343125BfB2117af9c149795C6C65C50", // USDT
    true
  );

  /**
   * @dev Linking components
   */
  await Vault.setRegistry(Registry.address);
  await Vault.initEtherman("0x8F8526dbfd6E38E3D8307702cA8469Bae6C56C15");

  await Chef.setRegistry(Registry.address);
  await Chef.setVault(Vault.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
