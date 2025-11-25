"use client";

import { useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { SolanaInstructionData } from "../../../../lib/tx-decoder/types";
import JsonView from "@uiw/react-json-view";
import Icon from "../../../../components/icon/icon";

const SOLANA_EXPLORER_BASE_URL = "https://explorer.solana.com/address";

const formatAddress = (address: string | undefined): string => {
  if (!address) return "unknown";
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
};

const AddressLink = ({ address }: { address: string | undefined }) => {
  if (!address) return <span className="text-gray-500">unknown</span>;

  const explorerUrl = `${SOLANA_EXPLORER_BASE_URL}/${address}`;
  const displayAddress = formatAddress(address);

  return (
    <a
      href={explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
    >
      {displayAddress}
    </a>
  );
};

const formatInstructionDescription = (
  instruction: SolanaInstructionData,
  feePayer: string | null
): ReactNode => {
  const { programName, decoded } = instruction;
  const type = decoded.type;

  // System Program instructions
  if (programName === "System Program") {
    switch (type) {
      case "Transfer":
        return (
          <>
            Transfer{" "}
            <span className="font-semibold">
              {decoded.amount || "unknown amount"} SOL
            </span>{" "}
            from <AddressLink address={decoded.from} /> to{" "}
            <AddressLink address={decoded.to} />.
          </>
        );
      case "CreateAccount":
        return (
          <>
            Create a new account <AddressLink address={decoded.newAccount} />{" "}
            with{" "}
            <span className="font-semibold">
              {decoded.amount || "unknown amount"} SOL
            </span>{" "}
            from <AddressLink address={decoded.from} />.
          </>
        );
      case "Allocate":
        return <>Allocate memory space for an account.</>;
      default:
        return <>{type} operation in System Program.</>;
    }
  }

  // Stake Program instructions
  if (programName === "Stake Program") {
    switch (type) {
      case "Initialize": {
        // Initialize instruction keys structure:
        // keys[0]: stake account (writable, signer)
        // keys[1]: rent sysvar
        // keys[2]: lockup account (optional)
        // keys[3]: staker authority (optional, signer) - defaults to fee payer if not provided
        // keys[4]: withdrawer authority (optional, signer) - defaults to fee payer if not provided
        const stakeAccount = instruction.keys[0]?.pubkey;
        // Use decoded instruction data if available, otherwise fall back to keys array, then fee payer
        const stakerAuthority =
          decoded.stakerAuthority ||
          instruction.keys[3]?.pubkey ||
          feePayer ||
          stakeAccount;
        const withdrawerAuthority =
          decoded.withdrawerAuthority ||
          instruction.keys[4]?.pubkey ||
          feePayer ||
          stakeAccount;

        return (
          <>
            Initialize a new stake account{" "}
            <AddressLink address={stakeAccount} /> for staking SOL with staker
            authority <AddressLink address={stakerAuthority} />
            and withdrawer authority:{" "}
            <AddressLink address={withdrawerAuthority} />.
          </>
        );
      }
      case "DelegateStake":
        return (
          <>
            Delegate stake from <AddressLink address={decoded.stakeAccount} />{" "}
            to validator <AddressLink address={decoded.voteAccount} />.
          </>
        );
      case "Split":
        return (
          <>
            Split{" "}
            <span className="font-semibold">
              {decoded.amount || "unknown amount"} SOL
            </span>{" "}
            from stake account{" "}
            <AddressLink address={decoded.sourceStakeAccount} /> into a new
            stake account <AddressLink address={decoded.newStakeAccount} />.
          </>
        );
      case "Withdraw":
        return (
          <>
            Withdraw{" "}
            <span className="font-semibold">
              {decoded.amount || "unknown amount"} SOL
            </span>{" "}
            from stake account <AddressLink address={decoded.stakeAccount} /> to{" "}
            <AddressLink address={decoded.destination} />.
          </>
        );
      case "Deactivate":
        return (
          <>
            Deactivate stake account{" "}
            <AddressLink address={decoded.stakeAccount} />, stopping it from
            earning staking rewards.
          </>
        );
      case "Merge":
        return (
          <>
            Merge stake account{" "}
            <AddressLink address={decoded.sourceStakeAccount} /> into{" "}
            <AddressLink address={decoded.destinationStakeAccount} />.
          </>
        );
      case "Authorize":
        return <>Update the authority for a stake account.</>;
      default:
        return <>{type} operation on stake account.</>;
    }
  }

  // Compute Budget instructions
  if (programName === "Compute Budget") {
    switch (type) {
      case "SetComputeUnitPrice":
        return (
          <>
            Set priority fee to{" "}
            <span className="font-semibold">
              {decoded.priorityFee || "unknown"} SOL
            </span>{" "}
            per compute unit.
          </>
        );
      case "SetComputeUnitLimit":
        return (
          <>
            Set compute unit limit to{" "}
            <span className="font-semibold">
              {decoded.computeUnits || "unknown"}
            </span>{" "}
            units.
          </>
        );
      default:
        return <>{type} operation in Compute Budget Program.</>;
    }
  }

  // Fallback for unknown programs or types
  return (
    <>
      {type} instruction executed on {programName}.
    </>
  );
};

const SolanaInstructionCard = ({
  instruction,
  feePayer,
}: {
  instruction: SolanaInstructionData;
  feePayer: string | null;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded overflow-hidden border border-gray-200">
      {/* Header */}
      <button
        type="button"
        className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 transition-colors text-left"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${
          instruction.decoded.type
        } instruction`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-900">
              Instruction {instruction.index + 1}
            </span>
            <span className="text-sm font-medium text-gray-600 bg-white px-2 py-1 rounded">
              {instruction.decoded.type}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 bg-green-100 px-2 py-1 rounded">
              {instruction.programName}
            </span>
            <Icon
              icon={isExpanded ? "MdKeyboardArrowUp" : "MdKeyboardArrowDown"}
              className="flex-shrink-0"
            />
          </div>
        </div>
      </button>

      {/* Content */}
      <div
        className={`overflow-hidden border-t border-green-100 transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-4">
          <div className="text-sm text-gray-900 mb-4">
            {formatInstructionDescription(instruction, feePayer)}
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-medium text-gray-600 hover:text-gray-900 mb-2">
              View raw JSON
            </summary>
            <div className="font-mono text-xs text-gray-900 whitespace-pre-wrap overflow-auto mt-2 bg-gray-50 p-3 rounded border border-gray-200">
              <JsonView value={instruction} />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default SolanaInstructionCard;
