import { bech32 } from "bech32";

import type {
  CardanoDecodedTransaction,
  CardanoTransactionBody,
  CardanoValue,
} from "../types";

type CBORMajorType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface CBORHeader {
  majorType: CBORMajorType;
  additionalInfo: number;
}

interface DeserializerState {
  bytes: number[];
  offset: number;
}

const textDecoder = new TextDecoder();

const hexToBytes = (hex: string): number[] => {
  const trimmedHex = hex.trim();
  if (!trimmedHex) {
    throw new TypeError("Serialized transaction is empty");
  }

  if (trimmedHex.length % 2 !== 0) {
    throw new TypeError("Serialized transaction hex length must be even");
  }

  const bytes: number[] = [];
  for (let index = 0; index < trimmedHex.length; index += 2) {
    const byte = trimmedHex.slice(index, index + 2);
    const parsedByte = Number.parseInt(byte, 16);
    if (Number.isNaN(parsedByte)) {
      throw new TypeError(`Invalid hex byte: ${byte}`);
    }
    bytes.push(parsedByte);
  }

  return bytes;
};

const createState = (serializedHex: string): DeserializerState => ({
  bytes: hexToBytes(serializedHex),
  offset: 0,
});

const ensureAvailableBytes = (state: DeserializerState, length: number): void => {
  if (state.offset + length > state.bytes.length) {
    throw new RangeError("Unexpected end of input while reading transaction");
  }
};

const readByte = (state: DeserializerState): number => {
  ensureAvailableBytes(state, 1);
  const value = state.bytes[state.offset];
  state.offset += 1;
  return value;
};

const readBytes = (state: DeserializerState, length: number): number[] => {
  if (length === 0) {
    return [];
  }

  ensureAvailableBytes(state, length);
  const result = state.bytes.slice(state.offset, state.offset + length);
  state.offset += length;
  return result;
};

const readCBORHeader = (state: DeserializerState): CBORHeader => {
  const byte = readByte(state);
  const majorType = ((byte & 0xe0) >> 5) as CBORMajorType;
  const additionalInfo = byte & 0x1f;

  return {
    majorType,
    additionalInfo,
  };
};

const readUInt16 = (state: DeserializerState): number => {
  const [high, low] = readBytes(state, 2);
  return (high << 8) | low;
};

const readUInt32 = (state: DeserializerState): number => {
  const bytes = readBytes(state, 4);
  return (
    (bytes[0] << 24) |
    (bytes[1] << 16) |
    (bytes[2] << 8) |
    bytes[3]
  );
};

const readUInt64 = (state: DeserializerState): number => {
  const bytes = readBytes(state, 8);
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }

  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Encountered integer larger than MAX_SAFE_INTEGER");
  }

  return Number(value);
};

const readCBORLength = (state: DeserializerState, additionalInfo: number): number => {
  if (additionalInfo < 24) {
    return additionalInfo;
  }

  if (additionalInfo === 24) {
    return readByte(state);
  }

  if (additionalInfo === 25) {
    return readUInt16(state);
  }

  if (additionalInfo === 26) {
    return readUInt32(state);
  }

  if (additionalInfo === 27) {
    return readUInt64(state);
  }

  throw new RangeError(`Unsupported length encoding: ${additionalInfo}`);
};

const isByteArray = (value: CardanoValue): value is number[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "number");

const convertBytesToHex = (value: number[]): string =>
  value.map((byte) => byte.toString(16).padStart(2, "0")).join("");

const isRecord = (value: CardanoValue): value is Record<string, CardanoValue> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const formatCardanoValue = (value: CardanoValue): CardanoValue => {
  if (isByteArray(value)) {
    return convertBytesToHex(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => formatCardanoValue(entry));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, formatCardanoValue(entry)])
    );
  }

  return value;
};

const formatCoin = (value: CardanoValue): string | null => {
  if (typeof value === "number") {
    return value.toString();
  }

  if (typeof value === "string") {
    return value;
  }

  if (isByteArray(value)) {
    return convertBytesToHex(value);
  }

  return null;
};

const stringifyMapKey = (key: CardanoValue): string => {
  if (typeof key === "string") {
    return key;
  }

  if (typeof key === "number") {
    return key.toString(10);
  }

  if (typeof key === "boolean") {
    return key ? "true" : "false";
  }

  if (key === null) {
    return "null";
  }

  if (isByteArray(key)) {
    return convertBytesToHex(key);
  }

  if (Array.isArray(key) || isRecord(key)) {
    return JSON.stringify(formatCardanoValue(key));
  }

  return String(key);
};

const encodeBech32Address = (bytes: number[]): string | null => {
  if (!Array.isArray(bytes) || bytes.length === 0) {
    return null;
  }

  try {
    const header = bytes[0];
    const addressType = header >> 4;
    const networkId = header & 0x0f;
    const isRewardAddress = addressType === 14 || addressType === 15;
    const isMainnet = networkId === 1;
    const basePrefix = isMainnet ? "addr" : "addr_test";
    const rewardPrefix = isMainnet ? "stake" : "stake_test";
    const hrp = isRewardAddress ? rewardPrefix : basePrefix;
    const words = bech32.toWords(Uint8Array.from(bytes));
    return bech32.encode(hrp, words, 1023);
  } catch {
    return convertBytesToHex(bytes);
  }
};

const formatAddress = (value: CardanoValue): string | null => {
  if (typeof value === "string") {
    return value;
  }

  if (isByteArray(value)) {
    return encodeBech32Address(value) ?? convertBytesToHex(value);
  }

  return null;
};

const formatAmount = (
  value: CardanoValue
): { coin: string | null; multiasset: CardanoValue | null } => {
  if (typeof value === "number" || typeof value === "string" || isByteArray(value)) {
    return {
      coin: formatCoin(value),
      multiasset: null,
    };
  }

  if (Array.isArray(value)) {
    const [coinEntry, multiassetEntry] = value;
    const coin = formatCoin(coinEntry);
    if (multiassetEntry === undefined || multiassetEntry === null) {
      return {
        coin,
        multiasset: null,
      };
    }

    return {
      coin,
      multiasset: formatCardanoValue(multiassetEntry),
    };
  }

  if (isRecord(value)) {
    const coinEntry = value["0"] ?? value["coin"] ?? null;
    const multiassetEntry = value["1"] ?? value["multiasset"] ?? null;
    const coin = coinEntry === null ? null : formatCoin(coinEntry);
    if (multiassetEntry === null || multiassetEntry === undefined) {
      return {
        coin,
        multiasset: null,
      };
    }

    return {
      coin,
      multiasset: formatCardanoValue(multiassetEntry),
    };
  }

  return {
    coin: formatCoin(value),
    multiasset: null,
  };
};

const formatOutputFromArray = (entry: CardanoValue[]): CardanoValue => {
  const [addressEntry, amountEntry, datumEntry, scriptRefEntry] = entry;
  const plutusData = datumEntry === undefined || datumEntry === null
    ? null
    : formatCardanoValue(datumEntry);
  const scriptRef = scriptRefEntry === undefined || scriptRefEntry === null
    ? null
    : formatCardanoValue(scriptRefEntry);

  return {
    address: formatAddress(addressEntry),
    amount: formatAmount(amountEntry),
    plutus_data: plutusData,
    script_ref: scriptRef,
  };
};

const formatOutputFromRecord = (
  entry: Record<string, CardanoValue>
): CardanoValue => {
  const addressEntry = entry["0"] ?? entry["address"] ?? null;
  const amountEntry = entry["1"] ?? entry["amount"] ?? null;
  const datumEntry = entry["2"] ?? entry["plutus_data"] ?? null;
  const scriptRefEntry = entry["3"] ?? entry["script_ref"] ?? null;
  const paymentCredentialEntry =
    entry["payment_credential_hash"] ?? entry["4"] ?? null;

  const plutusData = datumEntry === undefined || datumEntry === null
    ? null
    : formatCardanoValue(datumEntry);
  const scriptRef = scriptRefEntry === undefined || scriptRefEntry === null
    ? null
    : formatCardanoValue(scriptRefEntry);
  const amount = amountEntry === null ? null : formatAmount(amountEntry);

  const formatted: Record<string, CardanoValue | null> = {
    address: formatAddress(addressEntry),
    amount,
    plutus_data: plutusData,
    script_ref: scriptRef,
  };

  if (paymentCredentialEntry !== null && paymentCredentialEntry !== undefined) {
    formatted.payment_credential_hash = formatCardanoValue(paymentCredentialEntry);
  }

  const reservedKeys = new Set([
    "0",
    "1",
    "2",
    "3",
    "4",
    "address",
    "amount",
    "plutus_data",
    "script_ref",
    "payment_credential_hash",
  ]);

  for (const [key, value] of Object.entries(entry)) {
    if (reservedKeys.has(key)) {
      continue;
    }

    formatted[key] = formatCardanoValue(value);
  }

  return formatted;
};

const formatOutputEntry = (entry: CardanoValue): CardanoValue => {
  if (Array.isArray(entry)) {
    return formatOutputFromArray(entry);
  }

  if (isRecord(entry)) {
    return formatOutputFromRecord(entry);
  }

  return formatCardanoValue(entry);
};

const formatOutputs = (value: CardanoValue): CardanoValue => {
  if (Array.isArray(value)) {
    return value.map((entry) => formatOutputEntry(entry));
  }

  return formatCardanoValue(value);
};

const parseIndex = (value: CardanoValue): number | null => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
};

const formatInputs = (value: CardanoValue): CardanoValue => {
  if (Array.isArray(value)) {
    return value.map((entry) => {
      if (Array.isArray(entry) && entry.length >= 2) {
        const [transactionIdEntry, indexEntry] = entry;
        let transactionId: string | null = null;
        if (typeof transactionIdEntry === "string") {
          transactionId = transactionIdEntry;
        } else if (isByteArray(transactionIdEntry)) {
          transactionId = convertBytesToHex(transactionIdEntry);
        }
        const index = parseIndex(indexEntry);

        return {
          transaction_id: typeof transactionId === "string" ? transactionId : null,
          index,
        };
      }

      return formatCardanoValue(entry);
    });
  }

  return formatCardanoValue(value);
};

const formatFee = (value: CardanoValue): CardanoValue => {
  const coin = formatCoin(value);
  if (coin !== null) {
    return coin;
  }
  return formatCardanoValue(value);
};

const CARDANO_BODY_FIELD_MAP: Record<string, string> = {
  0: "inputs",
  1: "outputs",
  2: "fee",
  3: "ttl",
  4: "certs",
  5: "withdrawals",
  6: "update",
  7: "auxiliary_data_hash",
  8: "validity_start_interval",
  9: "mint",
  10: "script_data_hash",
  11: "collateral",
  12: "required_signers",
  13: "network_id",
  14: "collateral_return",
  15: "total_collateral",
  16: "reference_inputs",
  17: "voting_procedures",
  18: "voting_proposals",
  19: "donation",
  20: "current_treasury_value",
};

const formatters: Record<string, (value: CardanoValue) => CardanoValue | null> = {
  inputs: formatInputs,
  outputs: formatOutputs,
  fee: formatFee,
};

const createDefaultTransactionBody = (): CardanoTransactionBody => ({
  inputs: null,
  outputs: null,
  fee: null,
  ttl: null,
  certs: null,
  withdrawals: null,
  update: null,
  auxiliary_data_hash: null,
  validity_start_interval: null,
  mint: null,
  script_data_hash: null,
  collateral: null,
  required_signers: null,
  network_id: null,
  collateral_return: null,
  total_collateral: null,
  reference_inputs: null,
  voting_procedures: null,
  voting_proposals: null,
  donation: null,
  current_treasury_value: null,
});

const readFloatFromBytes = (bytes: number[]): number => {
  const buffer = new ArrayBuffer(bytes.length);
  const view = new Uint8Array(buffer);
  view.set(bytes);

  if (bytes.length === 2) {
    const half = new DataView(buffer).getUint16(0);
    const sign = (half & 0x8000) ? -1 : 1;
    const exponent = (half & 0x7c00) >> 10;
    const fraction = half & 0x03ff;

    if (exponent === 0) {
      if (fraction === 0) {
        return sign * 0;
      }
      return sign * Math.pow(2, -14) * (fraction / 0x0400);
    }

    if (exponent === 0x1f) {
      if (fraction === 0) {
        return sign * Number.POSITIVE_INFINITY;
      }
      return Number.NaN;
    }

    return sign * Math.pow(2, exponent - 15) * (1 + fraction / 0x0400);
  }

  if (bytes.length === 4) {
    return new DataView(buffer).getFloat32(0, false);
  }

  return new DataView(buffer).getFloat64(0, false);
};

const readUnsignedInteger = (
  state: DeserializerState,
  additionalInfo: number
): number => readCBORLength(state, additionalInfo);

const readNegativeInteger = (
  state: DeserializerState,
  additionalInfo: number
): number => -1 - readCBORLength(state, additionalInfo);

const readByteStringValue = (
  state: DeserializerState,
  additionalInfo: number
): number[] => {
  const length = readCBORLength(state, additionalInfo);
  return readBytes(state, length);
};

const readTextStringValue = (
  state: DeserializerState,
  additionalInfo: number
): string => {
  const length = readCBORLength(state, additionalInfo);
  const textBytes = readBytes(state, length);
  return textDecoder.decode(new Uint8Array(textBytes));
};

const readArrayValue = (
  state: DeserializerState,
  additionalInfo: number
): CardanoValue[] => {
  const length = readCBORLength(state, additionalInfo);
  const array: CardanoValue[] = [];
  for (let index = 0; index < length; index += 1) {
    array.push(readCBORValue(state));
  }
  return array;
};

const readMapValue = (
  state: DeserializerState,
  additionalInfo: number
): Record<string, CardanoValue> => {
  const length = readCBORLength(state, additionalInfo);
  const map: Record<string, CardanoValue> = {};
  for (let index = 0; index < length; index += 1) {
    const key = readCBORValue(state);
    const stringKey = stringifyMapKey(key);
    map[stringKey] = readCBORValue(state);
  }
  return map;
};

const readTaggedValue = (
  state: DeserializerState,
  additionalInfo: number
): { tag: number; value: CardanoValue } => {
  const tag = readCBORLength(state, additionalInfo);
  const value = readCBORValue(state);
  return {
    tag,
    value,
  };
};

const readSpecialValue = (
  state: DeserializerState,
  additionalInfo: number
): CardanoValue => {
  if (additionalInfo === 20) {
    return false;
  }
  if (additionalInfo === 21) {
    return true;
  }
  if (additionalInfo === 22 || additionalInfo === 23) {
    return null;
  }
  if (additionalInfo === 24) {
    readByte(state);
    return null;
  }
  if (additionalInfo === 25) {
    return readFloatFromBytes(readBytes(state, 2));
  }
  if (additionalInfo === 26) {
    return readFloatFromBytes(readBytes(state, 4));
  }
  if (additionalInfo === 27) {
    return readFloatFromBytes(readBytes(state, 8));
  }

  throw new TypeError(`Unsupported special value: ${additionalInfo}`);
};

const readCBORValue = (state: DeserializerState): CardanoValue => {
  const { majorType, additionalInfo } = readCBORHeader(state);

  if (majorType === 0) {
    return readUnsignedInteger(state, additionalInfo);
  }
  if (majorType === 1) {
    return readNegativeInteger(state, additionalInfo);
  }
  if (majorType === 2) {
    return readByteStringValue(state, additionalInfo);
  }
  if (majorType === 3) {
    return readTextStringValue(state, additionalInfo);
  }
  if (majorType === 4) {
    return readArrayValue(state, additionalInfo);
  }
  if (majorType === 5) {
    return readMapValue(state, additionalInfo);
  }
  if (majorType === 6) {
    return readTaggedValue(state, additionalInfo);
  }
  if (majorType === 7) {
    return readSpecialValue(state, additionalInfo);
  }

  throw new TypeError(`Unsupported major type: ${majorType}`);
};

const formatTransactionBody = (
  body: CardanoValue
): CardanoTransactionBody | null => {
  if (!isRecord(body)) {
    return null;
  }

  const formatted = createDefaultTransactionBody();

  for (const [key, value] of Object.entries(body)) {
    const fieldName = CARDANO_BODY_FIELD_MAP[key] ?? `field_${key}`;
    const applyFormatter = formatters[fieldName];
    formatted[fieldName] = applyFormatter
      ? applyFormatter(value)
      : formatCardanoValue(value);
  }

  return formatted;
};

const formatTransaction = (
  transaction: CardanoValue
): CardanoDecodedTransaction => {
  if (Array.isArray(transaction)) {
    const [body, witnesses, isValid, auxiliary] = transaction;

    return {
      body: formatTransactionBody(body),
      witness_set: witnesses ? formatCardanoValue(witnesses) : null,
      is_valid: typeof isValid === "boolean" ? isValid : true,
      auxiliary_data: auxiliary ? formatCardanoValue(auxiliary) : null,
    };
  }

  return {
    body: null,
    witness_set: null,
    is_valid: null,
    auxiliary_data: null,
    raw: transaction,
  };
};

const deserializeCardanoTransaction = (
  serializedHex: string
): CardanoDecodedTransaction => {
  const state = createState(serializedHex);

  try {
    const transaction = readCBORValue(state);
    return formatTransaction(transaction);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      body: null,
      witness_set: null,
      is_valid: null,
      auxiliary_data: null,
      error: "Deserialization failed",
      message,
      raw: serializedHex,
    };
  }
};

export const decodeCardanoTransaction = (
  payload: string
): CardanoDecodedTransaction => deserializeCardanoTransaction(payload);