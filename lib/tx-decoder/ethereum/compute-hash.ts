import { keccak256, serializeTransaction, type Hex } from "viem";

function toBigIntOrUndefined(value: string | number | undefined): bigint | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  if (s === "") return undefined;
  return BigInt(s.startsWith("0x") || s.startsWith("0X") ? s : s);
}

function computeJsonSigningHash(trimmed: string): string {
  const end = trimmed.lastIndexOf("}");
  const json = JSON.parse(trimmed.slice(0, end + 1)) as Record<string, unknown>;

  const chainId = json.chainId !== undefined ? Number(json.chainId) : undefined;
  const nonce = json.nonce !== undefined ? Number(json.nonce) : undefined;
  const gas = toBigIntOrUndefined((json.gas ?? json.gasLimit) as string | number | undefined);
  const to = json.to as Hex | undefined;
  const value = toBigIntOrUndefined(json.value as string | number | undefined);
  const data = json.data as Hex | undefined;
  const maxFeePerGas = toBigIntOrUndefined(json.maxFeePerGas as string | number | undefined);
  const maxPriorityFeePerGas = toBigIntOrUndefined(json.maxPriorityFeePerGas as string | number | undefined);
  const gasPrice = toBigIntOrUndefined(json.gasPrice as string | number | undefined);

  let serialized: Hex;

  if (maxFeePerGas !== undefined) {
    serialized = serializeTransaction({ type: "eip1559", chainId, nonce, gas, to, value, data, maxFeePerGas, maxPriorityFeePerGas });
  } else if (gasPrice !== undefined) {
    serialized = serializeTransaction({ type: "legacy", chainId, nonce, gas, to, value, data, gasPrice });
  } else {
    serialized = serializeTransaction({ type: "legacy", chainId, nonce, gas, to, value, data });
  }

  return keccak256(serialized);
}

export default async function computeEthereumHash(input: string): Promise<string> {
  const trimmed = input.trim();

  if (trimmed.startsWith("{")) {
    return computeJsonSigningHash(trimmed);
  }

  const hex = (trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`) as Hex;
  return keccak256(hex);
}
