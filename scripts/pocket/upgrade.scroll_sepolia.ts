import { ethers, upgrades } from "hardhat";
import { PocketChef, PocketRegistry, PocketVault } from "../../typechain-types";

async function main() {
  const Addresses = {
    PocketVault: "0x6000e8c798b53c2bA7185B2cFde1DAA718369370",
    PocketRegistry: "0x5D785A46c0C17E7Eea91fa637D6Dd77a56EA6d1F",
    PocketChef: "0x7DbD520FF867c6b0c3bEeD1eC1E969C372895983",
    Multicall3: "0x22cd36eF909B5A3e80cf8A02e1f2BFB2256E731F",
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
    { unsafeAllow: ["delegatecall"] },
  )) as unknown as PocketChef;
  console.log("upgraded Chef contract at ", await Chef.getAddress());

  /**
   * @dev Deploy contract
   */
  const PocketRegistryContract =
    await ethers.getContractFactory("PocketRegistry");
  try {
    await upgrades.forceImport(
      Addresses.PocketRegistry,
      PocketRegistryContract,
    );
  } catch {
    console.log("skipped warning");
  }
  const Registry = (await upgrades.upgradeProxy(
    Addresses.PocketRegistry,
    PocketRegistryContract,
  )) as unknown as PocketRegistry;
  console.log("upgraded Registry contract at ", await Registry.getAddress());

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
    PocketVaultContract,
  )) as unknown as PocketVault;
  console.log("upgraded Vault contract at ", await Vault.getAddress());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
