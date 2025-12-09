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

const removeNullishEntries = <T>(value: T): T => {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => removeNullishEntries(entry))
      .filter(
        (entry): entry is (typeof entry) & CardanoValue =>
          entry !== null && entry !== undefined
      ) as unknown as T;
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(
      value as Record<string, unknown>
    )) {
      const cleaned = removeNullishEntries(entry);
      if (cleaned !== null && cleaned !== undefined) {
        result[key] = cleaned;
      }
    }
    return result as T;
  }

  return value;
};

interface TaggedCardanoValue extends Record<string, CardanoValue> {
  tag: number;
  value: CardanoValue;
}

const isTaggedCardanoValue = (
  value: CardanoValue
): value is TaggedCardanoValue =>
  isRecord(value) &&
  typeof value.tag === "number" &&
  Object.hasOwn(value, "value");

const unwrapTaggedValue = (value: CardanoValue): CardanoValue => {
  let current: CardanoValue = value;
  while (isTaggedCardanoValue(current) && current.tag === 258) {
    current = current.value;
  }
  return current;
};

const formatCardanoValue = (value: CardanoValue): CardanoValue => {
  const normalized = unwrapTaggedValue(value);

  if (isByteArray(normalized)) {
    return convertBytesToHex(normalized);
  }

  if (Array.isArray(normalized)) {
    return normalized.map((entry) => formatCardanoValue(entry));
  }

  if (isRecord(normalized)) {
    return Object.fromEntries(
      Object.entries(normalized).map(([key, entry]) => [
        key,
        formatCardanoValue(entry),
      ])
    );
  }

  return normalized;
};

const formatByteLikeToHex = (value: CardanoValue): string | null => {
  const normalized = unwrapTaggedValue(value);
  if (typeof normalized === "string") {
    return normalized;
  }

  if (isByteArray(normalized)) {
    return convertBytesToHex(normalized);
  }

  return null;
};

const formatCoin = (value: CardanoValue): string | null => {
  const normalized = unwrapTaggedValue(value);

  if (typeof normalized === "number") {
    return normalized.toString();
  }

  if (typeof normalized === "string") {
    return normalized;
  }

  if (isByteArray(normalized)) {
    return convertBytesToHex(normalized);
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
    return JSON.stringify(formatCardanoValue(key));
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
  const normalized = unwrapTaggedValue(value);

  if (typeof normalized === "string") {
    return normalized;
  }

  if (isByteArray(normalized)) {
    return encodeBech32Address(normalized) ?? convertBytesToHex(normalized);
  }

  return null;
};

const formatPoolId = (hash: string | null): string | null => {
  if (!hash) {
    return null;
  }

  try {
    const bytes = hexToBytes(hash);
    const words = bech32.toWords(Uint8Array.from(bytes));
    return bech32.encode("pool", words, 1023);
  } catch {
    return null;
  }
};

const formatAmount = (value: CardanoValue): CardanoValue => {
  const coin = formatCoin(value);
  return removeNullishEntries({
    coin: coin ?? null,
  });
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
  const normalized = unwrapTaggedValue(value);
  if (!Array.isArray(normalized)) {
    return formatCardanoValue(normalized);
  }

  return normalized
    .map((entry) => {
      const normalizedEntry = unwrapTaggedValue(entry);
      if (!Array.isArray(normalizedEntry) || normalizedEntry.length < 2) {
        return null;
      }
      const [transactionIdEntry, indexEntry] = normalizedEntry;
      const transactionId = formatByteLikeToHex(transactionIdEntry);
        const index = parseIndex(indexEntry);
      if (!transactionId || index === null) {
        return null;
      }
        return {
        transaction_id: transactionId,
          index,
        };
    })
    .filter(
      (entry): entry is { transaction_id: string; index: number } =>
        entry !== null
    );
};

const formatOutputs = (value: CardanoValue): CardanoValue => {
  const normalized = unwrapTaggedValue(value);
  if (!Array.isArray(normalized)) {
    return formatCardanoValue(normalized);
  }

  const outputs: CardanoValue[] = [];
  for (const entry of normalized) {
    const normalizedEntry = unwrapTaggedValue(entry);
    let formatted: CardanoValue | null = null;

    if (Array.isArray(normalizedEntry) && normalizedEntry.length >= 2) {
      const [addressEntry, amountEntry] = normalizedEntry;
      formatted = removeNullishEntries({
        address: formatAddress(addressEntry),
        amount: formatAmount(amountEntry),
      });
    } else if (isRecord(normalizedEntry)) {
      const addressEntry = normalizedEntry["0"] ?? normalizedEntry["address"];
      const amountEntry = normalizedEntry["1"] ?? normalizedEntry["amount"];
      formatted = removeNullishEntries({
        address: formatAddress(addressEntry ?? null),
        amount: amountEntry ? formatAmount(amountEntry) : null,
      });
    }

    if (formatted) {
      outputs.push(formatted);
    }
  }

  return outputs;
};

const formatStakeCredential = (
  value: CardanoValue
): Record<string, CardanoValue> | null => {
  const normalized = unwrapTaggedValue(value);
  if (Array.isArray(normalized) && normalized.length >= 2) {
    const [type, hashValue] = normalized;
    if (type === 0) {
      const hash = formatByteLikeToHex(hashValue);
      if (hash) {
        return { Key: hash };
      }
    }
  }

  const formatted = formatCardanoValue(normalized);
  return isRecord(formatted) ? formatted : null;
};

const formatStakeDelegationCertificate = (
  entry: CardanoValue[]
): CardanoValue | null => {
  if (entry.length < 3) {
    return null;
  }

  const [, credentialEntry, poolEntry] = entry;
  const stakeCredential = formatStakeCredential(credentialEntry);
  const poolKeyhash = formatByteLikeToHex(poolEntry);
  if (!stakeCredential || !poolKeyhash) {
    return null;
  }

  const poolId = formatPoolId(poolKeyhash);

  return {
    StakeDelegation: {
      stake_credential: stakeCredential,
      pool_keyhash: poolKeyhash,
      ...(poolId ? { pool_id: poolId } : {}),
    },
  };
};

const formatVoteDelegationCertificate = (
  entry: CardanoValue[]
): CardanoValue | null => {
  if (entry.length < 3) {
    return null;
  }

  const [, credentialEntry, drepEntry] = entry;
  const stakeCredential = formatStakeCredential(credentialEntry);
  const drep = unwrapTaggedValue(drepEntry);
  if (!stakeCredential) {
    return null;
  }

  if (Array.isArray(drep) && drep.length > 0) {
    const [kind] = drep;
    if (kind === 2 || kind === 3) {
      return {
        VoteDelegation: {
          stake_credential: stakeCredential,
          drep: kind === 2 ? "AlwaysAbstain" : "AlwaysNoConfidence",
        },
      };
    }
  }

  const identifier = formatByteLikeToHex(drep);
  if (!identifier) {
    return null;
  }

  return {
    VoteDelegation: {
      stake_credential: stakeCredential,
      drep: identifier,
    },
  };
};

const formatCerts = (value: CardanoValue): CardanoValue => {
  const normalized = unwrapTaggedValue(value);
  if (!Array.isArray(normalized)) {
    return [];
  }

  return normalized
    .map((entry) => {
      const normalizedEntry = unwrapTaggedValue(entry);
      if (!Array.isArray(normalizedEntry) || normalizedEntry.length === 0) {
        return null;
      }

      const [type] = normalizedEntry;
      if (type === 2) {
        return formatStakeDelegationCertificate(normalizedEntry);
      }
      if (type === 9) {
        return formatVoteDelegationCertificate(normalizedEntry);
      }
      return null;
    })
    .filter((entry): entry is Record<string, CardanoValue> => entry !== null);
};

const formatRequiredSigners = (value: CardanoValue): CardanoValue => {
  const normalized = unwrapTaggedValue(value);
  if (!Array.isArray(normalized)) {
    return [];
  }

  return normalized
    .map((entry) => formatByteLikeToHex(entry))
    .filter((entry): entry is string => typeof entry === "string");
};

const formatTTL = (value: CardanoValue): string | null => {
  const normalized = unwrapTaggedValue(value);
  if (typeof normalized === "number") {
    return normalized.toString();
  }
  if (typeof normalized === "string") {
    return normalized;
  }
  return null;
};

const NETWORK_ID_LABELS: Record<number, string> = {
  0: "Testnet",
  1: "Mainnet",
};

const formatNetworkId = (value: CardanoValue): string | null => {
  const normalized = unwrapTaggedValue(value);
  if (typeof normalized === "number") {
    return NETWORK_ID_LABELS[normalized] ?? normalized.toString();
  }
  if (typeof normalized === "string") {
    const parsed = Number.parseInt(normalized, 10);
    if (!Number.isNaN(parsed) && NETWORK_ID_LABELS[parsed]) {
      return NETWORK_ID_LABELS[parsed];
    }
    return normalized;
  }
  return null;
};

const CARDANO_BODY_FIELD_MAP: Record<string, keyof CardanoTransactionBody> = {
  0: "inputs",
  1: "outputs",
  2: "fee",
  3: "ttl",
  4: "certs",
  12: "required_signers",
  13: "network_id",
};

const formatters: Partial<
  Record<
    keyof CardanoTransactionBody,
    (value: CardanoValue) => CardanoValue | null
  >
> = {
  inputs: formatInputs,
  outputs: formatOutputs,
  fee: formatCoin,
  ttl: formatTTL,
  certs: formatCerts,
  required_signers: formatRequiredSigners,
  network_id: formatNetworkId,
};

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

  const formatted: CardanoTransactionBody = {};

  for (const [key, value] of Object.entries(body)) {
    const fieldName = CARDANO_BODY_FIELD_MAP[key];
    if (!fieldName) {
      continue;
    }
    const formatter = formatters[fieldName];
    formatted[fieldName] = formatter
      ? formatter(value)
      : formatCardanoValue(value);
  }

  return removeNullishEntries(formatted);
};

const formatTransaction = (
  transaction: CardanoValue
): CardanoDecodedTransaction => {
  if (Array.isArray(transaction)) {
    const [body, witnesses, isValid, auxiliary] = transaction;

    const formatted: CardanoDecodedTransaction = {
      body: formatTransactionBody(body),
      witness_set: witnesses ? formatCardanoValue(witnesses) : null,
      is_valid: typeof isValid === "boolean" ? isValid : true,
    };

    const formattedAuxiliary = auxiliary ? formatCardanoValue(auxiliary) : null;
    if (formattedAuxiliary !== null) {
      formatted.auxiliary_data = formattedAuxiliary;
    }

    return removeNullishEntries(formatted);
  }

  return removeNullishEntries({
    body: null,
    witness_set: null,
    is_valid: null,
    raw: transaction,
  });
};

const deserializeCardanoTransaction = (
  serializedHex: string
): CardanoDecodedTransaction => {
  const state = createState(serializedHex);

  try {
    const transaction = readCBORValue(state);
    return removeNullishEntries(formatTransaction(transaction));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return removeNullishEntries({
      body: null,
      witness_set: null,
      is_valid: null,
      error: "Deserialization failed",
      message,
      raw: serializedHex,
    });
  }
};

export const decodeCardanoTransaction = (
  payload: string
): CardanoDecodedTransaction => deserializeCardanoTransaction(payload);