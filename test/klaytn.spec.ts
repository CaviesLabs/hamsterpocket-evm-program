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
import { Params } from "../typechain-types/contracts/PocketChef";
import { expect } from "chai";

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
  await Registry.connect(owner).grantRole(
    await Registry.OPERATOR(),
    operator.address,
  );
  await Registry.connect(owner).grantRole(
    await Registry.RELAYER(),
    await Chef.getAddress(),
  );
  await Registry.connect(owner).grantRole(
    await Registry.RELAYER(),
    await Vault.getAddress(),
  );

  /**
   * @dev Whitelist addresses
   */
  await Registry.connect(owner).whitelistAddress(
    "0xEf71750C100f7918d6Ded239Ff1CF09E81dEA92D", // V2 Router
    true,
  );
  await Registry.connect(owner).whitelistAddress(
    "0xe4f05A66Ec68B54A58B17c22107b02e0232cC817", // WKLAYTN
    true,
  );
  await Registry.connect(owner).whitelistAddress(
    "0xceE8FAF64bB97a73bb51E115Aa89C17FfA8dD167", // oUSDT
    true,
  );
  await Registry.connect(owner).whitelistAddress(
    "0x946BC715501413B9454BB6A31412A21998763F2D", // KBT
    true,
  );
  await Registry.connect(owner).whitelistAddress(
    "0xCF87f94fD8F6B6f0b479771F10dF672f99eADa63", // CLA
    true,
  );

  /**
   * @dev Linking components
   */
  await Vault.connect(owner).setRegistry(await Registry.getAddress());
  await Vault.connect(owner).initEtherman(
    "0xe4f05A66Ec68B54A58B17c22107b02e0232cC817",
  );

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
    RouterAddress: "0xEf71750C100f7918d6Ded239Ff1CF09E81dEA92D",
    WKLAYTN: "0xe4f05A66Ec68B54A58B17c22107b02e0232cC817",
    oUSDT: "0xceE8FAF64bB97a73bb51E115Aa89C17FfA8dD167",
    KBT: "0x946BC715501413B9454BB6A31412A21998763F2D",
    CLA: "0xCF87f94fD8F6B6f0b479771F10dF672f99eADa63",
  };
}

describe("[klaytn]", function () {
  let fixtures: Awaited<ReturnType<typeof deployFixtures>>;
  let toBeCreatedPocketData: Params.CreatePocketParamsStruct;

  before(async () => {
    fixtures = await loadFixture(deployFixtures);

    toBeCreatedPocketData = {
      id: "test-swap-pocket",
      owner: fixtures.owner.address,
      ammRouterAddress: fixtures.RouterAddress,
      baseTokenAddress: fixtures.WKLAYTN,
      ammRouterVersion: "1",
      targetTokenAddress: fixtures.KBT,
      startAt: parseInt(
        (new Date().getTime() / 1000 + 1).toString(),
      ).toString(),
      batchVolume: ethers.WeiPerEther / BigInt("10"), // 0.1 BNB per batch
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

  it("[auto_investment] should: should work with router v2", async function () {
    const { Time, Chef, Registry, owner, operator } = fixtures;

    const data = {
      ...toBeCreatedPocketData,
      stopConditions: [
        {
          operator: "0",
          value: parseInt(
            (new Date().getTime() / 1000 + 60010).toString(),
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
      parseInt((new Date().getTime() / 1000 + 10).toString()),
    );

    await Chef.connect(operator).tryMakingDCASwap(data.id, 3000, 0);

    /// @dev Pocket has been closed after closing position
    const pocket = await Registry.pockets(data.id);
    expect(pocket.status).eq(3);
  });

  it("[quoter] should: KBT/WKLAYTN on RouterV2 should work properly", async () => {
    const { Vault, WKLAYTN, KBT, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.getCurrentQuote.staticCall(
      KBT,
      WKLAYTN,
      RouterAddress,
      ethers.WeiPerEther,
      0,
    );

    expect(amountIn).eq(ethers.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  it("[quoter] should: oUSDT/WKLAYTN on RouterV2 should work properly", async () => {
    const { Vault, WKLAYTN, oUSDT, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.getCurrentQuote.staticCall(
      WKLAYTN,
      oUSDT,
      RouterAddress,
      ethers.WeiPerEther,
      0,
    );

    expect(amountIn).eq(ethers.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  it("[quoter] should: CLA/WKLAYTN on RouterV2 should work properly", async () => {
    const { Vault, WKLAYTN, CLA, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.getCurrentQuote.staticCall(
      WKLAYTN,
      CLA,
      RouterAddress,
      ethers.WeiPerEther,
      0,
    );

    expect(amountIn).eq(ethers.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });
  //
  it("[auto_investment] should: integration test should work", async () => {
    const { Time } = fixtures;

    const Addresses = {
      PocketVault: "0x5D785A46c0C17E7Eea91fa637D6Dd77a56EA6d1F",
      PocketRegistry: "0x7DbD520FF867c6b0c3bEeD1eC1E969C372895983",
      PocketChef: "0x4599F85F19CF7D508690bd790c5756F0B0059bc0",
      Multicall3: "0x39bE4c5cE17c0FaB9737AE436070Fcd83bf1464C",
    };

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

    /**
     * @dev Deploy contract
     */
    const data = {
      ...toBeCreatedPocketData,
      owner: signer.address,
      startAt: parseInt(
        (new Date().getTime() / 1000 + 20 + 20).toString(),
      ).toString(),
      stopConditions: [
        {
          operator: "0",
          value: parseInt(
            (new Date().getTime() / 1000 + 70000 + 3000).toString(),
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
      parseInt((new Date().getTime() / 1000 + 30 + 100).toString()),
    );

    await Chef.connect(signer).tryMakingDCASwap(data.id, 3000, 0);

    /// @dev Pocket has been closed after closing position
    const pocket = await Registry.pockets(data.id);
    expect(pocket.status).eq(3);
  });
});
