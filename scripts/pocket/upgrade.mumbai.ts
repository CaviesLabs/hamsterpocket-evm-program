import { ethers, upgrades } from "hardhat";
import { PocketChef, PocketRegistry, PocketVault } from "../../typechain-types";

async function main() {
  const Addresses = {
    PocketVault: "0x4dBbbf24C757341d6bff85A768cCBF2267161C50",
    PocketRegistry: "0x68B4646c9B6133e1FC741d587830B706B9e22b57",
    PocketChef: "0x5a76D1Ca3FC8F2B0D1A3b219F88fd35d0eED185B",
    Multicall3: "0xd54eC92F1e27E707773F4dF2ba697f15264f6690",
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
