import { ethers, upgrades } from "hardhat";
import { PocketChef, PocketRegistry, PocketVault } from "../../typechain-types";

async function main() {
  const Addresses = {
    PocketVault: "0xA78c8Da9e3Bac9B790d109Cf9023B3b6dB72b0E0",
    PocketRegistry: "0xC3Bc90aAB2471F3031e25fb3097391EAbd9E5D1F",
    PocketChef: "0x6591D9D02f1699B3C5ac0F396526d09C276b5754",
    Multicall3: "0x83Cb92492667a8334381c95A02007c8bF0811b89",
    WBNBAddress: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    UniswapAddress: "0xBf5140A22578168FD562DCcF235E5D43A02ce9B1",
    USDTAddress: "0x55d398326f99059fF775485246999027B3197955",
    BTCBAddress: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
    ETHAddress: "0x2170ed0880ac9a755fd29b2688956bd959f933f8",
    RouterAddress: "0x5Dc88340E1c5c6366864Ee415d6034cadd1A9897",
    Permit2Address: "0x000000000022d473030f116ddee9f6b43ac78ba3",
    PancakeSwapRouterV2: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
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
