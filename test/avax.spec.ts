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
    Registry.OPERATOR(),
    operator.address
  );
  await Registry.connect(owner).grantRole(Registry.RELAYER(), Chef.address);
  await Registry.connect(owner).grantRole(Registry.RELAYER(), Vault.address);

  /**
   * @dev Whitelist addresses
   */
  await Registry.whitelistAddress(
    "0x60aE616a2155Ee3d9A68541Ba4544862310933d4", // V2 Router
    true
  );
  await Registry.whitelistAddress(
    "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // WAVAX
    true
  );
  await Registry.whitelistAddress(
    "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // USDC
    true
  );
  await Registry.whitelistAddress(
    "0x152b9d0FdC40C096757F570A51E494bd4b943E50", // BTCB
    true
  );

  /**
   * @dev Linking components
   */
  await Vault.connect(owner).setRegistry(Registry.address);
  await Vault.initEtherman("0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7");

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
    RouterAddress: "0x60aE616a2155Ee3d9A68541Ba4544862310933d4",
    WAVAX: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    BTCB: "0x152b9d0FdC40C096757F570A51E494bd4b943E50",
    USDC: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  };
}

describe("[avaxc]", function () {
  let fixtures: Awaited<ReturnType<typeof deployFixtures>>;
  let toBeCreatedPocketData: Params.CreatePocketParamsStruct;

  before(async () => {
    fixtures = await loadFixture(deployFixtures);

    toBeCreatedPocketData = {
      id: "test-swap-pocket",
      owner: fixtures.owner.address,
      ammRouterAddress: fixtures.RouterAddress,
      baseTokenAddress: fixtures.WAVAX,
      ammRouterVersion: "1",
      targetTokenAddress: fixtures.USDC,
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

  it("[auto_investment] should: should work with traderjoe router v2", async function () {
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
  });

  it("[quoter] should: USDC/WAVAX on RouterV2 should work properly", async () => {
    const { Vault, WAVAX, USDC, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      USDC,
      WAVAX,
      RouterAddress,
      ethers.constants.WeiPerEther,
      0
    );

    expect(amountIn).eq(ethers.constants.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  it("[quoter] should: BTCB/WAVAX on RouterV2 should work properly", async () => {
    const { Vault, WAVAX, BTCB, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      WAVAX,
      BTCB,
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
        (new Date().getTime() / 1000 + 70000 + 20).toString()
      ).toString(),
      stopConditions: [
        {
          operator: "0",
          value: parseInt(
            (new Date().getTime() / 1000 + 70000 + 3000).toString()
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
      parseInt((new Date().getTime() / 1000 + 70000 + 100).toString())
    );

    await Chef.connect(signer).tryMakingDCASwap(data.id, 3000);

    /// @dev Pocket has been closed after closing position
    const pocket = await Registry.pockets(data.id);
    expect(pocket.status).eq(3);
  });
});
