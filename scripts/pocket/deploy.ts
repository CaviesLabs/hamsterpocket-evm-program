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
  await Multicall3.deployTransaction.wait(10);
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
  await Vault.deployTransaction.wait(10);
  console.log("Vault deployed at", Vault.address);
  //
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
      "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
      true
    )
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x55d398326f99059fF775485246999027B3197955", // USDT
      true
    )
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x2170ed0880ac9a755fd29b2688956bd959f933f8", // ETH
      true
    )
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0xbf5140a22578168fd562dccf235e5d43a02ce9b1", // Uniswap
      true
    )
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", // BTCB
      true
    )
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x5Dc88340E1c5c6366864Ee415d6034cadd1A9897", // Universal router
      true
    )
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x10ED43C718714eb63d5aA57B78B54704E256024E", // PCS Router v2
      true
    )
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x1b81D678ffb9C0263b24A97847620C99d213eB14", // PancakeSwap router v3
      true
    )
  );
  await ensureTransaction(
    await Registry.whitelistAddress(
      "0x000000000022d473030f116ddee9f6b43ac78ba3", // permit2
      true
    )
  );

  await ensureTransaction(await Chef.setRegistry(Registry.address));
  await ensureTransaction(await Chef.setVault(Vault.address));
  await ensureTransaction(await Vault.setRegistry(Registry.address));

  await ensureTransaction(
    await Vault.setPermit2("0x000000000022d473030f116ddee9f6b43ac78ba3")
  );
  await ensureTransaction(
    await Vault.setQuoter(
      "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
      "0x78D78E420Da98ad378D7799bE8f4AF69033EB077"
    )
  );
  await ensureTransaction(
    await Vault.setQuoter(
      "0x5Dc88340E1c5c6366864Ee415d6034cadd1A9897",
      "0x78D78E420Da98ad378D7799bE8f4AF69033EB077"
    )
  );
  await ensureTransaction(
    await Vault.initEtherman("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c")
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
