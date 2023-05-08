import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

import { deployFixtures } from "./fixtures";
import { Params } from "../typechain-types/contracts/PocketChef";
import { ERC20__factory, IWETH9__factory } from "../typechain-types";

describe("[manage_vault]", async function () {
  let fixtures: Awaited<ReturnType<typeof deployFixtures>>;
  let toBeCreatedPocketData: Params.CreatePocketParamsStruct;

  before(async () => {
    fixtures = await loadFixture(deployFixtures);

    toBeCreatedPocketData = {
      id: "deposited-pocket-data",
      owner: fixtures.owner.address,
      ammRouterAddress: fixtures.RouterAddress,
      baseTokenAddress: fixtures.WBNBAddress,
      targetTokenAddress: fixtures.BTCBAddress,
      startAt: parseInt(
        (new Date().getTime() / 1000 + 1000).toString()
      ).toString(),
      batchVolume: ethers.constants.WeiPerEther.div(BigNumber.from("10")), // 0.1 BNB per batch
      stopConditions: [
        {
          operator: "0",
          value: parseInt(
            (new Date().getTime() / 1000 + 60000).toString()
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
    const WBNB = new ERC20__factory().connect(owner).attach(WBNBAddress);

    const beforeBalance = await Provider.getBalance(owner.address);

    const vaultBeforeBalance = await WBNB.balanceOf(Vault.address);
    expect(vaultBeforeBalance.eq(ethers.constants.Zero));

    /**
     * @dev Try multicall
     */
    await Chef.connect(owner).createPocketAndDepositEther(
      { ...toBeCreatedPocketData, id: "createPocketAndDepositEther" },
      { value: ethers.constants.WeiPerEther }
    );

    const afterBalance = await Provider.getBalance(owner.address);
    expect(
      beforeBalance.sub(afterBalance).div(ethers.constants.WeiPerEther).eq(1)
    ).to.be.true;

    const vaultAfterBalance = await WBNB.balanceOf(Vault.address);
    expect(vaultAfterBalance.eq(ethers.constants.WeiPerEther));

    /**
     * @dev Multiple queries using multicall3
     */
    const [
      { returnData: createdPocketData },
      { returnData: stopConditionsData },
    ] = await Multicall3.callStatic.aggregate3([
      {
        target: Registry.address,
        callData: Registry.interface.encodeFunctionData("pockets", [
          "createPocketAndDepositEther",
        ]),
        allowFailure: false,
      },
      {
        target: Registry.address,
        callData: Registry.interface.encodeFunctionData("getStopConditionsOf", [
          "createPocketAndDepositEther",
        ]),
        allowFailure: false,
      },
    ]);

    const createdPocket = Registry.interface.decodeFunctionResult(
      "pockets",
      createdPocketData
    );
    const stopConditions = Registry.interface.decodeFunctionResult(
      "getStopConditionsOf",
      stopConditionsData
    );

    expect(createdPocket.id).eq("createPocketAndDepositEther");
    expect(createdPocket.baseTokenBalance.eq(ethers.constants.WeiPerEther)).to
      .be.true;
    expect(createdPocket.targetTokenBalance.eq(ethers.constants.Zero)).to.be
      .true;
    expect(stopConditions.length).eq(
      toBeCreatedPocketData.stopConditions.length
    );
  });

  it("[create_and_deposit] should: owner creates and deposits to pocket using multicall", async () => {
    /// @dev Wrap BNB first
    const { Chef, Registry, Multicall3, Vault, WBNBAddress, owner } = fixtures;

    /**
     * @dev Approve first
     */
    const WBNB = new ERC20__factory().connect(owner).attach(WBNBAddress);
    await WBNB.approve(Chef.address, ethers.constants.MaxUint256);

    const WBNBDeposit = IWETH9__factory.connect(WBNBAddress, owner);
    await WBNBDeposit.deposit({ value: ethers.constants.WeiPerEther });

    const beforeBalance = await WBNB.balanceOf(owner.address);
    expect(beforeBalance.eq(ethers.constants.WeiPerEther));

    const vaultBeforeBalance = await WBNB.balanceOf(Vault.address);
    expect(vaultBeforeBalance.eq(ethers.constants.Zero));

    /**
     * @dev Try multicall
     */
    await Chef.connect(owner).multicall([
      Chef.connect(owner).interface.encodeFunctionData("createPocket", [
        toBeCreatedPocketData,
      ]),
      Chef.connect(owner).interface.encodeFunctionData("depositToken", [
        toBeCreatedPocketData.id,
        ethers.constants.WeiPerEther,
      ]),
    ]);

    const afterBalance = await WBNB.balanceOf(owner.address);
    expect(afterBalance.eq(0)).to.be.true;

    const vaultAfterBalance = await WBNB.balanceOf(Vault.address);
    expect(vaultAfterBalance.eq(ethers.constants.WeiPerEther));

    /**
     * @dev Multiple queries using multicall3
     */
    const [
      { returnData: createdPocketData },
      { returnData: stopConditionsData },
    ] = await Multicall3.callStatic.aggregate3([
      {
        target: Registry.address,
        callData: Registry.interface.encodeFunctionData("pockets", [
          toBeCreatedPocketData.id,
        ]),
        allowFailure: false,
      },
      {
        target: Registry.address,
        callData: Registry.interface.encodeFunctionData("getStopConditionsOf", [
          toBeCreatedPocketData.id,
        ]),
        allowFailure: false,
      },
    ]);

    const createdPocket = Registry.interface.decodeFunctionResult(
      "pockets",
      createdPocketData
    );
    const stopConditions = Registry.interface.decodeFunctionResult(
      "getStopConditionsOf",
      stopConditionsData
    );

    expect(createdPocket.id).eq(toBeCreatedPocketData.id);
    expect(createdPocket.baseTokenBalance.eq(ethers.constants.WeiPerEther)).to
      .be.true;
    expect(createdPocket.targetTokenBalance.eq(ethers.constants.Zero)).to.be
      .true;
    expect(stopConditions.length).eq(
      toBeCreatedPocketData.stopConditions.length
    );

    expect(createdPocket.totalDepositedBaseAmount).eq(
      ethers.constants.WeiPerEther
    );
    expect(createdPocket.totalSwappedBaseAmount).eq(ethers.constants.Zero);
    expect(createdPocket.totalReceivedTargetAmount).eq(ethers.constants.Zero);
    expect(createdPocket.totalClosedPositionInTargetTokenAmount).eq(
      ethers.constants.Zero
    );
    expect(createdPocket.totalReceivedFundInBaseTokenAmount).eq(
      ethers.constants.Zero
    );
  });

  it("[withdraw] should: owner fails to withdraw an active pocket", async () => {
    const { Chef, owner } = fixtures;

    await expect(
      Chef.connect(owner).withdraw(toBeCreatedPocketData.id)
    ).to.be.revertedWith("Operation error: cannot withdraw pocket fund");
  });

  it("[deposit] should: non-owner fails to deposit to an active pocket", async () => {
    const { Chef, owner, owner2 } = fixtures;

    await expect(
      Chef.connect(owner2).depositToken(
        toBeCreatedPocketData.id,
        ethers.constants.WeiPerEther
      )
    ).to.be.revertedWith("Operation error: cannot deposit");
  });

  it("[close_and_withdraw] should: close and withdraw pocket with multicall", async () => {
    const { Chef, Registry, Multicall3, Vault, WBNBAddress, owner } = fixtures;

    const WBNB = new ERC20__factory().connect(owner).attach(WBNBAddress);
    const beforeBalance = await WBNB.balanceOf(owner.address);
    expect(beforeBalance.eq(ethers.constants.Zero)).to.be.true;

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
      await Multicall3.callStatic.aggregate3([
        {
          target: Registry.address,
          callData: Registry.interface.encodeFunctionData("pockets", [
            toBeCreatedPocketData.id,
          ]),
          allowFailure: false,
        },
      ]);

    const createdPocket = Registry.interface.decodeFunctionResult(
      "pockets",
      createdPocketData
    );

    expect(createdPocket.id).eq(toBeCreatedPocketData.id);
    expect(createdPocket.baseTokenBalance.eq(ethers.constants.Zero)).to.be.true;
    expect(createdPocket.targetTokenBalance.eq(ethers.constants.Zero)).to.be
      .true;
    expect(createdPocket.status.toString()).eq("4"); // changed to withdrawn

    const afterBalance = await WBNB.balanceOf(owner.address);
    expect(afterBalance.eq(ethers.constants.WeiPerEther)).to.be.true;

    expect(createdPocket.totalDepositedBaseAmount).eq(
      ethers.constants.WeiPerEther
    );
    expect(createdPocket.totalSwappedBaseAmount).eq(ethers.constants.Zero);
    expect(createdPocket.totalReceivedTargetAmount).eq(ethers.constants.Zero);
    expect(createdPocket.totalClosedPositionInTargetTokenAmount).eq(
      ethers.constants.Zero
    );
    expect(createdPocket.totalReceivedFundInBaseTokenAmount).eq(
      ethers.constants.Zero
    );
  });

  it("[deposit] should: owner fails to deposit to a closed pocket", async () => {
    const { Chef, owner } = fixtures;

    await expect(
      Chef.connect(owner).depositToken(
        toBeCreatedPocketData.id,
        ethers.constants.WeiPerEther
      )
    ).to.be.revertedWith("Operation error: cannot deposit");
  });
});
