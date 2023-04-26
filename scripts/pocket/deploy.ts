import { ethers, upgrades } from "hardhat";
import { HamsterSwap } from "../../typechain-types";

async function main() {
  const SwapContract = await ethers.getContractFactory("HamsterSwap");
  const Swap = (await upgrades.deployProxy(SwapContract, [], {
    unsafeAllowCustomTypes: true,
  })) as HamsterSwap;

  await Swap.deployed();

  console.log("HamsterSwap deployed at:", Swap.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
