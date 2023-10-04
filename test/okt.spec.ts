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
    "0xc97b81B8a38b9146010Df85f1Ac714aFE1554343", // V2 Router
    true
  );
  await Registry.whitelistAddress(
    "0x8F8526dbfd6E38E3D8307702cA8469Bae6C56C15", // WOKT
    true
  );
  await Registry.whitelistAddress(
    "0x97B05e6C5026D5480c4B6576A8699866eb58003b", // stOKT
    true
  );
  await Registry.whitelistAddress(
    "0x382bB369d343125BfB2117af9c149795C6C65C50", // USDT
    true
  );

  /**
   * @dev Linking components
   */
  await Vault.connect(owner).setRegistry(Registry.address);
  await Vault.initEtherman("0x8F8526dbfd6E38E3D8307702cA8469Bae6C56C15");

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
    RouterAddress: "0xc97b81B8a38b9146010Df85f1Ac714aFE1554343",
    WOKT: "0x8F8526dbfd6E38E3D8307702cA8469Bae6C56C15",
    stOKT: "0x97B05e6C5026D5480c4B6576A8699866eb58003b",
    USDT: "0x382bB369d343125BfB2117af9c149795C6C65C50",
  };
}

describe("[okt]", function () {
  let fixtures: Awaited<ReturnType<typeof deployFixtures>>;
  let toBeCreatedPocketData: Params.CreatePocketParamsStruct;

  before(async () => {
    fixtures = await loadFixture(deployFixtures);

    toBeCreatedPocketData = {
      id: "test-swap-pocket",
      owner: fixtures.owner.address,
      ammRouterAddress: fixtures.RouterAddress,
      baseTokenAddress: fixtures.WOKT,
      ammRouterVersion: "1",
      targetTokenAddress: fixtures.USDT,
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

    await Chef.connect(operator).tryMakingDCASwap(data.id, 3000, 0);

    /// @dev Pocket has been closed after closing position
    const pocket = await Registry.pockets(data.id);
    expect(pocket.status).eq(3);
  });

  it("[quoter] should: USDT/WOKT on RouterV2 should work properly", async () => {
    const { Vault, WOKT, USDT, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      USDT,
      WOKT,
      RouterAddress,
      ethers.constants.WeiPerEther,
      0
    );

    expect(amountIn).eq(ethers.constants.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  it("[quoter] should: stOKT/WOKT on RouterV2 should work properly", async () => {
    const { Vault, WOKT, stOKT, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      stOKT,
      WOKT,
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
      PocketVault: "0x76DB16c04F9683288E912e986C3F4EBB52266F1C",
      PocketRegistry: "0x680702fEa71e65DD79cF2114DbAe6b74F676DCc6",
      PocketChef: "0x2B7388Cf467d05f3979dDd3eAD8AfD8a0CE0076c",
      Multicall3: "0x292A7C55443850a30A6BCC17aF306b4Dc8864476",
    };

    const signer = await ethers.getImpersonatedSigner(
      "0x95C7022924A0379FeE2b950DdaE0195F6bC30E13"
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
