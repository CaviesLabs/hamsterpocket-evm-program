import { ethers, upgrades } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { BigNumber } from "ethers";

import {
  PocketChef,
  PocketVault,
  PocketRegistry,
  Multicall3,
  PocketChef__factory,
  PocketRegistry__factory,
} from "../typechain-types";
import { Params } from "../typechain-types/contracts/PocketChef";
import { expect } from "chai";
import { ensureTransaction } from "../scripts/pocket/utils/transaction";

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
  await Registry.grantRole(
    await Registry.OPERATOR(),
    "0x95C7022924A0379FeE2b950DdaE0195F6bC30E13" /// OPERATOR
  );
  await Registry.grantRole(
    await Registry.OPERATOR(),
    operator.address /// OPERATOR
  );
  await Registry.grantRole(
    await Registry.OPERATOR(),
    Multicall3.address /// OPERATOR
  );
  await Registry.grantRole(await Registry.RELAYER(), Chef.address);
  await Registry.grantRole(await Registry.RELAYER(), Vault.address);

  /**
   * @dev Whitelist addresses
   */
  await Registry.whitelistAddress(
    "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8", // WMNT
    true
  );
  await Registry.whitelistAddress(
    "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE", // USDT
    true
  );
  await Registry.whitelistAddress(
    "0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111", // ETH
    true
  );
  await Registry.whitelistAddress(
    "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9", // USDC
    true
  );
  await Registry.whitelistAddress(
    "0x97174506AafcC846A40832719bD8899a588Bd05c", // RealBenZ
    true
  );
  await Registry.whitelistAddress(
    "0x319B69888b0d11cEC22caA5034e25FfFBDc88421", // router v3
    true
  );

  /**
   * @dev Linking components
   */
  await Vault.setRegistry(Registry.address);
  await Vault.setQuoter(
    "0x319B69888b0d11cEC22caA5034e25FfFBDc88421",
    "0xc4aaDc921E1cdb66c5300Bc158a313292923C0cb"
  );
  await Vault.initEtherman("0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8");

  await Chef.setRegistry(Registry.address);
  await Chef.setVault(Vault.address);

  /**
   * @dev return
   */
  return {
    Time: time,
    Provider: ethers.provider,
    Registry,
    Vault,
    Chef,
    owner,
    owner2,
    operator,
    Multicall3,
    RouterAddress: "0x319B69888b0d11cEC22caA5034e25FfFBDc88421",
    WMNT: "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8",
    USDT: "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE",
    ETH: "0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111",
    RealBenZ: "0x97174506AafcC846A40832719bD8899a588Bd05c",
    USDC: "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9",
  };
}

describe("[mantle]", function () {
  let fixtures: Awaited<ReturnType<typeof deployFixtures>>;
  let toBeCreatedPocketData: Params.CreatePocketParamsStruct;

  before(async () => {
    fixtures = await loadFixture(deployFixtures);

    toBeCreatedPocketData = {
      id: "test-swap-pocket",
      owner: fixtures.owner.address,
      ammRouterAddress: fixtures.RouterAddress,
      baseTokenAddress: fixtures.WMNT,
      ammRouterVersion: "2",
      targetTokenAddress: fixtures.ETH,
      startAt: parseInt(
        (new Date().getTime() / 1000 + 1000).toString()
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

  it("[auto_investment] should: should work with router v3", async function () {
    const { Time, Chef, Registry, owner, operator, RouterAddress } = fixtures;

    const data = {
      ...toBeCreatedPocketData,
      stopConditions: [
        {
          operator: "0",
          value: parseInt(
            (new Date().getTime() / 1000 + 5000).toString()
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
      parseInt((new Date().getTime() / 1000 + 6000).toString())
    );

    await Chef.connect(operator).tryMakingDCASwap(data.id, 500, 0);

    /// @dev Pocket has been closed after closing position
    const pocket = await Registry.pockets(data.id);
    expect(pocket.status).eq(3);
  });

  it("[quoter] should: ETH/WMNT on RouterV3 should work properly", async () => {
    const { Vault, WMNT, ETH, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      ETH,
      WMNT,
      RouterAddress,
      ethers.constants.WeiPerEther,
      500
    );

    expect(amountIn).eq(ethers.constants.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  it("[quoter] should: USDT/WMNT on RouterV3 should work properly", async () => {
    const { Vault, WMNT, USDT, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      WMNT,
      USDT,
      RouterAddress,
      ethers.constants.WeiPerEther,
      500
    );

    expect(amountIn).eq(ethers.constants.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  it("[quoter] should: RealBenZ/WMNT on RouterV3 should work properly", async () => {
    const { Vault, WMNT, RealBenZ, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      WMNT,
      RealBenZ,
      RouterAddress,
      ethers.constants.WeiPerEther,
      10000
    );

    expect(amountIn).eq(ethers.constants.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  it("[quoter] should: USDC/WMNT on RouterV3 should work properly", async () => {
    const { Vault, WMNT, USDC, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      WMNT,
      USDC,
      RouterAddress,
      ethers.constants.WeiPerEther,
      500
    );

    expect(amountIn).eq(ethers.constants.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });
  //
  it("[auto_investment] should: integration test should work", async () => {
    const { Time, owner } = fixtures;

    const Addresses = {
      PocketVault: "0xf0C82C47B95143e14633A7EA9B5849fE7Ea9F8dA",
      PocketRegistry: "0xf5196199a3C0e1dd441488f0CFFCAb65d47f1166",
      PocketChef: "0xDe46E6Ce41421C08c342b9cCddf9DB2b0E11B9b1",
      Multicall3: "0xd54eC92F1e27E707773F4dF2ba697f15264f6690",
    };

    await owner.sendTransaction({
      to: "0x95C7022924A0379FeE2b950DdaE0195F6bC30E13",
      value: ethers.constants.WeiPerEther.mul(10),
    });

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
        (new Date().getTime() / 1000 + 6500).toString()
      ).toString(),
      stopConditions: [
        {
          operator: "0",
          value: parseInt(
            (new Date().getTime() / 1000 + 6000).toString()
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
      parseInt((new Date().getTime() / 1000 + 7000).toString())
    );

    await Chef.connect(signer).tryMakingDCASwap(data.id, 500, 0);

    /// @dev Pocket has been closed after closing position
    const pocket = await Registry.pockets(data.id);
    expect(pocket.status).eq(3);
  });
});
