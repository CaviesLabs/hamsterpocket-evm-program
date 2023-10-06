import { ContractTransactionResponse } from "ethers";

export const ensureTransaction = async (tx: ContractTransactionResponse) => {
  const r = await tx.wait(5);
  console.log("Tx completed hash: ", r?.hash);
  return r;
};
