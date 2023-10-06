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
    "0x5300000000000000000000000000000000000004", // WETH
    true
  );
  await Registry.whitelistAddress(
    "0x5868B5394DEcbE28185879Cd6E63Ab7560FFf2D8", // BOX
    true
  );
  await Registry.whitelistAddress(
    "0xD9692f1748aFEe00FACE2da35242417dd05a8615", // GHO
    true
  );
  await Registry.whitelistAddress(
    "0x9c53Fc766dC0447dd15B48647e83Ca8621Ae3493", // POCKET
    true
  );
  await Registry.whitelistAddress(
    "0x59a662Ed724F19AD019307126CbEBdcF4b57d6B1", // router v3
    true
  );
  await Registry.whitelistAddress(
    "0xF4EE7c4bDd43F6b5E509204B375E9512e4110C15", // router v2
    true
  );

  /**
   * @dev Linking components
   */
  await Vault.setRegistry(Registry.address);
  await Vault.setQuoter(
    "0x59a662Ed724F19AD019307126CbEBdcF4b57d6B1",
    "0x805488DaA81c1b9e7C5cE3f1DCeA28F21448EC6A"
  );
  await Vault.initEtherman("0x5300000000000000000000000000000000000004");

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
    RouterAddress: "0x59a662Ed724F19AD019307126CbEBdcF4b57d6B1",
    RouterV2Address: "0xF4EE7c4bDd43F6b5E509204B375E9512e4110C15",
    WETH: "0x5300000000000000000000000000000000000004",
    POCKET: "0x5868B5394DEcbE28185879Cd6E63Ab7560FFf2D8",
    BOX: "0x9c53Fc766dC0447dd15B48647e83Ca8621Ae3493",
    GHO: "0xD9692f1748aFEe00FACE2da35242417dd05a8615",
  };
}

describe("[scroll_sepolia]", function () {
  let fixtures: Awaited<ReturnType<typeof deployFixtures>>;
  let toBeCreatedPocketData: Params.CreatePocketParamsStruct;

  before(async () => {
    fixtures = await loadFixture(deployFixtures);

    toBeCreatedPocketData = {
      id: "test-swap-pocket",
      owner: fixtures.owner.address,
      ammRouterAddress: fixtures.RouterAddress,
      baseTokenAddress: fixtures.WETH,
      ammRouterVersion: "2",
      targetTokenAddress: fixtures.GHO,
      startAt: parseInt(
        (new Date().getTime() / 1000 + 1000).toString()
      ).toString(),
      batchVolume: ethers.utils.parseEther("0.000001"),
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

  it("[auto_investment] should: should work with router v2", async function () {
    const { Time, Chef, Registry, owner, operator, RouterV2Address } = fixtures;

    const data = {
      ...toBeCreatedPocketData,
      id: "test-swap-pocket-v2",
      ammRouterAddress: RouterV2Address,
      ammRouterVersion: "1",
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
      parseInt((new Date().getTime() / 1000 + 2000).toString())
    );

    await Chef.connect(operator).tryMakingDCASwap(data.id, 3000, 0);

    /// @dev Pocket has been closed after closing position
    const pocket = await Registry.pockets(data.id);
    expect(pocket.status).eq(3);
  });

  it("[auto_investment] should: should work with router v3", async function () {
    const { Time, Chef, Registry, owner, operator, RouterAddress } = fixtures;

    const data = {
      ...toBeCreatedPocketData,
      startAt: parseInt(
        (new Date().getTime() / 1000 + 2500).toString()
      ).toString(),
      ammRouterVersion: "2",
      ammRouterAddress: RouterAddress,
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

    await Chef.connect(operator).tryMakingDCASwap(data.id, 3000, 0);

    /// @dev Pocket has been closed after closing position
    const pocket = await Registry.pockets(data.id);
    expect(pocket.status).eq(3);
  });

  it("[quoter] should: BOX/WETH on RouterV3 should work properly", async () => {
    const { Vault, WETH, BOX, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      WETH,
      BOX,
      RouterAddress,
      toBeCreatedPocketData.batchVolume,
      3000
    );

    expect(amountIn).eq(toBeCreatedPocketData.batchVolume);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  it("[quoter] should: POCKET/WETH on RouterV3 should work properly", async () => {
    const { Vault, WETH, POCKET, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      WETH,
      POCKET,
      RouterAddress,
      toBeCreatedPocketData.batchVolume,
      3000
    );

    expect(amountIn).eq(toBeCreatedPocketData.batchVolume);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });
  it("[quoter] should: GHO/WETH on RouterV3 should work properly", async () => {
    const { Vault, WETH, GHO, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      WETH,
      GHO,
      RouterAddress,
      toBeCreatedPocketData.batchVolume,
      3000
    );

    expect(amountIn).eq(toBeCreatedPocketData.batchVolume);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });
  //
  it("[auto_investment] should: integration test should work", async () => {
    const { Time, owner } = fixtures;

    const Addresses = {
      PocketVault: "0x6000e8c798b53c2bA7185B2cFde1DAA718369370",
      PocketRegistry: "0x5D785A46c0C17E7Eea91fa637D6Dd77a56EA6d1F",
      PocketChef: "0x7DbD520FF867c6b0c3bEeD1eC1E969C372895983",
      Multicall3: "0x22cd36eF909B5A3e80cf8A02e1f2BFB2256E731F",
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

    expect(
      await Registry.allowedInteractiveAddresses(
        toBeCreatedPocketData.ammRouterAddress
      )
    ).eq(true);
    expect(
      await Registry.allowedInteractiveAddresses(
        toBeCreatedPocketData.targetTokenAddress
      )
    ).eq(true);

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

    await Chef.connect(signer).tryMakingDCASwap(data.id, 3000, 0);

    /// @dev Pocket has been closed after closing position
    const pocket = await Registry.pockets(data.id);
    expect(pocket.status).eq(3);
  });
});
