import { ethers, upgrades } from "hardhat";
import {
  PocketChef,
  PocketRegistry,
  PocketVault,
  Multicall3,
} from "../../typechain-types";
import { ensureTransaction } from "./utils/transaction";

async function main() {
  /**
   * @dev Deploy multicall3
   */
  const Multicall3Contract = await ethers.getContractFactory("Multicall3");
  const Multicall3 =
    (await Multicall3Contract.deploy()) as unknown as Multicall3;
  await Multicall3.deploymentTransaction()?.wait(5);
  console.log("Multicall3 deployed at", await Multicall3.getAddress());

  /**
   * @dev Deploy contract
   */
  const PocketChefContract = await ethers.getContractFactory("PocketChef");
  const Chef = (await upgrades.deployProxy(PocketChefContract, [], {
    unsafeAllow: ["constructor", "delegatecall"],
  })) as unknown as PocketChef;
  await Chef.deploymentTransaction()?.wait(5);
  console.log("Chef deployed at", await Chef.getAddress());

  /**
   * @dev Deploy contract
   */
  const PocketRegistryContract =
    await ethers.getContractFactory("PocketRegistry");
  const Registry = (await upgrades.deployProxy(PocketRegistryContract, [], {
    unsafeAllow: ["constructor"],
  })) as unknown as PocketRegistry;
  await Registry.deploymentTransaction()?.wait(5);
  console.log("Registry deployed at", await Registry.getAddress());

  /**
   * @dev Deploy contract
   */
  const PocketVaultContract = await ethers.getContractFactory("PocketVault");
  const Vault = (await upgrades.deployProxy(PocketVaultContract, [], {
    unsafeAllow: ["constructor"],
  })) as unknown as PocketVault;
  await Vault.deploymentTransaction()?.wait(5);
  console.log("Vault deployed at", await Vault.getAddress());

  /**
   * @dev Configure registry
   */
  await ensureTransaction(
    await Registry.grantRole(
      await Registry.OPERATOR(),
      "0x95C7022924A0379FeE2b950DdaE0195F6bC30E13", /// OPERATOR
    ),
  );
  await ensureTransaction(
    await Registry.grantRole(
      await Registry.OPERATOR(),
      await Multicall3.getAddress(), /// OPERATOR
    ),
  );
  await ensureTransaction(
    await Registry.grantRole(await Registry.RELAYER(), await Chef.getAddress()),
  );
  await ensureTransaction(
    await Registry.grantRole(
      await Registry.RELAYER(),
      await Vault.getAddress(),
    ),
  );

  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x60aE616a2155Ee3d9A68541Ba4544862310933d4", // V2 Router
      true,
    ),
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // WAVAX
      true,
    ),
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // USDC
      true,
    ),
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x152b9d0FdC40C096757F570A51E494bd4b943E50", // BTCB
      true,
    ),
  );

  /**
   * @dev Linking components
   */
  await ensureTransaction(await Vault.setRegistry(await Registry.getAddress()));
  await ensureTransaction(
    await Vault.initEtherman("0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"),
  );

  await ensureTransaction(await Chef.setRegistry(await Registry.getAddress()));
  await ensureTransaction(await Chef.setVault(await Vault.getAddress()));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
