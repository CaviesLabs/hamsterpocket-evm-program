import { ethers, upgrades } from "hardhat";
import { PocketChef, PocketRegistry, PocketVault } from "../../typechain-types";

async function main() {
  const Addresses = {
    PocketVault: "0x8500d55F0f49FFfA33cCBdbcF171eD50a7bcA26E",
    PocketRegistry: "0x8FbaCBb3B09c876cA0AD0939A746935456D5793F",
    PocketChef: "0x2E2eEFcD211658035b77AC4D1a4c40Be7174B441",
    Multicall3: "0x9ac25725B8465E70cc2458592C9104c0f06C8e87",
  };

  /**
   * @dev Deploy contract
   */
  const PocketChefContract = await ethers.getContractFactory("PocketChef");
  try {
    await upgrades.forceImport(Addresses.PocketChef, PocketChefContract);
  } catch {
    console.log("skipped warning");
  }
  const Chef = (await upgrades.upgradeProxy(
    Addresses.PocketChef,
    PocketChefContract,
    { unsafeAllow: ["delegatecall"] }
  )) as PocketChef;
  console.log("upgraded Chef contract at ", Chef.address);

  /**
   * @dev Deploy contract
   */
  const PocketRegistryContract = await ethers.getContractFactory(
    "PocketRegistry"
  );
  try {
    await upgrades.forceImport(
      Addresses.PocketRegistry,
      PocketRegistryContract
    );
  } catch {
    console.log("skipped warning");
  }
  const Registry = (await upgrades.upgradeProxy(
    Addresses.PocketRegistry,
    PocketRegistryContract
  )) as PocketRegistry;
  console.log("upgraded Registry contract at ", Registry.address);

  /**
   * @dev Deploy contract
   */
  const PocketVaultContract = await ethers.getContractFactory("PocketVault");
  try {
    await upgrades.forceImport(Addresses.PocketVault, PocketVaultContract);
  } catch {
    console.log("skipped warning");
  }
  const Vault = (await upgrades.upgradeProxy(
    Addresses.PocketVault,
    PocketVaultContract
  )) as PocketVault;
  console.log("upgraded Vault contract at ", Vault.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
