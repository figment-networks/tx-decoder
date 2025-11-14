export interface SignatureInfo {
  publicKey: string | null;
  signature: string | null;
}

export interface AccountMetadata {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
}

export interface DecodedInstruction {
  type: string;
  instructionCode?: number;
  [key: string]: any;
}

export interface InstructionData {
  index: number;
  programId: string;
  programName: string;
  decoded: DecodedInstruction;
  keys: AccountMetadata[];
}

export interface DecodedTransaction {
  feePayer: string | null;
  recentBlockhash: string | null;
  signatures: SignatureInfo[];
  instructions: InstructionData[];
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
