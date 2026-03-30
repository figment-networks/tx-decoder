"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import { formatGwei } from "viem";
import Icon from "../../../../components/icon/icon";
import type { EthereumDecodedTransaction } from "../../../../lib/tx-decoder/types";
import type {
  Erc7730DecodeResult,
  Erc7730MatchResult,
  DecodedField,
} from "../../../../lib/tx-decoder/ethereum/erc7730/types";
import AddressLink, { formatAddress } from "./address-link";
import Row from "./row";
import FieldRow, { formatFieldValue, isAddressFormat, CHAIN_NAMES } from "./field-row";

function interpolateIntent(
  template: string,
  fields: DecodedField[],
  result: Erc7730MatchResult
): string {
  return template.replace(/\{([^}]+)\}/g, (match, path: string) => {
    const field = fields.find((f) => f.path === path);
    if (!field) return match;
    if (isAddressFormat(field.format) && field.decoded.kind === "address") {
      return formatAddress(field.decoded.value);
    }
    return formatFieldValue(field, result);
  });
}

function resolveDescription(erc7730Result: Erc7730DecodeResult): string {
  if (erc7730Result.kind !== "matched") {
    if (erc7730Result.selector === "0x") return "You are transferring ETH.";
    return `You are calling an unrecognized function (${erc7730Result.selector}) on a smart contract.`;
  }
  if (erc7730Result.interpolatedIntent) {
    return interpolateIntent(
      erc7730Result.interpolatedIntent,
      erc7730Result.fields,
      erc7730Result
    );
  }
  return `You are about to: ${erc7730Result.intent}`;
}

const EthereumTransactionCard = ({
  decoded,
  erc7730Result,
}: {
  decoded: EthereumDecodedTransaction;
  erc7730Result: Erc7730DecodeResult;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggle = () => setIsExpanded((v) => !v);
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsExpanded((v) => !v);
    }
  };

  const description = resolveDescription(erc7730Result);
  const showEthValue = decoded.value.eth !== "0" && decoded.value.eth !== "0.0";
  const networkName = decoded.chainId ? CHAIN_NAMES[decoded.chainId] : undefined;

  const action =
    erc7730Result.kind === "matched"
      ? erc7730Result.intent
      : erc7730Result.selector === "0x"
      ? "ETH Transfer"
      : "Contract Interaction";

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded overflow-hidden border border-gray-200">
      {/* Header */}
      <button
        type="button"
        className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 transition-colors text-left"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 bg-white px-2 py-1 rounded">
            {action}
          </span>
          <div className="flex items-center gap-2">
            {erc7730Result.kind === "matched" && (
              <span className="text-sm text-gray-500 bg-green-100 px-2 py-1 rounded">
                {erc7730Result.contractName}
              </span>
            )}
            <Icon
              icon={isExpanded ? "MdKeyboardArrowUp" : "MdKeyboardArrowDown"}
              className="flex-shrink-0"
            />
          </div>
        </div>
      </button>

      {/* Body */}
      <div
        className={`overflow-hidden border-t border-green-100 transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-4">
          <p className="text-sm text-gray-800 mb-4">{description}</p>

          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {networkName && <Row label="Network">{networkName}</Row>}
            {decoded.chainId && <Row label="Chain ID">{decoded.chainId}</Row>}

            {erc7730Result.kind === "matched" && (
              <Row label="Function">
                <span className="text-xs">{erc7730Result.functionSignature}</span>
              </Row>
            )}

            {erc7730Result.kind === "matched" &&
              erc7730Result.fields.map((field, i) => (
                <FieldRow key={field.path ?? i} field={field} result={erc7730Result} />
              ))}

            {decoded.from && (
              <Row label="From">
                <AddressLink address={decoded.from} />
              </Row>
            )}
            {decoded.to && erc7730Result.kind !== "matched" && (
              <Row label="To">
                <AddressLink address={decoded.to} />
              </Row>
            )}

            {showEthValue && (
              <Row label="ETH Value">{decoded.value.eth} ETH</Row>
            )}

            {decoded.maxFeePerGas && (
              <Row label="Max Fee">
                {formatGwei(BigInt(decoded.maxFeePerGas))} Gwei
              </Row>
            )}
            {decoded.maxPriorityFeePerGas && (
              <Row label="Priority Fee">
                {formatGwei(BigInt(decoded.maxPriorityFeePerGas))} Gwei
              </Row>
            )}
            {!decoded.maxFeePerGas && decoded.gasPrice && (
              <Row label="Gas Price">
                {formatGwei(BigInt(decoded.gasPrice))} Gwei
              </Row>
            )}
            {decoded.gasLimit && (
              <Row label="Gas Limit">{decoded.gasLimit}</Row>
            )}

            {decoded.type && <Row label="Type">{decoded.type}</Row>}
            {decoded.nonce !== undefined && (
              <Row label="Nonce">{decoded.nonce}</Row>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EthereumTransactionCard;
