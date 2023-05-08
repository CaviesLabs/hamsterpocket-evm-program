import { ethers, upgrades } from "hardhat";
import { PocketChef, PocketRegistry, PocketVault } from "../../typechain-types";

async function main() {
  const Addresses = {
    PocketVault: "0x2B7388Cf467d05f3979dDd3eAD8AfD8a0CE0076c",
    PocketRegistry: "0xA7671257D29a2fDC5c585Dc67D6F0EfF9cF9b457",
    PocketChef: "0x9ac25725B8465E70cc2458592C9104c0f06C8e87",
    Multicall3: "0x292A7C55443850a30A6BCC17aF306b4Dc8864476",
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
