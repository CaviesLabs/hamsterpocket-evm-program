import { ethers, upgrades } from "hardhat";
import { PocketChef, PocketRegistry, PocketVault } from "../../typechain-types";

async function main() {
  const Addresses = {
    PocketVault: "0x19a6263fA09281B177ad6789D2e2a30674471Cb6",
    PocketRegistry: "0x6A375e5FE01809987507Ee8D793FF8455512D804",
    PocketChef: "0x70f52112c00527F0357d55eD52C31181840508cB",
    Multicall3: "0x94eC37b16D48Ca4974d589cEF3F6F5964997F4DF",
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
