import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

import { deployFixtures } from "./fixtures";
import { Params } from "../typechain-types/contracts/PocketChef";
import {
  ERC20__factory,
  IERC20__factory,
  IWETH9__factory,
} from "../typechain-types";
import { IERC20 } from "@uniswap/universal-router/typechain";

describe("[swap]", async function () {
  let fixtures: Awaited<ReturnType<typeof deployFixtures>>;
  let toBeCreatedPocketData: Params.CreatePocketParamsStruct;

  before(async () => {
    fixtures = await loadFixture(deployFixtures);

    toBeCreatedPocketData = {
      id: "test-swap-pocket",
      owner: fixtures.owner.address,
      ammRouterAddress: fixtures.RouterAddress,
      baseTokenAddress: fixtures.WBNBAddress,
      targetTokenAddress: fixtures.BTCBAddress,
      startAt: parseInt((new Date().getTime() / 1000).toString()).toString(),
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

    const { Chef, owner, owner2 } = fixtures;
    await Chef.connect(owner).createPocketAndDepositEther(
      toBeCreatedPocketData,
      { value: ethers.constants.WeiPerEther }
    );
  });

  it("[auto_investment] should: non-operator cannot trigger the swap, even owner", async () => {
    const { Chef, owner, owner2 } = fixtures;

    await expect(
      Chef.connect(owner).tryMakingDCASwap(toBeCreatedPocketData.id)
    ).to.be.revertedWith(
      "Operation error: only operator is permitted for the operation"
    );

    await expect(
      Chef.connect(owner).tryClosingPosition(toBeCreatedPocketData.id)
    ).to.be.revertedWith(
      "Operation error: only operator is permitted for the operation"
    );

    await expect(
      Chef.connect(owner2).tryClosingPosition(toBeCreatedPocketData.id)
    ).to.be.revertedWith(
      "Operation error: only operator is permitted for the operation"
    );

    await expect(
      Chef.connect(owner2).tryClosingPosition(toBeCreatedPocketData.id)
    ).to.be.revertedWith(
      "Operation error: only operator is permitted for the operation"
    );
  });

  it("[auto_investment] should: operator can trigger the swap", async () => {
    const {
      Time,
      Chef,
      WBNBAddress,
      BTCBAddress,
      owner,
      Vault,
      Registry,
      operator,
      Multicall3,
    } = fixtures;

    /**
     * @dev Increase time to make sure the blocktime is matched
     */
    await Time.increaseTo(
      parseInt((new Date().getTime() / 1000 + 100).toString())
    );

    const WBNB = IERC20__factory.connect(WBNBAddress, owner);
    const BTCB = IERC20__factory.connect(BTCBAddress, owner);

    expect(
      (await WBNB.balanceOf(Vault.address)).eq(ethers.constants.WeiPerEther)
    ).to.be.true;
    expect((await BTCB.balanceOf(Vault.address)).eq(ethers.constants.Zero)).to
      .be.true;

    let pocket = await Registry.pockets(toBeCreatedPocketData.id);
    expect(pocket.baseTokenBalance).eq(ethers.constants.WeiPerEther);
    expect(pocket.targetTokenBalance).eq(ethers.constants.Zero);

    await Chef.connect(operator).tryMakingDCASwap(toBeCreatedPocketData.id);

    expect(await WBNB.balanceOf(Vault.address)).eq(
      ethers.constants.WeiPerEther.sub(
        ethers.constants.WeiPerEther.div(BigNumber.from("10"))
      )
    );
    expect(await BTCB.balanceOf(Vault.address)).gt(ethers.constants.Zero);

    pocket = await Registry.pockets(toBeCreatedPocketData.id);

    expect(pocket.baseTokenBalance).eq(
      ethers.constants.WeiPerEther.sub(
        ethers.constants.WeiPerEther.div(BigNumber.from("10"))
      )
    );
    expect(pocket.targetTokenBalance).gt(ethers.constants.Zero);

    expect(pocket.totalDepositedBaseAmount).eq(ethers.constants.WeiPerEther);
    expect(pocket.totalSwappedBaseAmount).eq(
      ethers.constants.WeiPerEther.div(BigNumber.from("10"))
    );
    const btcbVaultBalance = await BTCB.balanceOf(Vault.address);
    expect(pocket.totalReceivedTargetAmount).eq(btcbVaultBalance);
    expect(pocket.totalClosedPositionInTargetTokenAmount).eq(
      ethers.constants.Zero
    );
    expect(pocket.totalReceivedFundInBaseTokenAmount).eq(ethers.constants.Zero);
  });

  // it("[auto_investment] should: operator can close position of the swap", async () => {
  //   const {Time, Chef, WBNBAddress, BTCBAddress, owner, Vault, Registry, operator, Multicall3} = fixtures;
  //
  //   /**
  //    * @dev Increase time to make sure the blocktime is matched
  //    */
  //   await Time.increaseTo(parseInt(
  //     (new Date().getTime() / 1000 + 36000).toString()
  //   ));
  //
  //   const WBNB = IERC20__factory.connect(WBNBAddress, owner);
  //   const BTCB = IERC20__factory.connect(BTCBAddress, owner);
  //
  //   expect(
  //     (await WBNB.balanceOf(Vault.address)).eq(ethers.constants.WeiPerEther.sub(ethers.constants.WeiPerEther.div(BigNumber.from("10"))))
  //   ).to.be.true;
  //   expect(
  //     (await BTCB.balanceOf(Vault.address)).gt(ethers.constants.Zero)
  //   ).to.be.true;
  //
  //   let pocket = await Registry.pockets(toBeCreatedPocketData.id);
  //   expect(
  //     (pocket.baseTokenBalance)
  //   ).eq(ethers.constants.WeiPerEther.sub(ethers.constants.WeiPerEther.div(BigNumber.from("10"))))
  //   expect(
  //     (pocket.targetTokenBalance)
  //   ).gt(ethers.constants.Zero);
  //
  //   await Chef.connect(operator).tryClosingPosition(toBeCreatedPocketData.id);
  //
  //   expect(
  //     (await WBNB.balanceOf(Vault.address))
  //   ).gt(ethers.constants.WeiPerEther.sub(ethers.constants.WeiPerEther.div(BigNumber.from("10"))));
  //   expect(
  //     (await BTCB.balanceOf(Vault.address))
  //   ).eq(ethers.constants.Zero);
  //
  //   pocket = await Registry.pockets(toBeCreatedPocketData.id);
  //
  //   expect(
  //     (pocket.baseTokenBalance)
  //   ).gt(ethers.constants.WeiPerEther.sub(ethers.constants.WeiPerEther.div(BigNumber.from("10"))));
  //   expect(
  //     (pocket.targetTokenBalance)
  //   ).eq(ethers.constants.Zero);
  //
  //   expect(pocket.totalDepositedBaseAmount).eq(ethers.constants.WeiPerEther);
  //   expect(pocket.totalSwappedBaseAmount).eq(ethers.constants.WeiPerEther.div(BigNumber.from("10")));
  //   const btcbVaultBalance = await BTCB.balanceOf(Vault.address);
  //   expect(pocket.totalReceivedTargetAmount).eq(btcbVaultBalance);
  //   expect(pocket.totalClosedPositionInTargetTokenAmount).eq(ethers.constants.WeiPerEther.div(BigNumber.from("10")));
  //   expect(pocket.totalReceivedFundInBaseTokenAmount).gt(ethers.constants.Zero);
  // });
});
