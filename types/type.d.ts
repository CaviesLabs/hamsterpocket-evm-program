import Web3 from "web3";

declare module "hardhat" {
  const web3: Web3;
  export { web3, Web3 };
}
