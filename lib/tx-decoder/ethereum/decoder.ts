import { parseTransaction, formatEther, recoverTransactionAddress, type Hex, type TransactionSerialized } from "viem";
import type { EthereumDecodedTransaction } from "../types";

type FireblocksEthTx = {
  to?: string;
  value?: string | number;
  data?: string;
  chainId?: string | number;
  nonce?: number;
  gas?: string | number;
  gasLimit?: string | number;
  gasPrice?: string | number;
  maxFeePerGas?: string | number;
  maxPriorityFeePerGas?: string | number;
};

const TX_TYPE_LABELS: Record<string, string> = {
  legacy: "legacy (type 0)",
  eip2930: "EIP-2930 (type 1)",
  eip1559: "EIP-1559 (type 2)",
};

function toBigInt(value: string | number | undefined): bigint {
  if (value === undefined || value === null) return 0n;
  const s = String(value).trim().replace(/^["']|["']$/g, "");
  if (s === "") return 0n;
  const isHex = s.startsWith("0x") || s.startsWith("0X");
  if (isHex && !/^0[xX][0-9a-fA-F]+$/.test(s)) {
    throw new Error(`Invalid hex value: ${s}`);
  }
  return BigInt(isHex ? s : s);
}

function formatValue(wei: bigint): { wei: string; eth: string } {
  return { wei: wei.toString(10), eth: formatEther(wei) };
}

function extractSelector(input: string): string | undefined {
  return input.length >= 10 && input !== "0x" ? input.slice(0, 10) : undefined;
}

function normalizeHex(input: string): Hex {
  return (input.startsWith("0x") ? input : `0x${input}`) as Hex;
}

function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

function parseFireblocksEthTx(json: FireblocksEthTx): EthereumDecodedTransaction {
  const valueWei = toBigInt(json.value ?? "0");
  const input = json.data ?? "0x";
  const gasRaw = json.gas ?? json.gasLimit;

  return stripUndefined({
    chainId: json.chainId !== undefined ? String(json.chainId) : undefined,
    nonce: json.nonce,
    to: json.to,
    value: formatValue(valueWei),
    gasLimit: gasRaw !== undefined ? String(gasRaw) : undefined,
    gasPrice: json.gasPrice !== undefined ? String(json.gasPrice) : undefined,
    maxFeePerGas: json.maxFeePerGas !== undefined ? String(json.maxFeePerGas) : undefined,
    maxPriorityFeePerGas:
      json.maxPriorityFeePerGas !== undefined ? String(json.maxPriorityFeePerGas) : undefined,
    input: input !== "0x" ? input : undefined,
    selector: extractSelector(input),
  } as EthereumDecodedTransaction);
}

async function parseRawEthTx(hexInput: string): Promise<EthereumDecodedTransaction> {
  const hex = normalizeHex(hexInput) as TransactionSerialized;
  const tx = parseTransaction(hex);

  const valueWei = tx.value ?? 0n;
  const input = tx.data ?? "0x";

  let from: string | undefined;
  try {
    from = await recoverTransactionAddress({ serializedTransaction: hex });
  } catch {
    from = undefined;
  }

  const result: EthereumDecodedTransaction = {
    type: TX_TYPE_LABELS[tx.type ?? "legacy"] ?? tx.type ?? "unknown",
    chainId: tx.chainId !== undefined ? String(tx.chainId) : undefined,
    nonce: tx.nonce,
    to: tx.to ?? undefined,
    from,
    value: formatValue(valueWei),
    gasLimit: tx.gas !== undefined ? tx.gas.toString(10) : undefined,
    input: input !== "0x" ? input : undefined,
    selector: extractSelector(input),
  };

  if (tx.type === "eip1559") {
    result.maxFeePerGas = (tx.maxFeePerGas ?? 0n).toString(10);
    result.maxPriorityFeePerGas = (tx.maxPriorityFeePerGas ?? 0n).toString(10);
  } else if (tx.type === "eip2930" || tx.type === "legacy") {
    if ("gasPrice" in tx && tx.gasPrice !== undefined) {
      result.gasPrice = tx.gasPrice.toString(10);
    }
  }

  if ("accessList" in tx && tx.accessList && tx.accessList.length > 0) {
    result.accessList = tx.accessList;
  }

  if ("v" in tx && tx.v !== undefined) {
    result.signature = {
      v: String(tx.v),
      r: tx.r ?? undefined,
      s: tx.s ?? undefined,
    };
  }

  return result;
}

export async function parseEthereumTx(input: string): Promise<EthereumDecodedTransaction> {
  const trimmed = input.trim();

  if (trimmed.startsWith("{")) {
    const end = trimmed.lastIndexOf("}");
    if (end === -1) throw new Error("Invalid JSON: missing closing }");
    let json: FireblocksEthTx;
    try {
      json = JSON.parse(trimmed.slice(0, end + 1)) as FireblocksEthTx;
    } catch (err) {
      throw new Error(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
    return parseFireblocksEthTx(json);
  }

  return parseRawEthTx(trimmed);
}
