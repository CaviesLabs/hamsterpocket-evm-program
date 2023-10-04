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
  PocketVault__factory,
} from "../typechain-types";
import { Params } from "../typechain-types/contracts/PocketChef";
import { expect } from "chai";

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
    "0xf9c5E4f6E627201aB2d6FB6391239738Cf4bDcf9", // V2 Router
    true
  );
  await Registry.whitelistAddress(
    "0x951857744785E80e2De051c32EE7b25f9c458C42", // W0x
    true
  );
  await Registry.whitelistAddress(
    "0x17476dc3eda45aD916cEAdDeA325B240A7FB259D", // XTT
    true
  );
  await Registry.whitelistAddress(
    "0x374a7CE8Fda576a92e3A17c47f47C6B7AEcEF39D", // CHUPA
    true
  );

  /**
   * @dev Linking components
   */
  await Vault.connect(owner).setRegistry(Registry.address);
  await Vault.initEtherman("0x951857744785E80e2De051c32EE7b25f9c458C42");

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
    RouterAddress: "0xf9c5E4f6E627201aB2d6FB6391239738Cf4bDcf9",
    WXDC: "0x951857744785E80e2De051c32EE7b25f9c458C42",
    XTT: "0x17476dc3eda45aD916cEAdDeA325B240A7FB259D",
    CHUPA: "0x374a7CE8Fda576a92e3A17c47f47C6B7AEcEF39D",
  };
}

describe("[xdc]", function () {
  let fixtures: Awaited<ReturnType<typeof deployFixtures>>;
  let toBeCreatedPocketData: Params.CreatePocketParamsStruct;

  before(async () => {
    fixtures = await loadFixture(deployFixtures);

    toBeCreatedPocketData = {
      id: "test-swap-pocket",
      owner: fixtures.owner.address,
      ammRouterAddress: fixtures.RouterAddress,
      baseTokenAddress: fixtures.WXDC,
      ammRouterVersion: "1",
      targetTokenAddress: fixtures.XTT,
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
            (new Date().getTime() / 1000 + 4000).toString()
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
      parseInt((new Date().getTime() / 1000 + 2).toString())
    );

    await Chef.connect(operator).tryMakingDCASwap(data.id, 3000, 0);

    /// @dev Pocket has been closed after closing position
    const pocket = await Registry.pockets(data.id);
    expect(pocket.status).eq(3);
  });

  it("[quoter] should: XTT/WXDC on RouterV2 should work properly", async () => {
    const { Vault, XTT, WXDC, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      XTT,
      WXDC,
      RouterAddress,
      ethers.constants.WeiPerEther,
      0
    );

    expect(amountIn).eq(ethers.constants.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  it("[quoter] should: CHUPA/WXDC on RouterV2 should work properly", async () => {
    const { Vault, CHUPA, WXDC, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      CHUPA,
      WXDC,
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
      PocketVault: "0x8500d55F0f49FFfA33cCBdbcF171eD50a7bcA26E",
      PocketRegistry: "0x8FbaCBb3B09c876cA0AD0939A746935456D5793F",
      PocketChef: "0x2E2eEFcD211658035b77AC4D1a4c40Be7174B441",
      Multicall3: "0x9ac25725B8465E70cc2458592C9104c0f06C8e87",
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
      ...toBeCreatedPocketData,
      owner: signer.address,
      startAt: parseInt(
        (new Date().getTime() / 1000 + 20).toString()
      ).toString(),
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
    };

    await Chef.connect(signer).createPocketAndDepositEther(data, {
      value: ethers.constants.WeiPerEther,
    });

    await Time.increaseTo(
      parseInt((new Date().getTime() / 1000 + 100).toString())
    );

    await Chef.connect(signer).tryMakingDCASwap(data.id, 3000, 0);

    /// @dev Pocket has been closed after closing position
    const pocket = await Registry.pockets(data.id);
    expect(pocket.status).eq(3);
  });
});
