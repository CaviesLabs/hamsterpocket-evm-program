import { ethers } from "hardhat";
import {
  IQuoter__factory,
  PocketChef,
  PocketChef__factory,
  PocketRegistry__factory,
  PocketVault__factory,
} from "../../typechain-types";
import { BigNumber } from "ethers";

const createPocket = (Chef: PocketChef) => {
  // Create pocket
  const pocket = {
    id: "645a6263a89e2b248aed58ad",
    owner: "0xC988c21E794B0ad2008EAB90371d30eAd2c0c6f8",
    ammRouterAddress: "0x4648a43B2C14Da09FdF82B161150d3F634f40491",
    baseTokenAddress: "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
    targetTokenAddress: "0xEEAd8f00306416147bb4445899392e8C72A310b6",
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

  // await Registry.whitelistAddress("0xEEAd8f00306416147bb4445899392e8C72A310b6", true);
  // await Vault.setQuoter("0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6");
  console.log(await createPocket(Chef));

  // await Registry.connect(signer).grantRole(
  //   Registry.OPERATOR(),
  //   signer.address
  // );

  // await Chef.tryMakingDCASwap("6458ac444b5220773f94b6e4");

  // console.log(await Vault.quoter());
  // console.log(
  //   await Vault.callStatic.getCurrentQuote(
  //     "0xEEAd8f00306416147bb4445899392e8C72A310b6",
  //     "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
  //     ethers.constants.WeiPerEther
  //   )
  // );
  //
  // const Quoter = IQuoter__factory.connect("0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6", signer);
  //
  // console.log(await Quoter.callStatic.quoteExactInputSingle(
  //   "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
  //   "0xEEAd8f00306416147bb4445899392e8C72A310b6",
  //   "3000",
  //   ethers.constants.WeiPerEther,
  //   "0"
  // ));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
