import {
  createTransactionFromFireblocksJson,
  isFireblocksJsonPayload,
  isHexPayload,
} from './decoder';

const computeSuiHash = async (rawTx: string): Promise<string> => {
  try {
    const input = rawTx.trim();

    let transactionUint8Array: Uint8Array;

    if (isFireblocksJsonPayload(input)) {
      // Handle Fireblocks JSON format
      transactionUint8Array = createTransactionFromFireblocksJson(input);
    } else if (isHexPayload(input)) {
      // Handle hex format
      const cleanHex = input.startsWith('0x') ? input.slice(2) : input;
      transactionUint8Array = new Uint8Array(
        cleanHex.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) || []
      );
    } else {
      throw new Error('Invalid transaction payload format. Expected hex string or Fireblocks JSON.');
    }

    // Create a new ArrayBuffer to ensure compatibility with crypto.subtle.digest
    const arrayBuffer = new ArrayBuffer(transactionUint8Array.length);
    new Uint8Array(arrayBuffer).set(transactionUint8Array);
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    throw new Error(
      `Failed to compute Sui hash: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

export default computeSuiHash;