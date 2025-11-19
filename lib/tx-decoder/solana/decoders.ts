import {
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
  Message,
  StakeProgram,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

import type { SolanaDecodedInstruction, SolanaDecodedTransaction } from "../types";
import bs58 from "bs58";

const getStakeInstructionTypeMap: () => Record<number, string> = () => ({
  0: "Initialize",
  1: "Authorize",
  2: "DelegateStake",
  3: "Split",
  4: "Withdraw",
  5: "Deactivate",
  7: "Merge",
});

const getSystemInstructionTypeMap: () => Record<number, string> = () => ({
  0: "CreateAccount",
  2: "Transfer",
  8: "Allocate",
});

export const getProgramName = (programId: string): string => {
  if (programId === StakeProgram.programId.toBase58()) {
    return "Stake Program";
  }

  if (programId === SystemProgram.programId.toBase58()) {
    return "System Program";
  }

  if (programId === ComputeBudgetProgram.programId.toBase58()) {
    return "Compute Budget";
  }

  return "Unknown";
};

export const decodeInstruction = (
  instruction: any,
  programId: string
): SolanaDecodedInstruction => {
  if (programId === StakeProgram.programId.toBase58()) {
    return decodeStakeInstruction(instruction);
  }

  if (programId === SystemProgram.programId.toBase58()) {
    return decodeSystemInstruction(instruction);
  }

  if (programId === ComputeBudgetProgram.programId.toBase58()) {
    return decodeComputeBudgetInstruction(instruction);
  }

  return { type: "Unknown" };
};

const decodeStakeInstruction = (instruction: any): SolanaDecodedInstruction => {
  const dataBuffer = Buffer.from(instruction.data);
  if (dataBuffer.length === 0) {
    return { type: "Unknown" };
  }

  const instructionCode = dataBuffer.readUInt32LE(0);
  const typeMap = getStakeInstructionTypeMap();

  const decoded: SolanaDecodedInstruction = {
    type: typeMap[instructionCode] ?? "Unknown",
    instructionCode,
  };

  switch (instructionCode) {
    case 0: {
      decoded.stakeAccount = instruction.keys[0]?.pubkey.toBase58();
      if (instruction.keys[3]) {
        decoded.stakerAuthority = instruction.keys[3]?.pubkey.toBase58();
      }
      if (instruction.keys[4]) {
        decoded.withdrawerAuthority = instruction.keys[4]?.pubkey.toBase58();
      }
      break;
    }

    case 2: {
      decoded.stakeAccount = instruction.keys[0]?.pubkey.toBase58();
      decoded.voteAccount = instruction.keys[1]?.pubkey.toBase58();
      decoded.stakeAuthority = instruction.keys[5]?.pubkey.toBase58();
      break;
    }

    case 3: {
      decoded.sourceStakeAccount = instruction.keys[0]?.pubkey.toBase58();
      decoded.newStakeAccount = instruction.keys[1]?.pubkey.toBase58();
      decoded.stakeAuthority = instruction.keys[2]?.pubkey.toBase58();
      if (dataBuffer.length >= 12) {
        const lamports = dataBuffer.readBigUInt64LE(4);
        decoded.amount = (Number(lamports) / LAMPORTS_PER_SOL).toFixed(9);
        decoded.amountLamports = lamports.toString();
      }
      break;
    }

    case 4: {
      decoded.stakeAccount = instruction.keys[0]?.pubkey.toBase58();
      decoded.destination = instruction.keys[1]?.pubkey.toBase58();
      decoded.withdrawAuthority = instruction.keys[4]?.pubkey.toBase58();
      if (dataBuffer.length >= 12) {
        const lamports = dataBuffer.readBigUInt64LE(4);
        decoded.amount = (Number(lamports) / LAMPORTS_PER_SOL).toFixed(9);
        decoded.amountLamports = lamports.toString();
      }
      break;
    }

    case 5: {
      decoded.stakeAccount = instruction.keys[0]?.pubkey.toBase58();
      decoded.stakeAuthority = instruction.keys[2]?.pubkey.toBase58();
      break;
    }

    case 7: {
      decoded.destinationStakeAccount = instruction.keys[0]?.pubkey.toBase58();
      decoded.sourceStakeAccount = instruction.keys[1]?.pubkey.toBase58();
      decoded.stakeAuthority = instruction.keys[4]?.pubkey.toBase58();
      break;
    }
  }

  return decoded;
};

const decodeSystemInstruction = (instruction: any): SolanaDecodedInstruction => {
  const dataBuffer = Buffer.from(instruction.data);
  if (dataBuffer.length === 0) {
    return { type: "Unknown" };
  }

  const instructionCode = dataBuffer.readUInt32LE(0);
  const typeMap = getSystemInstructionTypeMap();

  const decoded: SolanaDecodedInstruction = {
    type: typeMap[instructionCode] ?? "Unknown",
    instructionCode,
  };

  switch (instructionCode) {
    case 0: {
      if (dataBuffer.length >= 20) {
        const lamports = dataBuffer.readBigUInt64LE(4);
        decoded.from = instruction.keys[0]?.pubkey.toBase58();
        decoded.newAccount = instruction.keys[1]?.pubkey.toBase58();
        decoded.amount = (Number(lamports) / LAMPORTS_PER_SOL).toFixed(9);
        decoded.amountLamports = lamports.toString();
      }
      break;
    }

    case 2: {
      if (dataBuffer.length >= 12) {
        const lamports = dataBuffer.readBigUInt64LE(4);
        decoded.from = instruction.keys[0]?.pubkey.toBase58();
        decoded.to = instruction.keys[1]?.pubkey.toBase58();
        decoded.amount = (Number(lamports) / LAMPORTS_PER_SOL).toFixed(9);
        decoded.amountLamports = lamports.toString();
      }
      break;
    }
  }

  return decoded;
};

const decodeComputeBudgetInstruction = (
  instruction: any
): SolanaDecodedInstruction => {
  const dataBuffer = Buffer.from(instruction.data);
  if (dataBuffer.length === 0) {
    return { type: "Unknown" };
  }

  const instructionCode = dataBuffer.readUInt8(0);
  const decoded: SolanaDecodedInstruction = {
    type: "Unknown",
    instructionCode,
  };

  switch (instructionCode) {
    case 3: {
      if (dataBuffer.length >= 9) {
        const microLamports = dataBuffer.readBigUInt64LE(1);
        decoded.type = "SetComputeUnitPrice";
        decoded.microLamports = microLamports.toString();
        decoded.priorityFee = (Number(microLamports) / 1_000_000).toFixed(9);
      }
      break;
    }

    case 2: {
      if (dataBuffer.length >= 5) {
        decoded.type = "SetComputeUnitLimit";
        decoded.computeUnits = dataBuffer.readUInt32LE(1);
      }
      break;
    }
  }

  return decoded;
};

type FireblocksMessageHeader = {
  numRequiredSignatures: number;
  numReadonlySignedAccounts: number;
  numReadonlyUnsignedAccounts: number;
};

type FireblocksCompiledInstruction = {
  programIdIndex: number;
  accounts: number[];
  data: string;
};

type FireblocksMessagePayload = {
  header: FireblocksMessageHeader;
  accountKeys: string[];
  recentBlockhash: string;
  instructions: FireblocksCompiledInstruction[];
};

const isHexPayload = (value: string): boolean => {
  return /^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0;
};

const createTransactionFromHex = (value: string): Transaction => {
  if (!isHexPayload(value)) {
    throw new Error("Transaction payload must be an even-length hex string");
  }

  return Transaction.from(Buffer.from(value, "hex"));
};

const isFireblocksMessagePayload = (
  payload: unknown
): payload is FireblocksMessagePayload => {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<FireblocksMessagePayload>;
  const hasHeader =
    candidate.header !== undefined &&
    typeof candidate.header?.numRequiredSignatures === "number" &&
    typeof candidate.header?.numReadonlySignedAccounts === "number" &&
    typeof candidate.header?.numReadonlyUnsignedAccounts === "number";
  const hasAccountKeys =
    Array.isArray(candidate.accountKeys) &&
    candidate.accountKeys.every((key) => typeof key === "string");
  const hasRecentBlockhash = typeof candidate.recentBlockhash === "string";
  const hasInstructions =
    Array.isArray(candidate.instructions) &&
    candidate.instructions.every((instruction) => {
      return (
        instruction &&
        typeof instruction === "object" &&
        typeof instruction.programIdIndex === "number" &&
        Array.isArray(instruction.accounts) &&
        instruction.accounts.every((accountIndex) =>
          Number.isInteger(accountIndex)
        ) &&
        typeof instruction.data === "string"
      );
    });

  return hasHeader && hasAccountKeys && hasRecentBlockhash && hasInstructions;
};

const createTransactionFromFireblocksJson = (value: string): Transaction => {
  const parsed = JSON.parse(value) as Record<string, unknown>;
  const messageCandidate = parsed.message ?? parsed;

  if (!isFireblocksMessagePayload(messageCandidate)) {
    throw new Error("Invalid Fireblocks message JSON payload");
  }

  const { header, accountKeys, instructions, recentBlockhash } = messageCandidate;

  const compiledInstructions: FireblocksCompiledInstruction[] = instructions.map(
    (instruction) => ({
      programIdIndex: instruction.programIdIndex,
      accounts: instruction.accounts,
      data: instruction.data,
    })
  );

  const message = new Message({
    header,
    accountKeys,
    instructions: compiledInstructions,
    recentBlockhash,
  });

  const signaturesSource = (
    Array.isArray(parsed.signatures)
      ? parsed.signatures
      : Array.isArray((parsed.message as Record<string, unknown> | undefined)?.signatures)
      ? (parsed.message as { signatures: unknown[] }).signatures
      : []
  ).filter((signature) => typeof signature === "string") as string[];

  return Transaction.populate(message, signaturesSource);
};

const createTransactionFromPayload = (payload: string): Transaction => {
  const trimmedPayload = payload.trim();
  if (!trimmedPayload) {
    throw new Error("Transaction payload is empty");
  }

  if (trimmedPayload.startsWith("{")) {
    return createTransactionFromFireblocksJson(trimmedPayload);
  }

  try {
    return createTransactionFromHex(trimmedPayload);
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to parse transaction payload"
    );
  }
};

export const decodeSolanaTransaction = (
  payload: string
): SolanaDecodedTransaction => {
  const transaction = createTransactionFromPayload(payload);

  return {
    feePayer: transaction.feePayer?.toBase58() ?? null,
    recentBlockhash: transaction.recentBlockhash ?? null,
    signatures: transaction.signatures.map((signature) => ({
      publicKey: signature.publicKey?.toBase58() ?? null,
      signature: signature.signature ? bs58.encode(signature.signature) : null,
    })),
    instructions: transaction.instructions.map((instruction, index) => {
      const programId = instruction.programId.toBase58();
      const decodedInstruction = decodeInstruction(instruction, programId);

      return {
        index,
        programId,
        programName: getProgramName(programId),
        decoded: decodedInstruction,
        keys: instruction.keys.map((key) => ({
          pubkey: key.pubkey.toBase58(),
          isSigner: key.isSigner,
          isWritable: key.isWritable,
        })),
      };
    }),
  };
};