import { Transaction } from '@mysten/sui/transactions';
import { fromHex } from '@mysten/sui/utils';

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

export const parseSuiTx = async (
  rawTxHex: string
): Promise<ReturnType<typeof Transaction.prototype.getData>> => {
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
  return tx.getData();
};
