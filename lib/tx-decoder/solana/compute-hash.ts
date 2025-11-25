import { createTransactionFromPayload } from './decoders';

const isHexPayload = (value: string): boolean => {
  return /^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0;
};

const computeSolanaHash = async (rawTx: string): Promise<string> => {
  try {
    const input = rawTx.trim();

    if (!input) {
      throw new Error('Transaction payload is empty');
    }

    let bytesToHash: Uint8Array;

    // If input is hex, hash the raw hex bytes directly (like minitel does)
    if (isHexPayload(input)) {
      bytesToHash = new Uint8Array(
        input.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) || []
      );
    } else if (input.startsWith('{')) {
      // Fireblocks JSON format - serialize the message
      const transaction = createTransactionFromPayload(input);
      const serializedMessage = transaction.serializeMessage();
      bytesToHash = new Uint8Array(serializedMessage);
    } else {
      throw new Error('Invalid transaction payload format. Expected hex string or Fireblocks JSON.');
    }

    // Compute SHA-256 hash
    const arrayBuffer = new ArrayBuffer(bytesToHash.length);
    new Uint8Array(arrayBuffer).set(bytesToHash);
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    throw new Error(
      `Failed to compute Solana hash: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

export default computeSolanaHash;

