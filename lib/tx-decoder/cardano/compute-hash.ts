import { decode, encode } from 'cbor';
import { blake2b } from '@noble/hashes/blake2b';

const hexToBuffer = (hex: string): Buffer => {
  const trimmedHex = hex.trim();
  if (!trimmedHex) {
    throw new TypeError('Serialized transaction is empty');
  }
  if (trimmedHex.length % 2 !== 0) {
    throw new TypeError('Serialized transaction hex length must be even');
  }
  return Buffer.from(trimmedHex, 'hex');
};

const computeAdaHash = (rawTx: string): string => {
  try {
    const input = rawTx.trim();
    const buffer = hexToBuffer(input);
    
    const decoded = decode(buffer);
    
    let bodyValue: unknown;
    
    // Check if it's a full transaction array [body, witnesses, isValid, auxiliary_data]
    if (Array.isArray(decoded) && decoded.length > 0) {
      bodyValue = decoded[0];
    } else {
      bodyValue = decoded;
    }
    
    // Re-encode just the body to get the CBOR bytes
    const bodyBytesBuffer = encode(bodyValue);
    
    // Convert Buffer to Uint8Array for blake2b
    const bodyBytes = new Uint8Array(bodyBytesBuffer);
    
    // Compute Blake2b-256 hash of the transaction body
    const hash = blake2b(bodyBytes, { dkLen: 32 });
    return Array.from(hash)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    throw new Error(
      `Failed to compute ADA hash: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

export default computeAdaHash;
