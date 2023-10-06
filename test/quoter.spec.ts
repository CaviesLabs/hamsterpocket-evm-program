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
    const [amountIn, amountOut] = await Vault.getCurrentQuote.staticCall(
      BTCBAddress,
      WBNBAddress,
      PancakeSwapRouterV2,
      ethers.WeiPerEther,
      0,
    );

    expect(amountIn).eq(ethers.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  it("[quoter] should: UNI/WBNB on RouterV2 should work properly", async () => {
    const { Vault, UniswapAddress, WBNBAddress, PancakeSwapRouterV2 } =
      fixtures;
    const [amountIn, amountOut] = await Vault.getCurrentQuote.staticCall(
      UniswapAddress,
      WBNBAddress,
      PancakeSwapRouterV2,
      ethers.WeiPerEther,
      0,
    );

    expect(amountIn).eq(ethers.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  it("[quoter] should: ETH/WBNB on RouterV2 should work properly", async () => {
    const { Vault, ETHAddress, WBNBAddress, PancakeSwapRouterV2 } = fixtures;
    const [amountIn, amountOut] = await Vault.getCurrentQuote.staticCall(
      ETHAddress,
      WBNBAddress,
      PancakeSwapRouterV2,
      ethers.WeiPerEther,
      0,
    );

    expect(amountIn).eq(ethers.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  it("[quoter] should: BTCB/WBNB on fee 0.05% should work properly", async () => {
    const { Vault, BTCBAddress, WBNBAddress, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.getCurrentQuote.staticCall(
      BTCBAddress,
      WBNBAddress,
      RouterAddress,
      ethers.WeiPerEther,
      500,
    );

    expect(amountIn).eq(ethers.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  // it("[quoter] should: UNI/WBNB on fee 0.05% should work", async () => {
  //   const { Vault, UniswapAddress, WBNBAddress } = fixtures;
  //   const [amountIn, amountOut] = await Vault.getCurrentQuote.staticCall(
  //     UniswapAddress,
  //     WBNBAddress,
  //     toBeCreatedPocketData.ammRouterAddress,
  //     ethers.WeiPerEther,
  //     500
  //   );
  //
  //   expect(amountIn).eq(ethers.WeiPerEther);
  //   expect(amountOut).gt(0);
  // });

  it("[quoter] should: ETH/WBNB on fee 0.05% should work", async () => {
    const { Vault, ETHAddress, WBNBAddress, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.getCurrentQuote.staticCall(
      ETHAddress,
      WBNBAddress,
      RouterAddress,
      ethers.WeiPerEther,
      500,
    );

    expect(amountIn).eq(ethers.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  it("[quoter] should: BTCB/WBNB on fee 0.3% should work properly", async () => {
    const { Vault, BTCBAddress, WBNBAddress, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.getCurrentQuote.staticCall(
      BTCBAddress,
      WBNBAddress,
      RouterAddress,
      ethers.WeiPerEther,
      3000,
    );

    expect(amountIn).eq(ethers.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  it("[quoter] should: UNI/WBNB on fee 0.3% should work", async () => {
    const { Vault, UniswapAddress, WBNBAddress, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.getCurrentQuote.staticCall(
      UniswapAddress,
      WBNBAddress,
      RouterAddress,
      ethers.WeiPerEther,
      3000,
    );

    expect(amountIn).eq(ethers.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  it("[quoter] should: ETH/WBNB on fee 0.3% should work", async () => {
    const { Vault, ETHAddress, WBNBAddress, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.getCurrentQuote.staticCall(
      ETHAddress,
      WBNBAddress,
      RouterAddress,
      ethers.WeiPerEther,
      3000,
    );

    expect(amountIn).eq(ethers.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  // it("[quoter] should: BTCB/WBNB on fee 1% should work properly", async () => {
  //   const { Vault, BTCBAddress, WBNBAddress, RouterAddress } = fixtures;
  //   const [amountIn, amountOut] = await Vault.getCurrentQuote.staticCall(
  //     BTCBAddress,
  //     WBNBAddress,
  //     RouterAddress,
  //     ethers.WeiPerEther,
  //     10000
  //   );
  //
  //   expect(amountIn).eq(ethers.WeiPerEther);
  //   expect(amountOut).gt(0);
  //   expect(amountIn).not.eq(amountOut);
  // });

  it("[quoter] should: UNI/WBNB on fee 1% should work", async () => {
    const { Vault, UniswapAddress, WBNBAddress, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.getCurrentQuote.staticCall(
      UniswapAddress,
      WBNBAddress,
      RouterAddress,
      ethers.WeiPerEther,
      10000,
    );

    expect(amountIn).eq(ethers.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });

  it("[quoter] should: ETH/WBNB on fee 1% should work", async () => {
    const { Vault, ETHAddress, WBNBAddress, RouterAddress } = fixtures;
    const [amountIn, amountOut] = await Vault.getCurrentQuote.staticCall(
      ETHAddress,
      WBNBAddress,
      RouterAddress,
      ethers.WeiPerEther,
      10000,
    );

    expect(amountIn).eq(ethers.WeiPerEther);
    expect(amountOut).gt(0);
    expect(amountIn).not.eq(amountOut);
  });
});
