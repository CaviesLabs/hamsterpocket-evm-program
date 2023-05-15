import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { BigNumber } from "ethers";

import { expect } from "chai";

import { deployFixtures } from "./fixtures";
import { Params } from "../typechain-types/contracts/PocketChef";

describe("[manage_pocket]", async function () {
  let fixtures: Awaited<ReturnType<typeof deployFixtures>>;
  let toBeUpdatedPocketData: Params.UpdatePocketParamsStruct;
  let toBeCreatedPocketData: Params.CreatePocketParamsStruct;

  before(async () => {
    fixtures = await loadFixture(deployFixtures);
    toBeUpdatedPocketData = {
      id: "randomId",
      startAt: parseInt(
        (new Date().getTime() / 1000 + 80000).toString()
      ).toString(),
      batchVolume: ethers.constants.WeiPerEther.div(BigNumber.from("100")), // 0.1 BNB per batch
      stopConditions: [
        {
          operator: "1",
          value: parseInt(
            (new Date().getTime() / 1000 + 90000).toString()
          ).toString(),
        },
      ],
      frequency: "3600",
      openingPositionCondition: {
        value0: "1",
        value1: "2",
        operator: "5",
      },
      takeProfitCondition: {
        stopType: "3",
        value: "3",
      },
      stopLossCondition: {
        stopType: "3",
        value: "3",
      },
    };

    toBeCreatedPocketData = {
      id: "randomId",
      owner: fixtures.owner.address,
      ammRouterAddress: fixtures.RouterAddress,
      baseTokenAddress: fixtures.WBNBAddress,
      targetTokenAddress: fixtures.BTCBAddress,
      ammRouterVersion: 0,
      startAt: parseInt(
        (new Date().getTime() / 1000 + 30000).toString()
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

  it("[create_pocket] should: owner creates pocket successfully", async () => {
    const pocketData = toBeCreatedPocketData;
    const tx = await fixtures.Chef.createPocket(pocketData);
    const txReceipt = await tx.wait();

    const eventLogs = txReceipt.logs.map((elm) => {
      return fixtures.Registry.interface.parseLog(elm);
    });
    const createdPocket = await fixtures.Registry.pockets(pocketData.id);
    const stopConditions = await fixtures.Registry.getStopConditionsOf(
      pocketData.id
    );

    expect(createdPocket.id).eq(pocketData.id);
    expect(createdPocket.owner).eq(pocketData.owner);
    expect(createdPocket.ammRouterAddress).eq(pocketData.ammRouterAddress);
    expect(createdPocket.baseTokenAddress).eq(pocketData.baseTokenAddress);
    expect(createdPocket.targetTokenAddress).eq(pocketData.targetTokenAddress);
    expect(createdPocket.startAt.toString()).eq(pocketData.startAt.toString());
    expect(createdPocket.batchVolume.eq(await pocketData.batchVolume)).eq(true);
    expect(createdPocket.frequency.toString()).eq(
      pocketData.frequency.toString()
    );

    expect(createdPocket.openingPositionCondition.value0.toString()).eq(
      pocketData.openingPositionCondition.value0
    );
    expect(createdPocket.openingPositionCondition.value1.toString()).eq(
      pocketData.openingPositionCondition.value1
    );
    expect(createdPocket.openingPositionCondition.operator.toString()).eq(
      pocketData.openingPositionCondition.operator
    );

    expect(createdPocket.takeProfitCondition.stopType.toString()).eq(
      pocketData.takeProfitCondition.stopType
    );
    expect(createdPocket.takeProfitCondition.value.toString()).eq(
      pocketData.takeProfitCondition.value
    );

    expect(createdPocket.stopLossCondition.stopType.toString()).eq(
      pocketData.stopLossCondition.stopType
    );
    expect(createdPocket.stopLossCondition.value.toString()).eq(
      pocketData.stopLossCondition.value
    );

    expect(stopConditions.length).eq(pocketData.stopConditions.length);
    stopConditions.map((cond, index) => {
      expect(cond.value.toString()).eq(pocketData.stopConditions[index].value);
      expect(cond.operator.toString()).eq(
        pocketData.stopConditions[index].operator
      );
    });

    expect(eventLogs.length).eq(1);
    expect(eventLogs[0].name).eq("PocketInitialized");
  });

  it("[get_trading_info] should: getTradingInfoOf should work properly", async () => {
    const { Registry } = fixtures;

    const pocket = await Registry.getTradingInfoOf(toBeCreatedPocketData.id);

    expect(pocket[0]).eq(toBeCreatedPocketData.ammRouterAddress);
    expect(pocket[1]).eq(toBeCreatedPocketData.baseTokenAddress);
    expect(pocket[2]).eq(toBeCreatedPocketData.targetTokenAddress);
    expect(pocket[3]).eq(toBeCreatedPocketData.ammRouterVersion);
    expect(pocket[4]).eq(toBeCreatedPocketData.startAt);
    expect(pocket[5]).eq(toBeCreatedPocketData.batchVolume);
    expect(pocket[6]).eq(toBeCreatedPocketData.frequency);
    expect(pocket[7]).eq(toBeCreatedPocketData.startAt);
    expect(pocket[8].operator).eq(BigNumber.from("0"));
    expect(pocket[9].stopType).eq(BigNumber.from("0"));
    expect(pocket[10].stopType).eq(BigNumber.from("0"));
  });

  it("[create_pocket] should: cannot create with a duplicated id", async () => {
    await expect(
      fixtures.Chef.createPocket(toBeCreatedPocketData)
    ).revertedWith("ID: the id is not unique");
  });

  it("[update_pocket] should: owner updates pocket will fail if owner provides invalid id", async () => {
    await expect(
      fixtures.Chef.updatePocket({ ...toBeUpdatedPocketData, id: "invalid-id" })
    ).revertedWith("Operation error: the pocket is not able to update");
  });

  it("[update_pocket] should: non-owner updates pocket will fail", async () => {
    await expect(
      fixtures.Chef.connect(fixtures.owner2).updatePocket(toBeUpdatedPocketData)
    ).revertedWith("Operation error: the pocket is not able to update");
  });

  it("[update_pocket] should: owner updates pocket successfully", async () => {
    const pocketData = toBeUpdatedPocketData;
    const tx = await fixtures.Chef.updatePocket(pocketData);
    const txReceipt = await tx.wait();

    const eventLogs = txReceipt.logs.map((elm) => {
      return fixtures.Registry.interface.parseLog(elm);
    });
    const updatedPocket = await fixtures.Registry.pockets(pocketData.id);
    const stopConditions = await fixtures.Registry.getStopConditionsOf(
      pocketData.id
    );

    expect(updatedPocket.id).eq(pocketData.id);
    expect(updatedPocket.startAt.toString()).eq(pocketData.startAt.toString());
    expect(updatedPocket.batchVolume.eq(await pocketData.batchVolume)).eq(true);
    expect(updatedPocket.frequency.toString()).eq(
      pocketData.frequency.toString()
    );

    expect(updatedPocket.openingPositionCondition.value0.toString()).eq(
      pocketData.openingPositionCondition.value0
    );
    expect(updatedPocket.openingPositionCondition.value1.toString()).eq(
      pocketData.openingPositionCondition.value1
    );
    expect(updatedPocket.openingPositionCondition.operator.toString()).eq(
      pocketData.openingPositionCondition.operator
    );

    expect(updatedPocket.takeProfitCondition.stopType.toString()).eq(
      pocketData.takeProfitCondition.stopType
    );
    expect(updatedPocket.takeProfitCondition.value.toString()).eq(
      pocketData.takeProfitCondition.value
    );

    expect(updatedPocket.stopLossCondition.stopType.toString()).eq(
      pocketData.stopLossCondition.stopType
    );
    expect(updatedPocket.stopLossCondition.value.toString()).eq(
      pocketData.stopLossCondition.value
    );

    expect(stopConditions.length).eq(pocketData.stopConditions.length);
    stopConditions.map((cond, index) => {
      expect(cond.value.toString()).eq(pocketData.stopConditions[index].value);
      expect(cond.operator.toString()).eq(
        pocketData.stopConditions[index].operator
      );
    });

    expect(eventLogs.length).eq(1);
    expect(eventLogs[0].name).eq("PocketUpdated");
  });

  it("[update_pocket_status] should: non-owner will fail to update pocket status", async () => {
    await expect(
      fixtures.Chef.connect(fixtures.owner2).pausePocket(
        toBeUpdatedPocketData.id
      )
    ).revertedWith("Operation error: cannot pause pocket");

    await expect(
      fixtures.Chef.connect(fixtures.owner2).closePocket(
        toBeUpdatedPocketData.id
      )
    ).revertedWith("Operation error: cannot close pocket");

    await expect(
      fixtures.Chef.connect(fixtures.owner2).restartPocket(
        toBeUpdatedPocketData.id
      )
    ).revertedWith("Operation error: cannot restart pocket");
  });

  it("[update_pocket_status] should: owner can pause/close pocket status", async () => {
    /// Pause pocket
    let tx = await fixtures.Chef.pausePocket(toBeUpdatedPocketData.id);
    let txReceipt = await tx.wait();

    const pausedPocket = await fixtures.Registry.pockets(
      toBeUpdatedPocketData.id
    );
    expect(pausedPocket.status.toString()).eq("2"); // already paused

    let eventLogs = txReceipt.logs.map((elm) => {
      return fixtures.Registry.interface.parseLog(elm);
    });
    expect(eventLogs.length).eq(1);
    expect(eventLogs[0].name).eq("PocketUpdated");
    expect(eventLogs[0].args[3]).eq("USER_PAUSED_POCKET");

    /// Restarted pocket
    tx = await fixtures.Chef.restartPocket(toBeUpdatedPocketData.id);
    txReceipt = await tx.wait();

    const restartedPocket = await fixtures.Registry.pockets(
      toBeUpdatedPocketData.id
    );
    expect(restartedPocket.status.toString()).eq("1"); // already activated

    eventLogs = txReceipt.logs.map((elm) => {
      return fixtures.Registry.interface.parseLog(elm);
    });
    expect(eventLogs.length).eq(1);
    expect(eventLogs[0].name).eq("PocketUpdated");
    expect(eventLogs[0].args[3]).eq("USER_RESTARTED_POCKET");

    /// Close pocket
    tx = await fixtures.Chef.closePocket(toBeUpdatedPocketData.id);
    txReceipt = await tx.wait();

    const closedPocket = await fixtures.Registry.pockets(
      toBeUpdatedPocketData.id
    );
    expect(closedPocket.status.toString()).eq("3"); // already closed

    eventLogs = txReceipt.logs.map((elm) => {
      return fixtures.Registry.interface.parseLog(elm);
    });
    expect(eventLogs.length).eq(1);
    expect(eventLogs[0].name).eq("PocketUpdated");
    expect(eventLogs[0].args[3]).eq("USER_CLOSED_POCKET");
  });

  it("[update_pocket_status] should: owner will fail to update pocket status if it's not available", async () => {
    await expect(
      fixtures.Chef.connect(fixtures.owner).pausePocket(
        toBeUpdatedPocketData.id
      )
    ).revertedWith("Operation error: cannot pause pocket");

    await expect(
      fixtures.Chef.connect(fixtures.owner).closePocket(
        toBeUpdatedPocketData.id
      )
    ).revertedWith("Operation error: cannot close pocket");

    await expect(
      fixtures.Chef.connect(fixtures.owner).restartPocket(
        toBeUpdatedPocketData.id
      )
    ).revertedWith("Operation error: cannot restart pocket");
  });
});
