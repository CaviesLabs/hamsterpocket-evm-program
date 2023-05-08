import { ethers } from "hardhat";
import {
  PocketChef__factory,
  PocketRegistry__factory,
  PocketVault__factory,
} from "../../typechain-types";

async function main() {
  const Addresses = {
    PocketVault: "0x2B7388Cf467d05f3979dDd3eAD8AfD8a0CE0076c",
    PocketRegistry: "0xA7671257D29a2fDC5c585Dc67D6F0EfF9cF9b457",
    PocketChef: "0x9ac25725B8465E70cc2458592C9104c0f06C8e87",
    Multicall3: "0x292A7C55443850a30A6BCC17aF306b4Dc8864476",
  };
  const signer = (await ethers.getSigners())[0];

  /**
   * @dev Deploy contract
   */
  const Chef = PocketChef__factory.connect(Addresses.PocketChef, signer);
  console.log("Loaded Chef contract at ", Chef.address);

  /**
   * @dev Deploy contract
   */
  const Registry = PocketRegistry__factory.connect(
    Addresses.PocketRegistry,
    signer
  );
  console.log("Loaded Registry contract at ", Registry.address);

  /**
   * @dev Deploy contract
   */
  const Vault = PocketVault__factory.connect(Addresses.PocketVault, signer);
  console.log("upgraded Vault contract at ", Vault.address);

  // Create pocket
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
