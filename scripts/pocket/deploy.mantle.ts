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
  await Chef.deploymentTransaction()?.wait(10);
  console.log("Chef deployed at", await Chef.getAddress());

  /**
   * @dev Deploy contract
   */
  const PocketRegistryContract =
    await ethers.getContractFactory("PocketRegistry");
  const Registry = (await upgrades.deployProxy(PocketRegistryContract, [], {
    unsafeAllow: ["constructor"],
  })) as unknown as PocketRegistry;
  await Registry.deploymentTransaction()?.wait(10);
  console.log("Registry deployed at", await Registry.getAddress());

  /**
   * @dev Deploy contract
   */
  const PocketVaultContract = await ethers.getContractFactory("PocketVault");
  const Vault = (await upgrades.deployProxy(PocketVaultContract, [], {
    unsafeAllow: ["constructor"],
  })) as unknown as PocketVault;
  await Vault.deploymentTransaction()?.wait(40);
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

  /**
   * @dev Whitelist addresses
   */
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8", // WMNT
      true,
    ),
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE", // USDT
      true,
    ),
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111", // ETH
      true,
    ),
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9", // USDC
      true,
    ),
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x97174506AafcC846A40832719bD8899a588Bd05c", // RealBenZ
      true,
    ),
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x319B69888b0d11cEC22caA5034e25FfFBDc88421", // router v3
      true,
    ),
  );

  /**
   * @dev Linking components
   */
  await ensureTransaction(await Vault.setRegistry(await Registry.getAddress()));
  await ensureTransaction(
    await Vault.setQuoter(
      "0x319B69888b0d11cEC22caA5034e25FfFBDc88421",
      "0xc4aaDc921E1cdb66c5300Bc158a313292923C0cb",
    ),
  );
  await ensureTransaction(
    await Vault.initEtherman("0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8"),
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
