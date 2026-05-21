import {
  decodeAbiParameters,
  toFunctionSelector,
  parseAbiItem,
  type AbiFunction,
  type AbiParameter,
} from "viem";
import type {
  Erc7730Descriptor,
  Erc7730DecodeResult,
  DecodedField,
  DecodedFieldValue,
} from "./types";

import erc20Descriptor from "./descriptors/erc20.json";
import erc4626Descriptor from "./descriptors/erc4626.json";
import figmentDescriptor from "./descriptors/figment-staking-router.json";
import withdrawalRequestDescriptor from "./descriptors/withdrawal-request-contract.json";
import consolidationRequestDescriptor from "./descriptors/consolidation-request-contract.json";

const ALL_DESCRIPTORS: Erc7730Descriptor[] = [
  erc20Descriptor as Erc7730Descriptor,
  erc4626Descriptor as Erc7730Descriptor,
  figmentDescriptor as Erc7730Descriptor,
  withdrawalRequestDescriptor as Erc7730Descriptor,
  consolidationRequestDescriptor as Erc7730Descriptor,
];

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
  inputs: readonly AbiParameter[];
};

const selectorMap = new Map<string, SelectorEntry>();

type RawLayoutEntry = {
  descriptor: Erc7730Descriptor;
  rawLayout: NonNullable<Erc7730Descriptor["display"]["rawLayout"]>;
};
const addressMap = new Map<string, RawLayoutEntry>();

for (const descriptor of ALL_DESCRIPTORS) {
  for (const [signature, format] of Object.entries(descriptor.display.formats)) {
    const selector = toFunctionSelector(`function ${signature}`);
    if (!selectorMap.has(selector)) {
      const { inputs } = parseAbiItem(`function ${signature}`) as AbiFunction;
      selectorMap.set(selector, { descriptor, signature, format, inputs });
    }
  }
  if (descriptor.display.rawLayout) {
    const rawLayout = descriptor.display.rawLayout;
    for (const { address } of (descriptor as unknown as { context: { contract: { deployments: { address: string }[] } } }).context.contract.deployments) {
      addressMap.set(address.toLowerCase(), { descriptor, rawLayout });
    }
  }
}

function mapFieldValue(
  inputs: readonly AbiParameter[],
  paramNames: string[],
  decodedValues: readonly unknown[],
  fieldPath: string
): DecodedFieldValue {
  const idx = paramNames.indexOf(fieldPath);
  if (idx === -1 || idx >= decodedValues.length) {
    return { kind: "raw", value: String(decodedValues[0] ?? "") };
  }
  const raw = decodedValues[idx];
  const type = inputs[idx]?.type ?? "bytes";
  if (type === "address") return { kind: "address", value: String(raw) };
  if (type.startsWith("uint")) return { kind: "uint256", value: String(raw) };
  return { kind: "raw", value: String(raw) };
}

function decodeRawLayout(calldata: string, entry: RawLayoutEntry): Erc7730DecodeResult {
  const hex = calldata.startsWith("0x") ? calldata.slice(2) : calldata;
  const fields: DecodedField[] = entry.rawLayout.fields.map((field) => {
    const start = field.byteOffset * 2;
    const end = start + field.byteLength * 2;
    const slice = hex.slice(start, end);
    const isNumeric = field.format === "unit" || field.format === "amount";
    const decoded: DecodedFieldValue = isNumeric
      ? { kind: "uint256", value: BigInt(`0x${slice}`).toString() }
      : { kind: "raw", value: `0x${slice}` };
    return { label: field.label, format: field.format, params: field.params, decoded };
  });

  const amountField = fields.find((f) => f.format === "unit" || f.format === "amount");
  const isFullExit = amountField?.decoded.value === "0";

  const rawFields = fields.filter((f) => f.decoded.kind === "raw");
  const isEqualBytes =
    rawFields.length >= 2 && rawFields[0].decoded.value === rawFields[1].decoded.value;

  const intent =
    (isFullExit && entry.rawLayout.zeroAmountIntent) ? entry.rawLayout.zeroAmountIntent
    : (isEqualBytes && entry.rawLayout.equalBytesIntent) ? entry.rawLayout.equalBytesIntent
    : entry.rawLayout.intent;

  return {
    kind: "matched",
    intent,
    contractName: entry.descriptor.metadata.contractName,
    selector: "",
    fields,
  };
}

export function decodeCalldata(calldata: string, to?: string): Erc7730DecodeResult {
  if (!calldata || calldata === "0x" || calldata.length < 10) {
    return { kind: "unknown", selector: "0x", rawCalldata: calldata ?? "0x" };
  }

  const selector = calldata.slice(0, 10).toLowerCase();
  const entry = selectorMap.get(selector);

  if (!entry) {
    if (to) {
      const rawEntry = addressMap.get(to.toLowerCase());
      if (rawEntry) return decodeRawLayout(calldata, rawEntry);
    }
    return { kind: "unknown", selector, rawCalldata: calldata };
  }

  const paramNames = entry.format.fields.map((f) => f.path ?? "");

  let decodedValues: readonly unknown[];
  if (entry.inputs.length === 0) {
    decodedValues = [];
  } else {
    try {
      decodedValues = decodeAbiParameters(
        entry.inputs,
        `0x${calldata.slice(10)}` as `0x${string}`
      );
    } catch {
      return { kind: "unknown", selector, rawCalldata: calldata };
    }
  }

  const fields: DecodedField[] = entry.format.fields.map((field) => ({
    path: field.path,
    label: field.label,
    format: field.format,
    params: field.params,
    visible: field.visible,
    decoded: field.path
      ? mapFieldValue(entry.inputs, paramNames, decodedValues, field.path)
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
