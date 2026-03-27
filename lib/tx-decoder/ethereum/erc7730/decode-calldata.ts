import { keccak256, toBytes, decodeAbiParameters, type AbiParameter } from "viem";
import type {
  Erc7730Descriptor,
  Erc7730DecodeResult,
  DecodedField,
  DecodedFieldValue,
} from "./types";

import erc20Descriptor from "./descriptors/erc20.json";
import erc4626Descriptor from "./descriptors/erc4626.json";
import wethDescriptor from "./descriptors/weth.json";
import figmentDescriptor from "./descriptors/figment-staking-router.json";

const ALL_DESCRIPTORS: Erc7730Descriptor[] = [
  erc20Descriptor as unknown as Erc7730Descriptor,
  erc4626Descriptor as unknown as Erc7730Descriptor,
  wethDescriptor as unknown as Erc7730Descriptor,
  figmentDescriptor as unknown as Erc7730Descriptor,
];

// Strip parameter name from a single param token, e.g.:
//   "bytes[] pubkeys"       → "bytes[]"
//   "uint256 _value"        → "uint256"
//   "(address,uint256) foo" → "(address,uint256)"
function stripParamName(token: string): string {
  const t = token.trim();
  if (t.startsWith("(")) {
    return t.slice(0, t.lastIndexOf(")") + 1);
  }
  return t.split(/\s+/)[0];
}

// Split a comma-separated param list respecting parenthesis depth.
function splitParams(inner: string): string[] {
  if (!inner.trim()) return [];
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of inner) {
    if (ch === "(") { depth++; current += ch; }
    else if (ch === ")") { depth--; current += ch; }
    else if (ch === "," && depth === 0) { parts.push(current.trim()); current = ""; }
    else { current += ch; }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

// Normalize a Solidity signature to canonical (no names, no spaces) form.
// "transfer(address _to, uint256 _value)" → "transfer(address,uint256)"
function normalizeSignature(signature: string): string {
  const open = signature.indexOf("(");
  const close = signature.lastIndexOf(")");
  if (open === -1 || close === -1) return signature;
  const name = signature.slice(0, open);
  const types = splitParams(signature.slice(open + 1, close)).map(stripParamName);
  return `${name}(${types.join(",")})`;
}

function computeSelector(functionSignature: string): string {
  return keccak256(toBytes(normalizeSignature(functionSignature))).slice(0, 10);
}

// Returns bare type strings for ABI decoding (strips names).
function extractParamTypes(signature: string): string[] {
  const open = signature.indexOf("(");
  const close = signature.lastIndexOf(")");
  if (open === -1 || close === -1) return [];
  return splitParams(signature.slice(open + 1, close)).map(stripParamName);
}

// Normalize intent to a display string (handles string or object forms).
function normalizeIntent(intent: string | Record<string, string>): string {
  if (typeof intent === "string") return intent;
  return Object.entries(intent)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

type SelectorEntry = {
  descriptor: Erc7730Descriptor;
  signature: string;
  format: Erc7730Descriptor["display"]["formats"][string];
  paramTypes: string[];
};

const selectorMap = new Map<string, SelectorEntry>();

for (const descriptor of ALL_DESCRIPTORS) {
  for (const [signature, format] of Object.entries(descriptor.display.formats)) {
    const selector = computeSelector(signature);
    if (!selectorMap.has(selector)) {
      selectorMap.set(selector, { descriptor, signature, format, paramTypes: extractParamTypes(signature) });
    }
  }
}

function decodeParams(
  paramTypes: string[],
  calldata: `0x${string}`
): readonly unknown[] | null {
  if (paramTypes.length === 0) return [];
  try {
    const abiParams: AbiParameter[] = paramTypes.map((type, i) => ({ type, name: `param${i}` }));
    return decodeAbiParameters(abiParams, `0x${calldata.slice(10)}` as `0x${string}`);
  } catch {
    return null;
  }
}

function mapFieldValue(
  paramTypes: string[],
  paramNames: string[],
  decodedValues: readonly unknown[],
  fieldPath: string
): DecodedFieldValue {
  const idx = paramNames.indexOf(fieldPath);
  if (idx === -1 || idx >= decodedValues.length) {
    return { kind: "raw", value: String(decodedValues[0] ?? "") };
  }
  const raw = decodedValues[idx];
  const type = paramTypes[idx] ?? "bytes";
  if (type === "address") return { kind: "address", value: String(raw) };
  if (type === "uint256" || type.startsWith("uint")) return { kind: "uint256", value: String(raw) };
  return { kind: "raw", value: String(raw) };
}

export function decodeCalldata(calldata: string): Erc7730DecodeResult {
  if (!calldata || calldata === "0x" || calldata.length < 10) {
    return { kind: "unknown", selector: "0x", rawCalldata: calldata ?? "0x" };
  }

  const selector = calldata.slice(0, 10).toLowerCase();
  const entry = selectorMap.get(selector);

  if (!entry) {
    return { kind: "unknown", selector, rawCalldata: calldata };
  }

  const paramNames = entry.format.fields.map((f) => f.path ?? "");
  const decodedValues = decodeParams(entry.paramTypes, calldata as `0x${string}`);

  if (decodedValues === null) {
    return { kind: "unknown", selector, rawCalldata: calldata };
  }

  const fields: DecodedField[] = entry.format.fields.map((field) => ({
    path: field.path,
    label: field.label,
    format: field.format,
    params: field.params,
    visible: field.visible,
    decoded: field.path
      ? mapFieldValue(entry.paramTypes, paramNames, decodedValues, field.path)
      : { kind: "raw", value: "" },
  }));

  const meta = entry.descriptor.metadata;

  return {
    kind: "matched",
    intent: normalizeIntent(entry.format.intent),
    interpolatedIntent: entry.format.interpolatedIntent,
    contractName: meta.contractName,
    functionSignature: entry.signature,
    selector,
    fields,
    decimals: meta.decimals,
    token: meta.token,
    enums: meta.enums,
  };
}
