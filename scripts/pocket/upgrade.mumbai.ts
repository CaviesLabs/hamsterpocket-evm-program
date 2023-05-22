import { ethers, upgrades } from "hardhat";
import { PocketChef, PocketRegistry, PocketVault } from "../../typechain-types";

async function main() {
  const Addresses = {
    PocketVault: "0xF90884eB5bDE6B8Ea306e1912B600d0ce2f73292",
    PocketRegistry: "0x691a63b8259c5C11E68DbF295571A53D6273aC8d",
    PocketChef: "0xD156e603a421efbba39BDcAC9F1a7ed0081d2fBF",
    Multicall3: "0x782971ACEe846ae7135d2e7c71807A5606037e80",
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
