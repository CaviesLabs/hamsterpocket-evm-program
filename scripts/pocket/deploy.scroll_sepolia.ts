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
  const Multicall3 = (await Multicall3Contract.deploy()) as Multicall3;
  await Multicall3.deployTransaction.wait(5);
  console.log("Multicall3 deployed at", Multicall3.address);

  /**
   * @dev Deploy contract
   */
  const PocketChefContract = await ethers.getContractFactory("PocketChef");
  const Chef = (await upgrades.deployProxy(PocketChefContract, [], {
    unsafeAllow: ["constructor", "delegatecall"],
  })) as PocketChef;
  await Chef.deployTransaction.wait(10);
  console.log("Chef deployed at", Chef.address);

  /**
   * @dev Deploy contract
   */
  const PocketRegistryContract = await ethers.getContractFactory(
    "PocketRegistry"
  );
  const Registry = (await upgrades.deployProxy(PocketRegistryContract, [], {
    unsafeAllow: ["constructor"],
  })) as PocketRegistry;
  await Registry.deployTransaction.wait(10);
  console.log("Registry deployed at", Registry.address);

  /**
   * @dev Deploy contract
   */
  const PocketVaultContract = await ethers.getContractFactory("PocketVault");
  const Vault = (await upgrades.deployProxy(PocketVaultContract, [], {
    unsafeAllow: ["constructor"],
  })) as PocketVault;
  await Vault.deployTransaction.wait(40);
  console.log("Vault deployed at", Vault.address);

  /**
   * @dev Configure registry
   */
  await ensureTransaction(
    await Registry.grantRole(
      await Registry.OPERATOR(),
      "0x95C7022924A0379FeE2b950DdaE0195F6bC30E13" /// OPERATOR
    )
  );
  await ensureTransaction(
    await Registry.grantRole(
      await Registry.OPERATOR(),
      Multicall3.address /// OPERATOR
    )
  );
  await ensureTransaction(
    await Registry.grantRole(await Registry.RELAYER(), Chef.address)
  );
  await ensureTransaction(
    await Registry.grantRole(await Registry.RELAYER(), Vault.address)
  );

  /**
   * @dev Whitelist addresses
   */
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x5300000000000000000000000000000000000004", // WETH
      true
    )
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x5868B5394DEcbE28185879Cd6E63Ab7560FFf2D8", // BOX
      true
    )
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x9c53Fc766dC0447dd15B48647e83Ca8621Ae3493", // POCKET
      true
    )
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x17AFD0263D6909Ba1F9a8EAC697f76532365Fb95", // router v3
      true
    )
  );

  /**
   * @dev Linking components
   */
  await ensureTransaction(await Vault.setRegistry(Registry.address));
  await ensureTransaction(
    await Vault.setQuoter(
      "0x17AFD0263D6909Ba1F9a8EAC697f76532365Fb95",
      "0xd5dd33650Ef1DC6D23069aEDC8EAE87b0D3619B2"
    )
  );
  await ensureTransaction(
    await Vault.initEtherman("0x5300000000000000000000000000000000000004")
  );

  await ensureTransaction(await Chef.setRegistry(Registry.address));
  await ensureTransaction(await Chef.setVault(Vault.address));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
