// We define a fixture to reuse the same setup in every test.
// We use loadFixture to run this setup once, snapshot that state,
// and reset Hardhat Network to that snapshopt in every test.
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers, upgrades } from "hardhat";
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
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  );
  const owner2 = await ethers.getImpersonatedSigner(
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  );
  const operator = await ethers.getImpersonatedSigner(
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
  );

  /**
   * @dev Deploy multicall3
   */
  const Multicall3Contract = await ethers.getContractFactory("Multicall3");
  const Multicall3 = (await Multicall3Contract.deploy()) as Multicall3;

  /**
   * @dev Initializes mocked erc contracts
   */
  const MockedERC20Contract = await ethers.getContractFactory("MockedERC20");
  const MockedERC20 = (await MockedERC20Contract.deploy()) as MockedERC20;

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
  const Chef = (await upgrades.deployProxy(PocketChefContract, [], {
    unsafeAllowCustomTypes: true,
  })) as PocketChef;

  /**
   * @dev Deploy contract
   */
  const PocketRegistryContract = await ethers.getContractFactory(
    "PocketRegistry"
  );
  const Registry = (await upgrades.deployProxy(PocketRegistryContract, [], {
    unsafeAllowCustomTypes: true,
  })) as PocketRegistry;

  /**
   * @dev Deploy contract
   */
  const PocketVaultContract = await ethers.getContractFactory("PocketVault");
  const Vault = (await upgrades.deployProxy(PocketVaultContract, [], {
    unsafeAllowCustomTypes: true,
  })) as PocketVault;

  /**
   * @dev Configure registry
   */
  await Registry.connect(owner).grantRole(
    Registry.OPERATOR(),
    operator.address
  );
  await Registry.connect(owner).grantRole(Registry.RELAYER(), Chef.address);
  await Registry.connect(owner).grantRole(Registry.RELAYER(), Vault.address);

  /**
   * @dev Whitelist addresses
   */
  await Registry.whitelistAddress(
    "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    true
  );
  await Registry.whitelistAddress(
    "0x55d398326f99059fF775485246999027B3197955",
    true
  );

  /**
   * @dev Linking components
   */
  await Vault.connect(owner).setRegistry(Registry.address);
  await Chef.connect(owner).setRegistry(Registry.address);
  await Chef.connect(owner).setVault(Vault.address);

  /**
   * @dev return
   */
  return { MockedERC20, Vault, Chef, owner, owner2, operator, Multicall3 };
}
