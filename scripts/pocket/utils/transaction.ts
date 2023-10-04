import { ContractTransaction } from "ethers";

export const ensureTransaction = async (tx: ContractTransaction) => {
  const r = await tx.wait(5);
  console.log("Tx completed hash: ", r.transactionHash);
  return r;
};
