import { keccak256, type Hex } from "viem";

export default async function computeEthereumHash(input: string): Promise<string> {
  const trimmed = input.trim();

  if (trimmed.startsWith("{")) {
    throw new Error("Cannot compute hash for unsigned Fireblocks JSON transaction");
  }

  const hex = (trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`) as Hex;
  return keccak256(hex);
}
