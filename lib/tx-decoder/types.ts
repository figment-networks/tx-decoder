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
  inputs: CardanoValue | null;
  outputs: CardanoValue | null;
  fee: CardanoValue | null;
  ttl: CardanoValue | null;
  certs: CardanoValue | null;
  withdrawals: CardanoValue | null;
  update: CardanoValue | null;
  auxiliary_data_hash: CardanoValue | null;
  validity_start_interval: CardanoValue | null;
  mint: CardanoValue | null;
  script_data_hash: CardanoValue | null;
  collateral: CardanoValue | null;
  required_signers: CardanoValue | null;
  network_id: CardanoValue | null;
  collateral_return: CardanoValue | null;
  total_collateral: CardanoValue | null;
  reference_inputs: CardanoValue | null;
  voting_procedures: CardanoValue | null;
  voting_proposals: CardanoValue | null;
  donation: CardanoValue | null;
  current_treasury_value: CardanoValue | null;
  [key: string]: CardanoValue | null | undefined;
}

export interface CardanoDecodedTransaction {
  body: CardanoTransactionBody | null;
  witness_set: CardanoValue | null;
  is_valid: boolean | null;
  auxiliary_data: CardanoValue | null;
  raw?: CardanoValue;
  error?: string;
  message?: string;
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
}
