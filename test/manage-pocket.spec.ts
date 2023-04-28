import { ethers, network } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { deployFixtures } from "./fixtures";
import { ERC20__factory } from "../typechain-types";

describe("[manage-pocket]", async function () {
  let fixtures: Awaited<ReturnType<typeof deployFixtures>>;

  before(async () => {
    fixtures = await loadFixture(deployFixtures);
  });

  it("test mainnet fork", async () => {
    const ERC20Factory = new ERC20__factory(fixtures.owner);
    const WBNB = ERC20Factory.attach(
      "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"
    );

    console.log(
      await WBNB.balanceOf("0x6fe9e9de56356f7edbfcbb29fab7cd69471a4869")
    );
  });
});
