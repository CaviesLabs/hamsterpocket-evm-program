import { ethers } from "hardhat";
import {
  PocketChef,
  PocketChef__factory,
  PocketRegistry__factory,
  PocketVault__factory,
} from "../../typechain-types";
import { BigNumber } from "ethers";

const createPocket = (Chef: PocketChef) => {
  // Create pocket
  const pocket = {
    id: "6458e07dbbe9a9a182fbde5b",
    owner: "0xC988c21E794B0ad2008EAB90371d30eAd2c0c6f8",
    ammRouterAddress: "0x4648a43B2C14Da09FdF82B161150d3F634f40491",
    baseTokenAddress: "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
    targetTokenAddress: "0x6041fE60d443480F96546C927E0cE6E14A5741D4",
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
      {
        operator: "1",
        value: BigNumber.from(2),
      },
    ],
    frequency: "3600",
    openingPositionCondition: {
      value0: ethers.constants.WeiPerEther,
      value1: "0",
      operator: "1",
    },
    takeProfitCondition: {
      stopType: "1",
      value: ethers.constants.WeiPerEther,
    },
    stopLossCondition: {
      stopType: "1",
      value: ethers.constants.WeiPerEther,
    },
  };

  return Chef.createPocketAndDepositEther(pocket, {
    value: ethers.constants.WeiPerEther.div(BigNumber.from("10")),
  });
};

async function main() {
  const Addresses = {
    PocketVault: "0x2B7388Cf467d05f3979dDd3eAD8AfD8a0CE0076c",
    PocketRegistry: "0xA7671257D29a2fDC5c585Dc67D6F0EfF9cF9b457",
    PocketChef: "0x9ac25725B8465E70cc2458592C9104c0f06C8e87",
    Multicall3: "0x292A7C55443850a30A6BCC17aF306b4Dc8864476",
  };
  const signer = (await ethers.getSigners())[0];

  /**
   * @dev Deploy contract
   */
  const Chef = PocketChef__factory.connect(Addresses.PocketChef, signer);
  console.log("Loaded Chef contract at ", Chef.address);

  /**
   * @dev Deploy contract
   */
  const Registry = PocketRegistry__factory.connect(
    Addresses.PocketRegistry,
    signer
  );
  console.log("Loaded Registry contract at ", Registry.address);

  /**
   * @dev Deploy contract
   */
  const Vault = PocketVault__factory.connect(Addresses.PocketVault, signer);
  console.log("Loaded Vault contract at ", Vault.address);

  console.log(await createPocket(Chef));

  // await Registry.connect(signer).grantRole(
  //   Registry.OPERATOR(),
  //   signer.address
  // );

  // await Chef.tryMakingDCASwap("6458ac444b5220773f94b6e4");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
