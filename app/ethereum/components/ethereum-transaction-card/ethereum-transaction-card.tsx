"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import { formatEther, formatGwei } from "viem";
import Icon from "../../../../components/icon/icon";
import type { EthereumDecodedTransaction } from "../../../../lib/tx-decoder/types";
import type {
  Erc7730DecodeResult,
  Erc7730MatchResult,
  DecodedField,
} from "../../../../lib/tx-decoder/ethereum/erc7730/types";

// ─── Constants ───────────────────────────────────────────────────────────────

const ETHERSCAN_BASE = "https://etherscan.io/address";

const CHAIN_NAMES: Record<string, string> = {
  "1": "Ethereum Mainnet",
  "5": "Goerli",
  "11155111": "Sepolia",
  "17000": "Holesky",
  "560048": "Hoodi",
  "137": "Polygon",
  "80001": "Polygon Mumbai",
  "42161": "Arbitrum One",
  "421614": "Arbitrum Sepolia",
  "10": "Optimism",
  "11155420": "Optimism Sepolia",
  "8453": "Base",
  "84532": "Base Sepolia",
  "43114": "Avalanche",
  "56": "BNB Chain",
  "100": "Gnosis",
};

const SI_PREFIXES = [
  { factor: 1e24, symbol: "Y" },
  { factor: 1e21, symbol: "Z" },
  { factor: 1e18, symbol: "E" },
  { factor: 1e15, symbol: "P" },
  { factor: 1e12, symbol: "T" },
  { factor: 1e9, symbol: "G" },
  { factor: 1e6, symbol: "M" },
  { factor: 1e3, symbol: "k" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function shouldShowField(field: DecodedField): boolean {
  const v = field.visible;
  if (!v || v === "always" || v === "optional") return true;
  if (v === "never") return false;
  if (typeof v === "object" && v !== null) {
    const rule = v as Record<string, unknown>;
    if (rule.mustBe) return false; // validation only, don't display
    if (Array.isArray(rule.ifNotIn)) {
      const val = field.decoded.value;
      return !rule.ifNotIn.map(String).includes(val);
    }
  }
  return true;
}

function formatFieldValue(field: DecodedField, result: Erc7730MatchResult): string {
  const { decoded, format, params } = field;
  const p = (params ?? {}) as Record<string, unknown>;
  const rawValue = decoded.value;

  switch (format) {
    case "addressName":
    case "interoperableAddressName":
      return rawValue; // rendered as AddressLink in JSX

    case "raw":
      return rawValue;

    case "amount":
      // Native currency amount (wei)
      try { return `${formatEther(BigInt(rawValue))} ETH`; } catch { return rawValue; }

    case "tokenAmount": {
      let bigVal: bigint;
      try { bigVal = BigInt(rawValue); } catch { return rawValue; }

      // Threshold → "Unlimited" or custom message
      if (p.threshold !== undefined) {
        try {
          const threshold = BigInt(p.threshold as string);
          if (bigVal >= threshold) {
            const ticker = result.token?.ticker ?? (result.decimals === 18 ? "ETH" : "");
            const msg = (p.message as string | undefined) ?? "Unlimited";
            return ticker ? `${msg} ${ticker}` : msg;
          }
        } catch { /* ignore */ }
      }

      // Use metadata.token (e.g. explicit token descriptor)
      if (result.token) {
        const { ticker, decimals } = result.token;
        const divisor = Math.pow(10, decimals);
        const amount = Number(bigVal) / divisor;
        return `${amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${ticker}`;
      }

      // Legacy: WETH descriptor sets decimals: 18 in metadata
      if (result.decimals === 18) {
        try { return `${formatEther(bigVal)} ETH`; } catch { /* fall through */ }
      }

      return `${rawValue} (raw units)`;
    }

    case "tokenTicker":
      // We can't look up tickers offline; show raw address
      return rawValue;

    case "nftName":
      return `Token ID: ${rawValue}`;

    case "date": {
      const encoding = p.encoding as string | undefined;
      try {
        const n = Number(BigInt(rawValue));
        if (encoding === "timestamp") {
          return new Date(n * 1000).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          });
        }
        if (encoding === "blockheight") return `Block #${rawValue}`;
      } catch { /* fall through */ }
      return rawValue;
    }

    case "duration": {
      try {
        return formatDuration(Number(BigInt(rawValue)));
      } catch { return rawValue; }
    }

    case "unit": {
      const base = (p.base as string | undefined) ?? "";
      const decimals = (p.decimals as number | undefined) ?? 0;
      const usePrefix = (p.prefix as boolean | undefined) ?? false;
      try {
        const n = Number(BigInt(rawValue)) / Math.pow(10, decimals);
        if (usePrefix) {
          for (const { factor, symbol } of SI_PREFIXES) {
            if (n >= factor) return `${n / factor}${symbol}${base}`;
          }
        }
        return `${n}${base}`;
      } catch { return rawValue; }
    }

    case "enum": {
      const ref = p.$ref as string | undefined;
      if (ref && result.enums) {
        const enumName = ref.split(".").pop()!;
        const enumDef = result.enums[enumName];
        if (enumDef?.[rawValue]) return enumDef[rawValue];
      }
      return rawValue;
    }

    case "chainId":
      return CHAIN_NAMES[rawValue] ?? `Chain ${rawValue}`;

    default:
      return rawValue;
  }
}

function isAddressFormat(format: string): boolean {
  return format === "addressName" || format === "interoperableAddressName";
}

function interpolateIntent(template: string, fields: DecodedField[]): string {
  return template.replace(/\{([^}]+)\}/g, (match, path: string) => {
    const field = fields.find((f) => f.path === path);
    return field ? field.decoded.value : match;
  });
}

function resolveDescription(erc7730Result: Erc7730DecodeResult): string {
  if (erc7730Result.kind !== "matched") {
    if (erc7730Result.selector === "0x") return "You are transferring ETH.";
    return `You are calling an unrecognized function (${erc7730Result.selector}) on a smart contract.`;
  }

  if (erc7730Result.interpolatedIntent) {
    return interpolateIntent(erc7730Result.interpolatedIntent, erc7730Result.fields);
  }

  return `You are about to: ${erc7730Result.intent}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const AddressLink = ({ address }: { address: string }) => (
  <a
    href={`${ETHERSCAN_BASE}/${address}`}
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
  >
    {formatAddress(address)}
  </a>
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <>
    <span className="font-medium text-gray-600 whitespace-nowrap">{label}</span>
    <span className="text-gray-900 font-mono text-sm break-all">{children}</span>
  </>
);

const FieldRow = ({ field, result }: { field: DecodedField; result: Erc7730MatchResult }) => {
  if (!shouldShowField(field)) return null;
  const isAddr = isAddressFormat(field.format) && field.decoded.kind === "address";
  const display = formatFieldValue(field, result);

  return (
    <Row label={field.label}>
      {isAddr ? <AddressLink address={field.decoded.value} /> : display}
    </Row>
  );
};

// ─── Main Card ────────────────────────────────────────────────────────────────

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
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsExpanded((v) => !v); }
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
          {/* Plain-English description */}
          <p className="text-sm text-gray-800 mb-4">{description}</p>

          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {/* Network context */}
            {networkName && <Row label="Network">{networkName}</Row>}
            {decoded.chainId && <Row label="Chain ID">{decoded.chainId}</Row>}

            {/* ERC-7730 decoded fields */}
            {erc7730Result.kind === "matched" &&
              erc7730Result.fields.map((field, i) => (
                <FieldRow key={field.path ?? i} field={field} result={erc7730Result} />
              ))}

            {/* Parties */}
            {decoded.from && (
              <Row label="From"><AddressLink address={decoded.from} /></Row>
            )}
            {decoded.to && (
              <Row label="To"><AddressLink address={decoded.to} /></Row>
            )}

            {/* Value */}
            {showEthValue && (
              <Row label="ETH Value">{decoded.value.eth} ETH</Row>
            )}

            {/* Fees */}
            {decoded.maxFeePerGas && (
              <Row label="Max Fee">{formatGwei(BigInt(decoded.maxFeePerGas))} Gwei</Row>
            )}
            {decoded.maxPriorityFeePerGas && (
              <Row label="Priority Fee">{formatGwei(BigInt(decoded.maxPriorityFeePerGas))} Gwei</Row>
            )}
            {!decoded.maxFeePerGas && decoded.gasPrice && (
              <Row label="Gas Price">{formatGwei(BigInt(decoded.gasPrice))} Gwei</Row>
            )}
            {decoded.gasLimit && (
              <Row label="Gas Limit">{decoded.gasLimit}</Row>
            )}

            {/* Technical */}
            {decoded.type && <Row label="Type">{decoded.type}</Row>}
            {decoded.nonce !== undefined && <Row label="Nonce">{decoded.nonce}</Row>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EthereumTransactionCard;
