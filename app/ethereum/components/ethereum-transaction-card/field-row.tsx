"use client";

import { formatEther } from "viem";
import BigNumber from "bignumber.js";
import type {
  Erc7730MatchResult,
  DecodedField,
} from "../../../../lib/tx-decoder/ethereum/erc7730/types";
import AddressLink from "./address-link";
import Row from "./row";

export const CHAIN_NAMES: Record<string, string> = {
  "1": "Ethereum Mainnet",
  "11155111": "Sepolia",
  "17000": "Holesky",
  "560048": "Hoodi",
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

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function shouldShowField(field: DecodedField): boolean {
  const v = field.visible;
  if (!v || v === "always" || v === "optional") return true;
  if (v === "never") return false;
  if (typeof v === "object" && v !== null) {
    const rule = v as Record<string, unknown>;
    if (rule.mustBe) return false;
    if (Array.isArray(rule.ifNotIn)) {
      return !rule.ifNotIn.map(String).includes(field.decoded.value);
    }
  }
  return true;
}

export function isAddressFormat(format: string): boolean {
  return format === "addressName" || format === "interoperableAddressName";
}

export function formatFieldValue(
  field: DecodedField,
  result: Erc7730MatchResult
): string {
  const { decoded, format, params } = field;
  const p = (params ?? {}) as Record<string, unknown>;
  const rawValue = decoded.value;

  switch (format) {
    case "addressName":
    case "interoperableAddressName":
      return rawValue; // rendered as AddressLink

    case "raw":
      return rawValue;

    case "amount":
      try {
        return `${formatEther(BigInt(rawValue))} ETH`;
      } catch {
        return rawValue;
      }

    case "tokenAmount": {
      let bigVal: bigint;
      try {
        bigVal = BigInt(rawValue);
      } catch {
        return rawValue;
      }

      if (p.threshold !== undefined) {
        try {
          if (bigVal >= BigInt(p.threshold as string)) {
            const ticker =
              result.token?.ticker ?? (result.decimals === 18 ? "ETH" : "");
            const msg = (p.message as string | undefined) ?? "Unlimited";
            return ticker ? `${msg} ${ticker}` : msg;
          }
        } catch { /* ignore */ }
      }

      if (result.token) {
        const { ticker, decimals } = result.token;
        const amount = new BigNumber(rawValue).shiftedBy(-decimals);
        return `${amount.toFormat(6)} ${ticker}`;
      }

      if (result.decimals === 18) {
        try {
          return `${formatEther(bigVal)} ETH`;
        } catch { /* fall through */ }
      }

      return rawValue;
    }

    case "tokenTicker":
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
      } catch {
        return rawValue;
      }
    }

    case "unit": {
      const base = (p.base as string | undefined) ?? "";
      const decimals = (p.decimals as number | undefined) ?? 0;
      const usePrefix = (p.prefix as boolean | undefined) ?? false;
      try {
        const n = Number(BigInt(rawValue)) / Math.pow(10, decimals);
        if (usePrefix) {
          const hit = SI_PREFIXES.find(({ factor }) => n >= factor);
          return hit ? `${n / hit.factor}${hit.symbol}${base}` : `${n}${base}`;
        }
        return `${n}${base}`;
      } catch {
        return rawValue;
      }
    }

    case "enum": {
      const ref = p.$ref as string | undefined;
      if (ref && result.enums) {
        const enumName = ref.split(".").pop()!;
        const resolved = result.enums[enumName]?.[rawValue];
        if (resolved) return resolved;
      }
      return rawValue;
    }

    case "chainId":
      return CHAIN_NAMES[rawValue] ?? `Chain ${rawValue}`;

    default:
      return rawValue;
  }
}

const FieldRow = ({
  field,
  result,
}: {
  field: DecodedField;
  result: Erc7730MatchResult;
}) => {
  if (!shouldShowField(field)) return null;

  const isAddr = isAddressFormat(field.format) && field.decoded.kind === "address";

  return (
    <Row label={field.label}>
      {isAddr ? (
        <AddressLink address={field.decoded.value} />
      ) : (
        formatFieldValue(field, result)
      )}
    </Row>
  );
};

export default FieldRow;
