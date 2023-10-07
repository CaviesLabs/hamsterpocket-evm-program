import { ethers, upgrades } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import {
  PocketChef,
  PocketVault,
  PocketRegistry,
  Multicall3,
  PocketChef__factory,
  PocketRegistry__factory,
} from "../typechain-types";
import { expect } from "chai";
import { Params } from "../typechain-types/contracts/PocketRegistry";

export async function deployFixtures() {
  const [owner, owner2, operator] = await ethers.getSigners();

  /**
   * @dev Deploy multicall3
   */
  const Multicall3Contract = await ethers.getContractFactory("Multicall3");
  const Multicall3 = (await Multicall3Contract.connect(
    owner,
  ).deploy()) as unknown as Multicall3;

  /**
   * @dev Deploy contract
   */
  const PocketChefContract = await ethers.getContractFactory("PocketChef");
  const Chef = (await upgrades.deployProxy(
    PocketChefContract.connect(owner),
    [],
    {
      unsafeAllow: ["constructor", "delegatecall"],
    },
  )) as unknown as PocketChef;

  /**
   * @dev Deploy contract
   */
  const PocketRegistryContract =
    await ethers.getContractFactory("PocketRegistry");
  const Registry = (await upgrades.deployProxy(
    PocketRegistryContract.connect(owner),
    [],
    {
      unsafeAllow: ["constructor"],
    },
  )) as unknown as PocketRegistry;

  /**
   * @dev Deploy contract
   */
  const PocketVaultContract = await ethers.getContractFactory("PocketVault");
  const Vault = (await upgrades.deployProxy(
    PocketVaultContract.connect(owner),
    [],
    {
      unsafeAllow: ["constructor"],
    },
  )) as unknown as PocketVault;

  /**
   * @dev Configure registry
   */
  await Registry.grantRole(
    await Registry.OPERATOR(),
    "0x95C7022924A0379FeE2b950DdaE0195F6bC30E13", /// OPERATOR
  );
  await Registry.grantRole(
    await Registry.OPERATOR(),
    operator.address, /// OPERATOR
  );
  await Registry.grantRole(
    await Registry.OPERATOR(),
    await Multicall3.getAddress(), /// OPERATOR
  );
  await Registry.grantRole(await Registry.RELAYER(), await Chef.getAddress());
  await Registry.grantRole(await Registry.RELAYER(), await Vault.getAddress());

  /**
   * @dev Whitelist addresses
   */
  await Registry.whitelistAddress(
    "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
    true,
  );
  await Registry.whitelistAddress(
    "0x55d398326f99059fF775485246999027B3197955", // USDT
    true,
  );
  await Registry.whitelistAddress(
    "0x2170ed0880ac9a755fd29b2688956bd959f933f8", // ETH
    true,
  );
  await Registry.whitelistAddress(
    "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", // BTCB
    true,
  );
  await Registry.whitelistAddress(
    "0xbf5140a22578168fd562dccf235e5d43a02ce9b1", // Uniswap
    true,
  );
  await Registry.whitelistAddress(
    "0x5Dc88340E1c5c6366864Ee415d6034cadd1A9897", // Universal router
    true,
  );
  await Registry.whitelistAddress(
    "0x10ED43C718714eb63d5aA57B78B54704E256024E", // PancakeSwap router v2
    true,
  );
  await Registry.whitelistAddress(
    "0x1b81D678ffb9C0263b24A97847620C99d213eB14", // PancakeSwap router v3
    true,
  );
  await Registry.whitelistAddress(
    "0x000000000022d473030f116ddee9f6b43ac78ba3", // permit2
    true,
  );

  /**
   * @dev Linking components
   */
  await Vault.connect(owner).setRegistry(await Registry.getAddress());
  await Vault.connect(owner).setPermit2(
    "0x000000000022d473030f116ddee9f6b43ac78ba3",
  );
  await Vault.setQuoter(
    "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
    "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
  );
  await Vault.setQuoter(
    "0x5Dc88340E1c5c6366864Ee415d6034cadd1A9897",
    "0x78D78E420Da98ad378D7799bE8f4AF69033EB077",
  );
  await Vault.initEtherman("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c");

  await Chef.connect(owner).setRegistry(await Registry.getAddress());
  await Chef.connect(owner).setVault(await Vault.getAddress());
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
    RouterV3Address: "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
    RouterV2Address: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    UniswapV3RouterAddress: "0x5Dc88340E1c5c6366864Ee415d6034cadd1A9897",
    WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    UNI: "0xBf5140A22578168FD562DCcF235E5D43A02ce9B1",
    ETH: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
    BTCB: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
  };
}

describe("[bnb]", function () {
  let fixtures: Awaited<ReturnType<typeof deployFixtures>>;
  let toBeCreatedUNIData: Params.CreatePocketParamsStruct;

  before(async () => {
    fixtures = await loadFixture(deployFixtures);

    toBeCreatedUNIData = {
      id: "test-swap-UNI",
      owner: fixtures.owner.address,
      ammRouterAddress: fixtures.UniswapV3RouterAddress,
      baseTokenAddress: fixtures.WBNB,
      ammRouterVersion: "0",
      targetTokenAddress: fixtures.BTCB,
      startAt: parseInt(
        (new Date().getTime() / 1000 + 1000).toString(),
      ).toString(),
      batchVolume: ethers.parseEther("0.00001"),
      stopConditions: [
        {
          operator: "0",
          value: parseInt(
            (new Date().getTime() / 1000 + 3600).toString(),
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
    const { Time, Chef, Registry, owner, operator, RouterV2Address } = fixtures;

    const data = {
      ...toBeCreatedUNIData,
      id: "test-swap-UNI-v2",
      ammRouterAddress: RouterV2Address,
      ammRouterVersion: "1",
      stopConditions: [
        {
          operator: "0",
          value: parseInt(
            (new Date().getTime() / 1000 + 5000).toString(),
          ).toString(),
        },
        {
          operator: "1",
          value: BigInt("1"),
        },
        {
          operator: "2",
          value: ethers.WeiPerEther,
        },
        {
          operator: "3",
          value: ethers.WeiPerEther,
        },
      ],
    };

    await Chef.connect(owner).createPocketAndDepositEther(data, {
      value: ethers.WeiPerEther,
    });

    await Time.increaseTo(
      parseInt((new Date().getTime() / 1000 + 2000).toString()),
    );

    await Chef.connect(operator).tryMakingDCASwap(data.id, 3000, 0);

    /// @dev UNI has been closed after closing position
    const UNI = await Registry.pockets(data.id);
    expect(UNI.status).eq(3);
  });

  it("[auto_investment] should: should work with pcs router v3", async function () {
    const { Time, Chef, Registry, owner, operator, RouterV3Address } = fixtures;

    const data = {
      ...toBeCreatedUNIData,
      id: "pcs-v3-test",
      startAt: parseInt(
        (new Date().getTime() / 1000 + 3000).toString(),
      ).toString(),
      ammRouterVersion: "2",
      ammRouterAddress: RouterV3Address,
      stopConditions: [
        {
          operator: "0",
          value: parseInt(
            (new Date().getTime() / 1000 + 5000).toString(),
          ).toString(),
        },
        {
          operator: "1",
          value: BigInt("1"),
        },
        {
          operator: "2",
          value: ethers.WeiPerEther,
        },
        {
          operator: "3",
          value: ethers.WeiPerEther,
        },
      ],
    };

    await Chef.connect(owner).createPocketAndDepositEther(data, {
      value: ethers.WeiPerEther,
    });

    await Time.increaseTo(
      parseInt((new Date().getTime() / 1000 + 3500).toString()),
    );

    await Chef.connect(operator).tryMakingDCASwap(data.id, 500, 0);

    /// @dev UNI has been closed after closing position
    const UNI = await Registry.pockets(data.id);
    expect(UNI.status).eq(3);
  });

  it("[auto_investment] should: should work with uniswap universal router v3", async function () {
    const { Time, Chef, Registry, owner, operator, UniswapV3RouterAddress } =
      fixtures;

    const data = {
      ...toBeCreatedUNIData,
      id: "uni-v3-test",
      startAt: parseInt(
        (new Date().getTime() / 1000 + 4000).toString(),
      ).toString(),
      ammRouterVersion: "0",
      ammRouterAddress: UniswapV3RouterAddress,
      stopConditions: [
        {
          operator: "0",
          value: parseInt(
            (new Date().getTime() / 1000 + 5000).toString(),
          ).toString(),
        },
        {
          operator: "1",
          value: BigInt("1"),
        },
        {
          operator: "2",
          value: ethers.WeiPerEther,
        },
        {
          operator: "3",
          value: ethers.WeiPerEther,
        },
      ],
    };

    await Chef.connect(owner).createPocketAndDepositEther(data, {
      value: ethers.WeiPerEther,
    });

    await Time.increaseTo(
      parseInt((new Date().getTime() / 1000 + 4500).toString()),
    );

    await Chef.connect(operator).tryMakingDCASwap(data.id, 3000, 0);

    /// @dev UNI has been closed after closing position
    const UNI = await Registry.pockets(data.id);
    expect(UNI.status).eq(3);
  });

  it("[quoter] should: ETH/WBNB on RouterV3 should work properly", async () => {
    const { Vault, WBNB, ETH, UniswapV3RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.getCurrentQuote.staticCall(
      WBNB,
      ETH,
      UniswapV3RouterAddress,
      toBeCreatedUNIData.batchVolume,
      3000,
    );

    expect(amountIn).eq(toBeCreatedUNIData.batchVolume);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  it("[quoter] should: UNI/WBNB on RouterV3 should work properly", async () => {
    const { Vault, WBNB, UNI, UniswapV3RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.getCurrentQuote.staticCall(
      WBNB,
      UNI,
      UniswapV3RouterAddress,
      toBeCreatedUNIData.batchVolume,
      3000,
    );

    expect(amountIn).eq(toBeCreatedUNIData.batchVolume);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });
  it("[quoter] should: BTCB/WBNB on RouterV3 should work properly", async () => {
    const { Vault, WBNB, BTCB, UniswapV3RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.getCurrentQuote.staticCall(
      WBNB,
      BTCB,
      UniswapV3RouterAddress,
      toBeCreatedUNIData.batchVolume,
      3000,
    );

    expect(amountIn).eq(toBeCreatedUNIData.batchVolume);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });
  //
  it("[auto_investment] should: integration test should work", async () => {
    const { Time, owner } = fixtures;

    const Addresses = {
      PocketVault: "0xA78c8Da9e3Bac9B790d109Cf9023B3b6dB72b0E0",
      PocketRegistry: "0xf0C82C47B95143e14633A7EA9B5849fE7Ea9F8dA",
      PocketChef: "0x94eC37b16D48Ca4974d589cEF3F6F5964997F4DF",
      Multicall3: "0x83Cb92492667a8334381c95A02007c8bF0811b89",
    };

    await owner.sendTransaction({
      to: "0x95C7022924A0379FeE2b950DdaE0195F6bC30E13",
      value: ethers.WeiPerEther * BigInt(10),
    });

    const signer = await ethers.getImpersonatedSigner(
      "0x95C7022924A0379FeE2b950DdaE0195F6bC30E13",
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
      signer,
    );

    expect(
      await Registry.allowedInteractiveAddresses(
        toBeCreatedUNIData.ammRouterAddress,
      ),
    ).eq(true);
    expect(
      await Registry.allowedInteractiveAddresses(
        toBeCreatedUNIData.targetTokenAddress,
      ),
    ).eq(true);

    /**
     * @dev Deploy contract
     */
    const data = {
      ...toBeCreatedUNIData,
      owner: signer.address,
      startAt: parseInt(
        (new Date().getTime() / 1000 + 6500).toString(),
      ).toString(),
      stopConditions: [
        {
          operator: "0",
          value: parseInt(
            (new Date().getTime() / 1000 + 6000).toString(),
          ).toString(),
        },
        {
          operator: "1",
          value: BigInt("1"),
        },
        {
          operator: "2",
          value: ethers.WeiPerEther,
        },
        {
          operator: "3",
          value: ethers.WeiPerEther,
        },
      ],
    };

    await Chef.connect(signer).createPocketAndDepositEther(data, {
      value: ethers.WeiPerEther,
    });

    await Time.increaseTo(
      parseInt((new Date().getTime() / 1000 + 7000).toString()),
    );

    await Chef.connect(signer).tryMakingDCASwap(data.id, 3000, 0);

    /// @dev UNI has been closed after closing position
    const UNI = await Registry.pockets(data.id);
    expect(UNI.status).eq(3);
  });
});
