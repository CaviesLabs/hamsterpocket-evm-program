import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

import { deployFixtures } from "./fixtures";
import { Params } from "../typechain-types/contracts/PocketChef";
import { IERC20__factory } from "../typechain-types";

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
      ammRouterVersion: "0",
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
      Chef.connect(owner).tryMakingDCASwap(toBeCreatedPocketData.id, 3000, 0)
    ).to.be.revertedWith(
      "Operation error: only operator is permitted for the operation"
    );

    await expect(
      Chef.connect(owner).tryClosingPosition(toBeCreatedPocketData.id, 3000, 0)
    ).to.be.revertedWith(
      "Operation error: only operator is permitted for the operation"
    );

    await expect(
      Chef.connect(owner2).tryClosingPosition(toBeCreatedPocketData.id, 3000, 0)
    ).to.be.revertedWith(
      "Operation error: only operator is permitted for the operation"
    );

    await expect(
      Chef.connect(owner2).tryClosingPosition(toBeCreatedPocketData.id, 3000, 0)
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

    await Chef.connect(operator).tryMakingDCASwap(
      toBeCreatedPocketData.id,
      3000,
      0
    );

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

  it("[auto_investment] should: operator can close position of the swap", async () => {
    const {
      Time,
      Chef,
      WBNBAddress,
      BTCBAddress,
      owner,
      Vault,
      Registry,
      operator,
    } = fixtures;

    const data = {
      ...toBeCreatedPocketData,
      startAt: parseInt((new Date().getTime() / 1000 + 1000).toString()),
      id: "successful-to-close-position",
      takeProfitCondition: {
        stopType: "0",
        value: "0",
      },
      stopLossCondition: {
        stopType: "1",
        value: ethers.constants.WeiPerEther.mul(1000),
      },
    };

    await Chef.connect(owner).createPocketAndDepositEther(data, {
      value: ethers.constants.WeiPerEther,
    });

    /**
     * @dev Increase time to make sure the blocktime is matched
     */
    await Time.increaseTo(
      parseInt((new Date().getTime() / 1000 + 36000).toString())
    );

    await Chef.connect(operator).tryMakingDCASwap(data.id, 3000, 0);

    const WBNB = IERC20__factory.connect(WBNBAddress, owner);
    const BTCB = IERC20__factory.connect(BTCBAddress, owner);

    expect(await WBNB.balanceOf(Vault.address)).eq(
      ethers.constants.WeiPerEther.sub(
        ethers.constants.WeiPerEther.div(BigNumber.from("10"))
      ).mul(2)
    );
    expect((await BTCB.balanceOf(Vault.address)).gt(ethers.constants.Zero));

    let pocket = await Registry.pockets(data.id);
    expect(pocket.baseTokenBalance).eq(
      ethers.constants.WeiPerEther.sub(
        ethers.constants.WeiPerEther.div(BigNumber.from("10"))
      )
    );
    expect(pocket.targetTokenBalance).gt(ethers.constants.Zero);

    const vaultBalanceBefore = await BTCB.balanceOf(Vault.address);
    await Chef.connect(operator).tryClosingPosition(data.id, 3000, 0);

    expect(await WBNB.balanceOf(Vault.address)).gt(
      ethers.constants.WeiPerEther.sub(
        ethers.constants.WeiPerEther.div(BigNumber.from("10"))
      ).mul(2)
    );
    expect(await BTCB.balanceOf(Vault.address)).lt(vaultBalanceBefore);

    pocket = await Registry.pockets(data.id);

    expect(pocket.baseTokenBalance).gt(
      ethers.constants.WeiPerEther.sub(
        ethers.constants.WeiPerEther.div(BigNumber.from("10"))
      )
    );
    expect(pocket.targetTokenBalance).eq(ethers.constants.Zero);

    expect(pocket.totalDepositedBaseAmount).eq(ethers.constants.WeiPerEther);
    expect(pocket.totalSwappedBaseAmount).eq(
      ethers.constants.WeiPerEther.div(BigNumber.from("10"))
    );

    const btcbVaultBalance = await BTCB.balanceOf(Vault.address);

    expect(btcbVaultBalance).lt(vaultBalanceBefore);
    expect(pocket.totalReceivedTargetAmount).gt(ethers.constants.Zero);
    expect(pocket.totalClosedPositionInTargetTokenAmount).gt(
      ethers.constants.Zero
    );
    expect(pocket.totalReceivedFundInBaseTokenAmount).gt(ethers.constants.Zero);

    /// @dev Pocket has been closed after closing position
    expect(pocket.status).eq(3);
  });

  it("[auto_investment] should: operator will fail to close position as the condition is not reached (stop loss)", async () => {
    const { Time, Chef, owner, operator } = fixtures;

    const data = {
      ...toBeCreatedPocketData,
      id: "fail-to-close-position",
      takeProfitCondition: {
        stopType: "0",
        value: "0",
      },
      stopLossCondition: {
        stopType: "1",
        value: ethers.constants.WeiPerEther,
      },
      startAt: parseInt((new Date().getTime() / 1000 + 37000).toString()),
    };

    await Chef.connect(owner).createPocketAndDepositEther(data, {
      value: ethers.constants.WeiPerEther,
    });

    await Time.increaseTo(
      parseInt((new Date().getTime() / 1000 + 38000).toString())
    );

    await Chef.connect(operator).tryMakingDCASwap(data.id, 3000, 0);

    await expect(
      Chef.connect(operator).tryClosingPosition(data.id, 3000, 0)
    ).to.be.revertedWith(
      "Operation error: closing position condition does not reach"
    );
  });

  it("[auto_investment] should: operator will fail to close position as the condition is not reached (take profit)", async () => {
    const { Time, Chef, owner, operator } = fixtures;

    const data = {
      ...toBeCreatedPocketData,
      id: "fail-to-close-position-take-profit",
      takeProfitCondition: {
        stopType: "1",
        value: ethers.constants.WeiPerEther.mul(1000),
      },
      stopLossCondition: {
        stopType: "0",
        value: "0",
      },
      startAt: parseInt((new Date().getTime() / 1000 + 40000).toString()),
    };

    await Chef.connect(owner).createPocketAndDepositEther(data, {
      value: ethers.constants.WeiPerEther,
    });

    await Time.increaseTo(
      parseInt((new Date().getTime() / 1000 + 45000).toString())
    );

    await Chef.connect(operator).tryMakingDCASwap(data.id, 3000, 0);

    await expect(
      Chef.connect(operator).tryClosingPosition(data.id, 3000, 0)
    ).to.be.revertedWith(
      "Operation error: closing position condition does not reach"
    );
  });

  it("[auto_investment] should: owner can close position", async () => {
    const {
      Time,
      Chef,
      Vault,
      Registry,
      owner,
      operator,
      WBNBAddress,
      BTCBAddress,
    } = fixtures;

    const data = {
      ...toBeCreatedPocketData,
      id: "should-close-position-successfully",
      takeProfitCondition: {
        stopType: "1",
        value: ethers.constants.WeiPerEther.mul(1000),
      },
      stopLossCondition: {
        stopType: "0",
        value: "0",
      },
      startAt: parseInt((new Date().getTime() / 1000 + 45002).toString()),
    };

    await Chef.connect(owner).createPocketAndDepositEther(data, {
      value: ethers.constants.WeiPerEther,
    });

    await Time.increaseTo(
      parseInt((new Date().getTime() / 1000 + 50000).toString())
    );

    await Chef.connect(operator).tryMakingDCASwap(data.id, 3000, 0);

    /// @dev Wont allow non-owner close position if condition does not reach
    await expect(
      Chef.connect(operator).tryClosingPosition(data.id, 3000, 0)
    ).to.be.revertedWith(
      "Operation error: closing position condition does not reach"
    );

    /// @dev Wont allow non-owner close position manually
    await expect(
      Chef.connect(operator).closePosition(data.id, 3000, 0)
    ).to.be.revertedWith(
      "Operation error: only owner is permitted for the operation"
    );

    const BTCB = IERC20__factory.connect(BTCBAddress, owner);
    const WBNB = IERC20__factory.connect(WBNBAddress, owner);

    const vaultBalanceBefore = await BTCB.balanceOf(Vault.address);
    const vaultBNBBalanceBefore = await WBNB.balanceOf(Vault.address);

    await Chef.connect(owner).closePosition(data.id, 3000, 0);

    /// @dev meaning that the close position works properly
    expect(await BTCB.balanceOf(Vault.address)).lt(vaultBalanceBefore);
    expect(await WBNB.balanceOf(Vault.address)).gt(vaultBNBBalanceBefore);

    /// @dev Pocket has been closed after closing position
    const pocket = await Registry.pockets(data.id);
    expect(pocket.status).eq(3);
  });

  it("[auto_investment] should: auto close whenever pocket reaches stop conditions", async () => {
    const { Time, Chef, Registry, owner, operator } = fixtures;

    const data = {
      ...toBeCreatedPocketData,
      id: "should-routerv2-auto-close-pocket-successfully",
      startAt: parseInt((new Date().getTime() / 1000 + 50002).toString()),
      stopConditions: [
        {
          operator: "0",
          value: parseInt(
            (new Date().getTime() / 1000 + 50010).toString()
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
      parseInt((new Date().getTime() / 1000 + 60000).toString())
    );

    await Chef.connect(operator).tryMakingDCASwap(data.id, 3000, 0);

    /// @dev Pocket has been closed after closing position
    const pocket = await Registry.pockets(data.id);
    expect(pocket.status).eq(3);
  });

  it("[auto_investment] should: should work with pcs router v2", async () => {
    const { Time, Chef, Registry, owner, operator, PancakeSwapRouterV2 } =
      fixtures;

    const data = {
      ...toBeCreatedPocketData,
      id: "should-auto-close-pocket-successfully",
      startAt: parseInt((new Date().getTime() / 1000 + 60002).toString()),
      ammRouterAddress: PancakeSwapRouterV2,
      ammRouterVersion: "1", // Meaning this is v2
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

    await Chef.connect(operator).tryMakingDCASwap(data.id, 3000, 0);

    /// @dev Pocket has been closed after closing position
    const pocket = await Registry.pockets(data.id);
    expect(pocket.status).eq(3);
  });
});
