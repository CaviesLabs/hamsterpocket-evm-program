// We define a fixture to reuse the same setup in every test.
// We use loadFixture to run this setup once, snapshot that state,
// and reset Hardhat Network to that snapshopt in every test.
import { ethers, upgrades } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  PocketChef,
  PocketVault,
  PocketRegistry,
  Multicall3,
  MockedERC20,
} from "../typechain-types";

export async function deployFixtures() {
  /**
   * @dev Imported accounts from hardhat forked mainnet
   */
  const owner = await ethers.getImpersonatedSigner(
    "0x4b16c5de96eb2117bbe5fd171e4d203624b014aa"
  );
  const owner2 = await ethers.getImpersonatedSigner(
    "0xa180Fe01B906A1bE37BE6c534a3300785b20d947"
  );
  const operator = await ethers.getImpersonatedSigner(
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
  );
  const BTCBOwner = await ethers.getImpersonatedSigner(
    "0xF68a4b64162906efF0fF6aE34E2bB1Cd42FEf62d"
  );

  /**
   * @dev Deploy multicall3
   */
  const Multicall3Contract = await ethers.getContractFactory("Multicall3");
  const Multicall3 = (await Multicall3Contract.connect(
    owner
  ).deploy()) as Multicall3;

  /**
   * @dev Initializes mocked erc contracts
   */
  const MockedERC20Contract = await ethers.getContractFactory("MockedERC20");
  const MockedERC20 = (await MockedERC20Contract.connect(
    owner
  ).deploy()) as MockedERC20;

  /**
   * @dev Funding erc20
   */
  await MockedERC20.connect(owner).transfer(
    owner2.address,
    ethers.BigNumber.from(ethers.constants.WeiPerEther).mul(20)
  );

  /**
   * @dev Deploy contract
   */
  const PocketChefContract = await ethers.getContractFactory("PocketChef");
  const Chef = (await upgrades.deployProxy(
    PocketChefContract.connect(owner),
    [],
    {
      unsafeAllow: ["constructor", "delegatecall"],
    }
  )) as PocketChef;

  /**
   * @dev Deploy contract
   */
  const PocketRegistryContract = await ethers.getContractFactory(
    "PocketRegistry"
  );
  const Registry = (await upgrades.deployProxy(
    PocketRegistryContract.connect(owner),
    [],
    {
      unsafeAllow: ["constructor"],
    }
  )) as PocketRegistry;

  /**
   * @dev Deploy contract
   */
  const PocketVaultContract = await ethers.getContractFactory("PocketVault");
  const Vault = (await upgrades.deployProxy(
    PocketVaultContract.connect(owner),
    [],
    {
      unsafeAllow: ["constructor"],
    }
  )) as PocketVault;

  /**
   * @dev Configure registry
   */
  await Registry.connect(owner).grantRole(
    await Registry.OPERATOR(),
    operator.address
  );
  await Registry.connect(owner).grantRole(
    await Registry.RELAYER(),
    Chef.address
  );
  await Registry.connect(owner).grantRole(
    await Registry.RELAYER(),
    Vault.address
  );

  /**
   * @dev Whitelist addresses
   */
  await Registry.whitelistAddress(
    "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
    true
  );
  await Registry.whitelistAddress(
    "0x55d398326f99059fF775485246999027B3197955", // USDT
    true
  );
  await Registry.whitelistAddress(
    "0x2170ed0880ac9a755fd29b2688956bd959f933f8", // ETH
    true
  );
  await Registry.whitelistAddress(
    "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", // BTCB
    true
  );
  await Registry.whitelistAddress(
    "0xbf5140a22578168fd562dccf235e5d43a02ce9b1", // Uniswap
    true
  );
  await Registry.whitelistAddress(
    "0x5Dc88340E1c5c6366864Ee415d6034cadd1A9897", // Universal router
    true
  );
  await Registry.whitelistAddress(
    "0x10ED43C718714eb63d5aA57B78B54704E256024E", // PancakeSwap router v2
    true
  );
  await Registry.whitelistAddress(
    "0x1b81D678ffb9C0263b24A97847620C99d213eB14", // PancakeSwap router v3
    true
  );
  await Registry.whitelistAddress(
    "0x000000000022d473030f116ddee9f6b43ac78ba3", // permit2
    true
  );

  /**
   * @dev Linking components
   */
  await Vault.connect(owner).setRegistry(Registry.address);
  await Vault.connect(owner).setPermit2(
    "0x000000000022d473030f116ddee9f6b43ac78ba3"
  );
  await Vault.setQuoter(
    "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
    "0x78D78E420Da98ad378D7799bE8f4AF69033EB077"
  );
  await Vault.setQuoter(
    "0x5Dc88340E1c5c6366864Ee415d6034cadd1A9897",
    "0x78D78E420Da98ad378D7799bE8f4AF69033EB077"
  );
  await Vault.initEtherman("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c");

  await Chef.connect(owner).setRegistry(Registry.address);
  await Chef.connect(owner).setVault(Vault.address);

  /**
   * @dev return
   */
  return {
    Time: time,
    Provider: ethers.provider,
    MockedERC20,
    Registry,
    Vault,
    Chef,
    owner,
    owner2,
    operator,
    Multicall3,
    BTCBOwner,
    QuoterAddress: "0x78D78E420Da98ad378D7799bE8f4AF69033EB077",
    WBNBAddress: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    UniswapAddress: "0xBf5140A22578168FD562DCcF235E5D43A02ce9B1",
    USDTAddress: "0x55d398326f99059fF775485246999027B3197955",
    BTCBAddress: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
    ETHAddress: "0x2170ed0880ac9a755fd29b2688956bd959f933f8",
    RouterAddress: "0x5Dc88340E1c5c6366864Ee415d6034cadd1A9897",
    Permit2Address: "0x000000000022d473030f116ddee9f6b43ac78ba3",
    PancakeSwapRouterV2: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    PancakeSwapRouterV3: "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
  };
}
