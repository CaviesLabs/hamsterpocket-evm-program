import { ethers, upgrades } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { BigNumber } from "ethers";

import {
  PocketChef,
  PocketVault,
  PocketRegistry,
  Multicall3,
  MockedERC20,
  PocketChef__factory,
  PocketRegistry__factory,
} from "../typechain-types";
import { Params } from "../typechain-types/contracts/PocketChef";
import { expect } from "chai";
import exp from "constants";

export async function deployFixtures() {
  const [owner, owner2, operator] = await ethers.getSigners();

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
    Registry.OPERATOR(),
    operator.address
  );
  await Registry.connect(owner).grantRole(Registry.RELAYER(), Chef.address);
  await Registry.connect(owner).grantRole(Registry.RELAYER(), Vault.address);

  /**
   * @dev Whitelist addresses
   */
  await Registry.whitelistAddress(
    "0x1c232f01118cb8b424793ae03f870aa7d0ac7f77", // V2 Router
    true
  );
  await Registry.whitelistAddress(
    "0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb", // GNO
    true
  );
  await Registry.whitelistAddress(
    "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d", // WXDAI
    true
  );
  await Registry.whitelistAddress(
    "0x8e5bBbb09Ed1ebdE8674Cda39A0c169401db4252", // WBTC
    true
  );
  await Registry.whitelistAddress(
    "0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1", // WETH
    true
  );

  /**
   * @dev Linking components
   */
  await Vault.connect(owner).setRegistry(Registry.address);
  await Vault.initEtherman("0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d");

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
    RouterAddress: "0x1c232f01118cb8b424793ae03f870aa7d0ac7f77",
    WXDAI: "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d",
    WBTC: "0x8e5bBbb09Ed1ebdE8674Cda39A0c169401db4252",
    WETH: "0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1",
    GNO: "0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb",
  };
}

describe("[gnosis]", function () {
  let fixtures: Awaited<ReturnType<typeof deployFixtures>>;
  let toBeCreatedPocketData: Params.CreatePocketParamsStruct;

  before(async () => {
    fixtures = await loadFixture(deployFixtures);

    toBeCreatedPocketData = {
      id: "test-swap-pocket",
      owner: fixtures.owner.address,
      ammRouterAddress: fixtures.RouterAddress,
      baseTokenAddress: fixtures.WXDAI,
      ammRouterVersion: "1",
      targetTokenAddress: fixtures.GNO,
      startAt: parseInt(
        (new Date().getTime() / 1000 + 1).toString()
      ).toString(),
      batchVolume: ethers.constants.WeiPerEther.div(BigNumber.from("10")), // 0.1 BNB per batch
      stopConditions: [
        {
          operator: "0",
          value: parseInt(
            (new Date().getTime() / 1000 + 3600).toString()
          ).toString(),
        },
      ],
      frequency: "3600",
      openingPositionCondition: {
        value0: "0",
        value1: "0",
        operator: "0",
      },
      takeProfitCondition: {
        stopType: "0",
        value: "0",
      },
      stopLossCondition: {
        stopType: "0",
        value: "0",
      },
    };
  });

  it("[auto_investment] should: should work with pcs router v2", async function () {
    const { Time, Chef, Registry, owner, operator, RouterAddress } = fixtures;

    const data = {
      ...toBeCreatedPocketData,
      stopConditions: [
        {
          operator: "0",
          value: parseInt(
            (new Date().getTime() / 1000 + 60010).toString()
          ).toString(),
        },
        {
          operator: "1",
          value: BigNumber.from("1"),
        },
        {
          operator: "2",
          value: ethers.constants.WeiPerEther,
        },
        {
          operator: "3",
          value: ethers.constants.WeiPerEther,
        },
      ],
    };

    await Chef.connect(owner).createPocketAndDepositEther(data, {
      value: ethers.constants.WeiPerEther,
    });

    await Time.increaseTo(
      parseInt((new Date().getTime() / 1000 + 70000).toString())
    );

    await Chef.connect(operator).tryMakingDCASwap(data.id, 3000);

    /// @dev Pocket has been closed after closing position
    const pocket = await Registry.pockets(data.id);
    expect(pocket.status).eq(3);

    await Chef.connect(owner).withdraw(data.id);
    const pocketState = await Registry.pockets(data.id);

    expect(pocketState.status).eq(4);
    expect(pocketState.baseTokenBalance).eq(0);
    expect(pocketState.targetTokenBalance).eq(0);
  });

  it("[quoter] should: GNO/XWDAI on RouterV2 should work properly", async () => {
    const { Vault, WXDAI, GNO, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      WXDAI,
      GNO,
      RouterAddress,
      ethers.constants.WeiPerEther,
      0
    );

    expect(amountIn).eq(ethers.constants.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  it("[quoter] should: WBTC/WXDAI on RouterV2 should work properly", async () => {
    const { Vault, WXDAI, WBTC, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      WXDAI,
      WBTC,
      RouterAddress,
      ethers.constants.WeiPerEther,
      0
    );

    expect(amountIn).eq(ethers.constants.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  it("[quoter] should: WETH/WXDAI on RouterV2 should work properly", async () => {
    const { Vault, WXDAI, WETH, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      WXDAI,
      WETH,
      RouterAddress,
      ethers.constants.WeiPerEther,
      0
    );

    expect(amountIn).eq(ethers.constants.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  it("[auto_investment] should: integration test should work", async () => {
    const { Time } = fixtures;

    const Addresses = {
      PocketVault: "0xaC85009E1A69f634b7b77EFC45dEBf66993d3661",
      PocketRegistry: "0xa5c78d241254eB6566C178Bf359b219F4bC7Ac9e",
      PocketChef: "0xf406C8ef305a56ddD4E05f2cF9DC72C5fe9884ad",
      Multicall3: "0x0B843Dd651D048185Cd021828cDA95542a61742c",
    };

    const signer = await ethers.getImpersonatedSigner(
      "0xC988c21E794B0ad2008EAB90371d30eAd2c0c6f8"
    );

    /**
     * @dev Deploy contract
     */
    const Chef = PocketChef__factory.connect(Addresses.PocketChef, signer);

    /**
     * @dev Deploy contract
     */
    const Registry = PocketRegistry__factory.connect(
      Addresses.PocketRegistry,
      signer
    );

    /**
     * @dev Deploy contract
     */
    const data = {
      id: "testpocket",
      owner: "0xC988c21E794B0ad2008EAB90371d30eAd2c0c6f8",
      ammRouterAddress: "0x1c232f01118cb8b424793ae03f870aa7d0ac7f77",
      baseTokenAddress: "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d",
      targetTokenAddress: "0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb",
      ammRouterVersion: "1",
      startAt: parseInt(
        (new Date().getTime() / 1000 + 70005).toString()
      ).toString(),
      batchVolume: ethers.constants.WeiPerEther, // 0.1 BNB per batch
      stopConditions: [
        {
          operator: "0",
          value: parseInt(
            (new Date().getTime() / 1000 + 3000).toString()
          ).toString(),
        },
        {
          operator: "1",
          value: BigNumber.from("1"),
        },
        {
          operator: "2",
          value: ethers.constants.WeiPerEther,
        },
        {
          operator: "3",
          value: ethers.constants.WeiPerEther,
        },
      ],
      frequency: "3600",
      openingPositionCondition: {
        value0: ethers.constants.WeiPerEther,
        value1: "0",
        operator: "0",
      },
      takeProfitCondition: {
        stopType: "1",
        value: ethers.constants.WeiPerEther,
      },
      stopLossCondition: {
        stopType: "1",
        value: ethers.constants.WeiPerEther,
      },
    };

    await Chef.connect(signer).createPocketAndDepositEther(data, {
      value: ethers.constants.WeiPerEther,
    });

    await Time.increaseTo(
      parseInt((new Date().getTime() / 1000 + 100000).toString())
    );

    await Chef.connect(signer).tryMakingDCASwap(data.id, 3000);

    /// @dev Pocket has been closed after closing position
    const pocket = await Registry.pockets(data.id);
    expect(pocket.status).eq(3);

    await Chef.connect(signer).withdraw(data.id);
    const pocketState = await Registry.pockets(data.id);

    expect(pocketState.status).eq(4);
    expect(pocketState.baseTokenBalance).eq(0);
    expect(pocketState.targetTokenBalance).eq(0);
  });
});
