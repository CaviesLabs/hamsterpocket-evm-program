import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { deployFixtures } from "./fixtures";
import { Params } from "../typechain-types/contracts/PocketChef";
import { ERC20__factory, IWETH9, IWETH9__factory } from "../typechain-types";

describe("[manage_vault]", async function () {
  let fixtures: Awaited<ReturnType<typeof deployFixtures>>;
  let toBeCreatedPocketData: Params.CreatePocketParamsStruct;

  before(async () => {
    fixtures = await loadFixture(deployFixtures);

    toBeCreatedPocketData = {
      id: "deposited-pocket-data",
      owner: fixtures.owner.address,
      ammRouterVersion: 0,
      ammRouterAddress: fixtures.RouterAddress,
      baseTokenAddress: fixtures.WBNBAddress,
      targetTokenAddress: fixtures.BTCBAddress,
      startAt: parseInt(
        (new Date().getTime() / 1000 + 1000).toString(),
      ).toString(),
      batchVolume: ethers.WeiPerEther / BigInt("10"), // 0.1 BNB per batch
      stopConditions: [
        {
          operator: "0",
          value: parseInt(
            (new Date().getTime() / 1000 + 60000).toString(),
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

  it("[create_and_deposit] should: owner creates and deposits to pocket with native ether", async () => {
    /// @dev Wrap BNB first
    const { Chef, Registry, Multicall3, Vault, WBNBAddress, owner, Provider } =
      fixtures;

    /**
     * @dev Approve first
     */
    const WBNB = new ERC20__factory()
      .connect(owner)
      .attach(WBNBAddress) as IWETH9;

    const beforeBalance = await Provider.getBalance(owner.address);

    const vaultBeforeBalance = await WBNB.balanceOf(await Vault.getAddress());
    expect(Number(vaultBeforeBalance) === 0);

    /**
     * @dev Try multicall
     */
    await Chef.connect(owner).createPocketAndDepositEther(
      { ...toBeCreatedPocketData, id: "createPocketAndDepositEther" },
      { value: ethers.WeiPerEther },
    );

    const afterBalance = await Provider.getBalance(owner.address);
    expect((beforeBalance - afterBalance) / ethers.WeiPerEther === 1n).to.be
      .true;

    const vaultAfterBalance = await WBNB.balanceOf(await Vault.getAddress());
    expect(vaultAfterBalance === ethers.WeiPerEther);

    /**
     * @dev Multiple queries using multicall3
     */
    const [
      { returnData: createdPocketData },
      { returnData: stopConditionsData },
    ] = await Multicall3.aggregate3.staticCall([
      {
        target: await Registry.getAddress(),
        callData: Registry.interface.encodeFunctionData("pockets", [
          "createPocketAndDepositEther",
        ]),
        allowFailure: false,
      },
      {
        target: await Registry.getAddress(),
        callData: Registry.interface.encodeFunctionData("getStopConditionsOf", [
          "createPocketAndDepositEther",
        ]),
        allowFailure: false,
      },
    ]);

    const createdPocket = Registry.interface.decodeFunctionResult(
      "pockets",
      createdPocketData,
    );
    const stopConditions = Registry.interface.decodeFunctionResult(
      "getStopConditionsOf",
      stopConditionsData,
    );

    expect(createdPocket.id).eq("createPocketAndDepositEther");
    expect(createdPocket.baseTokenBalance === ethers.WeiPerEther).to.be.true;
    expect(createdPocket.targetTokenBalance === 0n).to.be.true;
    expect(stopConditions.length).eq(
      toBeCreatedPocketData.stopConditions.length,
    );
  });

  it("[create_and_deposit] should: owner creates and deposits to pocket using multicall", async () => {
    /// @dev Wrap BNB first
    const { Chef, Registry, Multicall3, Vault, WBNBAddress, owner } = fixtures;

    /**
     * @dev Approve first
     */
    const WBNB = new ERC20__factory()
      .connect(owner)
      .attach(WBNBAddress) as IWETH9;
    await WBNB.approve(await Chef.getAddress(), ethers.MaxUint256);

    const WBNBDeposit = IWETH9__factory.connect(WBNBAddress, owner);
    await WBNBDeposit.deposit({ value: ethers.WeiPerEther });

    const beforeBalance = await WBNB.balanceOf(owner.address);
    expect(beforeBalance === ethers.WeiPerEther);

    const vaultBeforeBalance = await WBNB.balanceOf(await Vault.getAddress());
    expect(Number(vaultBeforeBalance) === 0);

    /**
     * @dev Try multicall
     */
    await Chef.connect(owner).multicall([
      Chef.connect(owner).interface.encodeFunctionData("createPocket", [
        toBeCreatedPocketData,
      ]),
      Chef.connect(owner).interface.encodeFunctionData("depositToken", [
        toBeCreatedPocketData.id,
        ethers.WeiPerEther,
      ]),
    ]);

    const afterBalance = await WBNB.balanceOf(owner.address);
    expect(afterBalance === 0n).to.be.true;

    const vaultAfterBalance = await WBNB.balanceOf(await Vault.getAddress());
    expect(vaultAfterBalance === ethers.WeiPerEther);

    /**
     * @dev Multiple queries using multicall3
     */
    const [
      { returnData: createdPocketData },
      { returnData: stopConditionsData },
    ] = await Multicall3.aggregate3.staticCall([
      {
        target: await Registry.getAddress(),
        callData: Registry.interface.encodeFunctionData("pockets", [
          toBeCreatedPocketData.id,
        ]),
        allowFailure: false,
      },
      {
        target: await Registry.getAddress(),
        callData: Registry.interface.encodeFunctionData("getStopConditionsOf", [
          toBeCreatedPocketData.id,
        ]),
        allowFailure: false,
      },
    ]);

    const createdPocket = Registry.interface.decodeFunctionResult(
      "pockets",
      createdPocketData,
    );
    const stopConditions = Registry.interface.decodeFunctionResult(
      "getStopConditionsOf",
      stopConditionsData,
    );

    expect(createdPocket.id).eq(toBeCreatedPocketData.id);
    expect(createdPocket.baseTokenBalance === ethers.WeiPerEther).to.be.true;
    expect(createdPocket.targetTokenBalance === 0n).to.be.true;
    expect(stopConditions.length).eq(
      toBeCreatedPocketData.stopConditions.length,
    );

    expect(createdPocket.totalDepositedBaseAmount).eq(ethers.WeiPerEther);
    expect(createdPocket.totalSwappedBaseAmount).eq(0);
    expect(createdPocket.totalReceivedTargetAmount).eq(0);
    expect(createdPocket.totalClosedPositionInTargetTokenAmount).eq(0);
    expect(createdPocket.totalReceivedFundInBaseTokenAmount).eq(0);
  });

  it("[withdraw] should: owner fails to withdraw an active pocket", async () => {
    const { Chef, owner } = fixtures;

    await expect(
      Chef.connect(owner).withdraw(toBeCreatedPocketData.id),
    ).to.be.revertedWith("Operation error: cannot withdraw pocket fund");
  });

  it("[deposit] should: non-owner fails to deposit to an active pocket", async () => {
    const { Chef, owner2 } = fixtures;

    await expect(
      Chef.connect(owner2).depositToken(
        toBeCreatedPocketData.id,
        ethers.WeiPerEther,
      ),
    ).to.be.revertedWith("Operation error: cannot deposit");
  });

  it("[close_and_withdraw] should: close and withdraw pocket with multicall", async () => {
    const { Chef, Registry, Provider, Multicall3, WBNBAddress, owner } =
      fixtures;

    const WBNB = new ERC20__factory()
      .connect(owner)
      .attach(WBNBAddress) as IWETH9;

    const beforeBalance = await WBNB.balanceOf(owner.address);
    expect(beforeBalance === 0n).to.be.true;

    const beforeNativeBalance = await Provider.getBalance(owner.address);
    expect(beforeNativeBalance).gt(0);

    await Chef.connect(owner).multicall([
      Chef.connect(owner).interface.encodeFunctionData("closePocket", [
        toBeCreatedPocketData.id,
      ]),
      Chef.connect(owner).interface.encodeFunctionData("withdraw", [
        toBeCreatedPocketData.id,
      ]),
    ]);

    /**
     * @dev Multiple queries using multicall3
     */
    const [{ returnData: createdPocketData }] =
      await Multicall3.aggregate3.staticCall([
        {
          target: await Registry.getAddress(),
          callData: Registry.interface.encodeFunctionData("pockets", [
            toBeCreatedPocketData.id,
          ]),
          allowFailure: false,
        },
      ]);

    const createdPocket = Registry.interface.decodeFunctionResult(
      "pockets",
      createdPocketData,
    );

    expect(createdPocket.id).eq(toBeCreatedPocketData.id);
    expect(createdPocket.baseTokenBalance === 0n).to.be.true;
    expect(createdPocket.targetTokenBalance === 0n).to.be.true;
    expect(createdPocket.status.toString()).eq("4"); // changed to withdrawn

    const afterBalance = await WBNB.balanceOf(owner.address);
    expect(afterBalance).eq(0);

    const nativeAfterBalance = await Provider.getBalance(owner.address);
    expect(ethers.WeiPerEther / (nativeAfterBalance - beforeNativeBalance)).eq(
      BigInt(1),
    );

    expect(createdPocket.totalDepositedBaseAmount).eq(ethers.WeiPerEther);
    expect(createdPocket.totalSwappedBaseAmount).eq(0);
    expect(createdPocket.totalReceivedTargetAmount).eq(0);
    expect(createdPocket.totalClosedPositionInTargetTokenAmount).eq(0);
    expect(createdPocket.totalReceivedFundInBaseTokenAmount).eq(0);
  });

  it("[deposit] should: owner fails to deposit to a closed pocket", async () => {
    const { Chef, owner } = fixtures;

    await expect(
      Chef.connect(owner).depositToken(
        toBeCreatedPocketData.id,
        ethers.WeiPerEther,
      ),
    ).to.be.revertedWith("Operation error: cannot deposit");
  });
});
