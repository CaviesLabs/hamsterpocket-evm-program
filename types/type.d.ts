import Web3 from "web3";
import { Web3BaseWalletAccount } from "web3-types/lib/types";

declare module "hardhat" {
  const web3: Web3;
  const web3Signer: Web3BaseWalletAccount;
  export { web3, Web3, web3Signer };
}
