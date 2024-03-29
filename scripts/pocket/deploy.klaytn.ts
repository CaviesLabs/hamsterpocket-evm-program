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
      "0xEf71750C100f7918d6Ded239Ff1CF09E81dEA92D", // V2 Router
      true,
    ),
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0xe4f05A66Ec68B54A58B17c22107b02e0232cC817", // WKLAYTN
      true,
    ),
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0xceE8FAF64bB97a73bb51E115Aa89C17FfA8dD167", // oUSDT
      true,
    ),
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x946BC715501413B9454BB6A31412A21998763F2D", // KBT
      true,
    ),
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0xCF87f94fD8F6B6f0b479771F10dF672f99eADa63", // CLA
      true,
    ),
  );

  /**
   * @dev Linking components
   */
  await ensureTransaction(await Vault.setRegistry(await Registry.getAddress()));
  await ensureTransaction(
    await Vault.initEtherman("0xe4f05A66Ec68B54A58B17c22107b02e0232cC817"),
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
