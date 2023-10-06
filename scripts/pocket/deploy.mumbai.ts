import { ethers, upgrades } from "hardhat";
import {
  PocketChef,
  PocketRegistry,
  PocketVault,
  Multicall3,
  Etherman,
} from "../../typechain-types";
import { ensureTransaction } from "./utils/transaction";

async function main() {
  /**
   * @dev Deploy multicall3
   */
  const Multicall3Contract = await ethers.getContractFactory("Multicall3");
  const Multicall3 =
    (await Multicall3Contract.deploy()) as unknown as Multicall3;
  console.log("Multicall3 deployed at", await Multicall3.getAddress());

  /**
   * @dev Deploy contract
   */
  const PocketChefContract = await ethers.getContractFactory("PocketChef");
  const Chef = (await upgrades.deployProxy(PocketChefContract, [], {
    unsafeAllow: ["constructor", "delegatecall"],
  })) as unknown as PocketChef;
  console.log("Chef deployed at", await Chef.getAddress());

  /**
   * @dev Deploy contract
   */
  const PocketRegistryContract =
    await ethers.getContractFactory("PocketRegistry");
  const Registry = (await upgrades.deployProxy(PocketRegistryContract, [], {
    unsafeAllow: ["constructor"],
  })) as unknown as PocketRegistry;
  console.log("Registry deployed at", await Registry.getAddress());

  /**
   * @dev Deploy contract
   */
  const PocketVaultContract = await ethers.getContractFactory("PocketVault");
  const Vault = (await upgrades.deployProxy(PocketVaultContract, [], {
    unsafeAllow: ["constructor"],
  })) as unknown as PocketVault;
  console.log("Vault deployed at", await Vault.getAddress());

  /**
   * @dev Deploy contract
   */
  const EthermanContract = await ethers.getContractFactory("Etherman");
  const EthermanObj = (await EthermanContract.deploy(
    "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
  )) as unknown as Etherman;
  console.log("Etherman deployed at", await EthermanObj.getAddress());

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
      "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889", // Wrapped ETher
      true,
    ),
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x4648a43B2C14Da09FdF82B161150d3F634f40491", // Universal router
      true,
    ),
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x000000000022d473030f116ddee9f6b43ac78ba3", // permit2
      true,
    ),
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x6041fE60d443480F96546C927E0cE6E14A5741D4", // USDT
      true,
    ),
  );

  /**
   * @dev Linking components
   */
  await ensureTransaction(await Vault.setRegistry(await Registry.getAddress()));
  await ensureTransaction(
    await Vault.setPermit2("0x000000000022d473030f116ddee9f6b43ac78ba3"),
  );
  await ensureTransaction(
    await Vault.setQuoter(
      "0x4648a43B2C14Da09FdF82B161150d3F634f40491",
      "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
    ),
  );

  await ensureTransaction(await Chef.setRegistry(await Registry.getAddress()));
  await ensureTransaction(await Chef.setVault(await Vault.getAddress()));

  await ensureTransaction(
    await EthermanObj.transferOwnership(await Vault.getAddress()),
  );
  await ensureTransaction(
    await Vault.setEtherman(await EthermanObj.getAddress()),
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
