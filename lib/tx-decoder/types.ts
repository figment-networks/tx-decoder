interface SolanaSignatureInfo {
  publicKey: string | null;
  signature: string | null;
}

interface SolanaAccountMetadata {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
}

export interface SolanaDecodedInstruction {
  type: string;
  instructionCode?: number;
  [key: string]: any;
}

export interface SolanaInstructionData {
  index: number;
  programId: string;
  programName: string;
  decoded: SolanaDecodedInstruction;
  keys: SolanaAccountMetadata[];
}

export interface SolanaDecodedTransaction {
  feePayer: string | null;
  recentBlockhash: string | null;
  signatures: SolanaSignatureInfo[];
  instructions: SolanaInstructionData[];
}

export type CardanoValue =
  | string
  | number
  | boolean
  | null
  | CardanoValue[]
  | { [key: string]: CardanoValue };

export interface CardanoTransactionBody {
  inputs?: CardanoValue;
  outputs?: CardanoValue;
  fee?: CardanoValue;
  ttl?: CardanoValue;
  certs?: CardanoValue;
  withdrawals?: CardanoValue;
  required_signers?: CardanoValue;
  network_id?: CardanoValue;
  [key: string]: CardanoValue | undefined;
}

export interface CardanoDecodedTransaction {
  body: CardanoTransactionBody | null;
  witness_set: CardanoValue | null;
  is_valid: boolean | null;
  auxiliary_data?: CardanoValue | null;
  raw?: CardanoValue;
  error?: string;
  message?: string;
}

export interface EthereumDecodedTransaction {
  type?: string;
  chainId?: string;
  nonce?: number;
  to?: string;
  from?: string;
  value: {
    wei: string;
    eth: string;
  };
  gasLimit?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  gasPrice?: string;
  accessList?: readonly {
    address: string;
    storageKeys: readonly string[];
  }[];
  input?: string;
  selector?: string;
  signature?: {
    v?: string;
    r?: string;
    s?: string;
  };
}

export interface SuiDecodedTransaction {
  version: number;
  sender: string;
  expiration: any;
  gasData: {
    payment: Array<{
      objectId: string;
      version: string;
      digest: string;
    }>;
    owner: string;
    price: string;
    budget: string;
  };
  inputs: any[];
  commands: any[];
  validatorAddresses?: string[];
}
