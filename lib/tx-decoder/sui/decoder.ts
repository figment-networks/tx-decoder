import { Transaction } from '@mysten/sui/transactions';
import { fromHex } from '@mysten/sui/utils';
import type { SuiDecodedTransaction } from '../types';

type RawProgrammableTransaction = ReturnType<typeof Transaction.prototype.getData> & {
  programmableTransaction?: {
    inputs?: unknown[];
    commands?: unknown[];
    transactions?: unknown[];
  };
  inputs?: unknown[];
  commands?: unknown[];
  transactions?: unknown[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    // Base64 only contains ASCII characters, so charCodeAt is safe here
    // eslint-disable-next-line unicorn/prefer-code-point
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const resolveInputByIndex = (inputs: unknown[], index: number): unknown | null => {
  if (!Number.isInteger(index) || index < 0 || index >= inputs.length) {
    return null;
  }
  return inputs[index];
};

const resolveInputFromArgument = (argument: unknown, inputs: unknown[]): unknown | null => {
  if (!isRecord(argument)) {
    return null;
  }
  const inputIndex = argument.Input;
  if (typeof inputIndex !== 'number') {
    return null;
  }
  return resolveInputByIndex(inputs, inputIndex);
};

const decodeValidatorAddressFromInput = (input: unknown): string | null => {
  if (!isRecord(input)) {
    return null;
  }
  const pureField = input.Pure;
  if (!isRecord(pureField)) {
    return null;
  }
  const bytesBase64 = pureField.bytes;
  if (typeof bytesBase64 !== 'string') {
    return null;
  }
  const decodedBytes = base64ToBytes(bytesBase64);
  if (decodedBytes.length !== 32) {
    return null;
  }
  return `0x${bytesToHex(decodedBytes)}`;
};

const stripInternalSuiFields = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => stripInternalSuiFields(item));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
      (acc, [key, val]) => {
        if (key === '$kind') {
          return acc;
        }
        acc[key] = stripInternalSuiFields(val);
        return acc;
      },
      {}
    );
  }

  return value;
};

const resolveInputs = (data: RawProgrammableTransaction): unknown[] => {
  if (Array.isArray(data.inputs)) {
    return data.inputs;
  }
  if (Array.isArray(data.programmableTransaction?.inputs)) {
    return data.programmableTransaction.inputs;
  }
  throw new Error('Unsupported Sui transaction format: missing inputs');
};

const resolveCommands = (data: RawProgrammableTransaction): unknown[] => {
  if (Array.isArray(data.commands)) {
    return data.commands;
  }
  if (Array.isArray(data.programmableTransaction?.commands)) {
    return data.programmableTransaction.commands;
  }
  if (Array.isArray(data.programmableTransaction?.transactions)) {
    return data.programmableTransaction.transactions;
  }
  if (Array.isArray(data.transactions)) {
    return data.transactions;
  }
  throw new Error('Unsupported Sui transaction format: missing commands');
};

const extractValidatorAddresses = (inputs: unknown[], commands: unknown[]): string[] => {
  const validatorFunctions = new Set(['request_add_stake', 'request_add_delegator']);
  const addresses = new Set<string>();

  for (const command of commands) {
    if (!isRecord(command)) {
      continue;
    }
    const moveCall = command.MoveCall;
    if (!isRecord(moveCall)) {
      continue;
    }
    const moduleName = moveCall.module;
    if (typeof moduleName !== 'string' || moduleName !== 'sui_system') {
      continue;
    }
    const functionName = moveCall.function;
    if (typeof functionName !== 'string' || !validatorFunctions.has(functionName)) {
      continue;
    }
    const args = Array.isArray(moveCall.arguments) ? moveCall.arguments : [];
    const validatorArgument = args[2];
    const validatorInput = resolveInputFromArgument(validatorArgument, inputs);
    const address = decodeValidatorAddressFromInput(validatorInput);
    if (address) {
      addresses.add(address);
    }
  }

  return Array.from(addresses);
};

export const isHexPayload = (value: string): boolean => {
  const trimmed = value.trim();
  const cleanValue = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
  return /^[0-9a-fA-F]+$/.test(cleanValue) && cleanValue.length % 2 === 0;
};

export const isFireblocksJsonPayload = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{')) {
    return false;
  }
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    // Check if it has a transaction field (base64) or message.transaction field
    const hasTransactionField = typeof parsed.transaction === 'string';
    const hasMessageTransactionField =
      parsed.message &&
      typeof parsed.message === 'object' &&
      parsed.message !== null &&
      typeof (parsed.message as Record<string, unknown>).transaction === 'string';
    return hasTransactionField || Boolean(hasMessageTransactionField);
  } catch {
    return false;
  }
};

export const createTransactionFromFireblocksJson = (value: string): Uint8Array => {
  const parsed = JSON.parse(value) as Record<string, unknown>;
  
  // Check for transaction field at root or in message
  const transactionBase64 =
    (typeof parsed.transaction === 'string' ? parsed.transaction : null) ||
    (parsed.message &&
      typeof parsed.message === 'object' &&
      parsed.message !== null &&
      typeof (parsed.message as Record<string, unknown>).transaction === 'string'
      ? (parsed.message as Record<string, unknown>).transaction as string
      : null);

  if (!transactionBase64) {
    throw new Error('Invalid Fireblocks JSON payload: missing transaction field');
  }

  // Decode base64 to bytes
  try {
    // Handle base64url encoding (Fireblocks might use base64url)
    const base64 = transactionBase64.replaceAll('-', '+').replaceAll('_', '/');
    // Add padding if needed
    const paddedBase64 = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binaryString = atob(paddedBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      // Base64 only contains ASCII characters, so charCodeAt is safe here
      // eslint-disable-next-line unicorn/prefer-code-point
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    throw new Error(
      `Failed to decode base64 transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

export const parseSuiTx = async (rawTxHex: string): Promise<SuiDecodedTransaction> => {
  const trimmedPayload = rawTxHex.trim();
  
  if (!trimmedPayload) {
    throw new Error('Transaction payload is empty');
  }

  let txBytes: Uint8Array;

  if (isFireblocksJsonPayload(trimmedPayload)) {
    txBytes = createTransactionFromFireblocksJson(trimmedPayload);
  } else if (isHexPayload(trimmedPayload)) {
    const cleanHex = trimmedPayload.startsWith('0x') ? trimmedPayload.slice(2) : trimmedPayload;
    txBytes = fromHex(cleanHex);
  } else {
    throw new Error('Invalid transaction payload format. Expected hex string or Fireblocks JSON.');
  }

  const tx = Transaction.from(txBytes);
  const txData = tx.getData() as RawProgrammableTransaction;

  const inputs = resolveInputs(txData);
  const commands = resolveCommands(txData);
  const validatorAddresses = extractValidatorAddresses(inputs, commands);

  const filteredData = stripInternalSuiFields({
    version: txData.version,
    sender: txData.sender,
    validatorAddresses: validatorAddresses.length > 0 ? validatorAddresses : undefined,
    expiration: txData.expiration,
    gasData: txData.gasData,
    inputs,
    commands,
  }) as SuiDecodedTransaction;

  return filteredData;
};
