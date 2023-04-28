import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

import { deployFixtures } from "./fixtures";
import { Params } from "../typechain-types/contracts/PocketChef";
import { ERC20__factory, IWETH9__factory } from "../typechain-types";
import { IWETH9 } from "@uniswap/universal-router/typechain";

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
    /**
     * @dev Try multicall3
     */

    await Chef.connect(owner).multicall([
      Chef.connect(owner).interface.encodeFunctionData(
        "createPocketAndDepositToken",
        [toBeCreatedPocketData, ethers.constants.WeiPerEther]
      ),
    ]);

    const afterBalance = await WBNB.balanceOf(owner.address);
    expect(afterBalance.eq(0)).to.be.true;
  });
});
