import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { deployFixtures } from "./fixtures";

describe("[quoter]", async () => {
  let fixtures: Awaited<ReturnType<typeof deployFixtures>>;

  before(async () => {
    fixtures = await loadFixture(deployFixtures);
  });

  it("[quoter] should: BTCB/WBNB on RouterV2 should work properly", async () => {
    const { Vault, BTCBAddress, WBNBAddress, PancakeSwapRouterV2 } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      BTCBAddress,
      WBNBAddress,
      PancakeSwapRouterV2,
      ethers.constants.WeiPerEther,
      0
    );

    expect(amountIn).eq(ethers.constants.WeiPerEther);
    expect(amountOut).gt(0);
  });

  it("[quoter] should: UNI/WBNB on RouterV2 should work properly", async () => {
    const { Vault, UniswapAddress, WBNBAddress, PancakeSwapRouterV2 } =
      fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      UniswapAddress,
      WBNBAddress,
      PancakeSwapRouterV2,
      ethers.constants.WeiPerEther,
      0
    );

    expect(amountIn).eq(ethers.constants.WeiPerEther);
    expect(amountOut).gt(0);
  });

  it("[quoter] should: ETH/WBNB on RouterV2 should work properly", async () => {
    const { Vault, ETHAddress, WBNBAddress, PancakeSwapRouterV2 } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      ETHAddress,
      WBNBAddress,
      PancakeSwapRouterV2,
      ethers.constants.WeiPerEther,
      0
    );

    expect(amountIn).eq(ethers.constants.WeiPerEther);
    expect(amountOut).gt(0);
  });

  it("[quoter] should: BTCB/WBNB on fee 0.05% should work properly", async () => {
    const { Vault, BTCBAddress, WBNBAddress, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      BTCBAddress,
      WBNBAddress,
      RouterAddress,
      ethers.constants.WeiPerEther,
      500
    );

    expect(amountIn).eq(ethers.constants.WeiPerEther);
    expect(amountOut).gt(0);
  });

  // it("[quoter] should: UNI/WBNB on fee 0.05% should work", async () => {
  //   const { Vault, UniswapAddress, WBNBAddress } = fixtures;
  //   const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
  //     UniswapAddress,
  //     WBNBAddress,
  //     toBeCreatedPocketData.ammRouterAddress,
  //     ethers.constants.WeiPerEther,
  //     500
  //   );
  //
  //   expect(amountIn).eq(ethers.constants.WeiPerEther);
  //   expect(amountOut).gt(0);
  // });

  it("[quoter] should: ETH/WBNB on fee 0.05% should work", async () => {
    const { Vault, ETHAddress, WBNBAddress, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      ETHAddress,
      WBNBAddress,
      RouterAddress,
      ethers.constants.WeiPerEther,
      500
    );

    expect(amountIn).eq(ethers.constants.WeiPerEther);
    expect(amountOut).gt(0);
  });

  it("[quoter] should: BTCB/WBNB on fee 0.3% should work properly", async () => {
    const { Vault, BTCBAddress, WBNBAddress, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      BTCBAddress,
      WBNBAddress,
      RouterAddress,
      ethers.constants.WeiPerEther,
      3000
    );

    expect(amountIn).eq(ethers.constants.WeiPerEther);
    expect(amountOut).gt(0);
  });

  it("[quoter] should: UNI/WBNB on fee 0.3% should work", async () => {
    const { Vault, UniswapAddress, WBNBAddress, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      UniswapAddress,
      WBNBAddress,
      RouterAddress,
      ethers.constants.WeiPerEther,
      3000
    );

    expect(amountIn).eq(ethers.constants.WeiPerEther);
    expect(amountOut).gt(0);
  });

  it("[quoter] should: ETH/WBNB on fee 0.3% should work", async () => {
    const { Vault, ETHAddress, WBNBAddress, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      ETHAddress,
      WBNBAddress,
      RouterAddress,
      ethers.constants.WeiPerEther,
      3000
    );

    expect(amountIn).eq(ethers.constants.WeiPerEther);
    expect(amountOut).gt(0);
  });

  it("[quoter] should: BTCB/WBNB on fee 1% should work properly", async () => {
    const { Vault, BTCBAddress, WBNBAddress, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      BTCBAddress,
      WBNBAddress,
      RouterAddress,
      ethers.constants.WeiPerEther,
      10000
    );

    expect(amountIn).eq(ethers.constants.WeiPerEther);
    expect(amountOut).gt(0);
  });

  it("[quoter] should: UNI/WBNB on fee 1% should work", async () => {
    const { Vault, UniswapAddress, WBNBAddress, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      UniswapAddress,
      WBNBAddress,
      RouterAddress,
      ethers.constants.WeiPerEther,
      10000
    );

    expect(amountIn).eq(ethers.constants.WeiPerEther);
    expect(amountOut).gt(0);
  });

  it("[quoter] should: ETH/WBNB on fee 1% should work", async () => {
    const { Vault, ETHAddress, WBNBAddress, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.callStatic.getCurrentQuote(
      ETHAddress,
      WBNBAddress,
      RouterAddress,
      ethers.constants.WeiPerEther,
      10000
    );

    expect(amountIn).eq(ethers.constants.WeiPerEther);
    expect(amountOut).gt(0);
  });
});
