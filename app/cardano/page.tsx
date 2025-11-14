"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import JsonView from "@uiw/react-json-view";

import type { ViewMode } from "../types";
import DecoderLayout from "../components/DecoderLayout/DecoderLayout";
import InputText from "../components/InputText/inputText";
import ToggleGroup from "../components/ToggleGroup/toggleGroup";
import { decodeCardanoTransaction } from "../lib/tx-decoder/cardano/decoders";
import type {
  CardanoDecodedTransaction,
  CardanoValue,
} from "../lib/tx-decoder/types";

const stringifyValue = (value: unknown): string => {
  const serialized = JSON.stringify(value, null, 2);
  return serialized ?? "undefined";
};

const CardanoDecoderPageContent = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [rawTransaction, setRawTransaction] = useState("");
  const [decodedTransaction, setDecodedTransaction] =
    useState<CardanoDecodedTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("summary");

  const updateUrl = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (value) {
        params.set("tx", value);
      } else {
        params.delete("tx");
      }
      const serializedParams = params.toString();
      const nextUrl = serializedParams ? `${pathname}?${serializedParams}` : pathname;
      router.replace(nextUrl);
    },
    [pathname, router, searchParams]
  );

  const decodeAndSetTransaction = useCallback(
    (value: string) => {
      const trimmedValue = value.trim();
      setRawTransaction(trimmedValue);
      setError(null);

      if (!trimmedValue) {
        setDecodedTransaction(null);
        updateUrl("");
        return;
      }

      try {
        const decoded = decodeCardanoTransaction(trimmedValue);
        setDecodedTransaction(decoded);
        updateUrl(trimmedValue);
      } catch (decodeError) {
        const message =
          decodeError instanceof Error
            ? decodeError.message
            : "Failed to decode transaction";
        setError(message);
        setDecodedTransaction(null);
      }
    },
    [updateUrl]
  );

  useEffect(() => {
    if (!searchParams) {
      return;
    }
    const txParam = searchParams.get("tx");
    if (txParam) {
      decodeAndSetTransaction(txParam);
    }
  }, [decodeAndSetTransaction, searchParams]);

  const handleTransactionChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    decodeAndSetTransaction(event.target.value);
  };

  const handleViewModeChange = (value: string) => {
    setViewMode(value as ViewMode);
  };

  const renderSection = (title: string, value: unknown) => {
    if (value === null || value === undefined) {
      return null;
    }

    return (
      <div className="rounded border border-green-200 bg-white/80 px-3 py-2 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-gray-900">{title}</h3>
        <pre className="max-h-60 overflow-auto rounded bg-gray-900/90 px-3 py-2 text-xs text-green-100">
          {stringifyValue(value)}
        </pre>
      </div>
    );
  };

  const renderTransferSummary = () => {
    const outputs = decodedTransaction?.body?.outputs;
    if (!Array.isArray(outputs) || outputs.length === 0) {
      return null;
    }

    type FormattedOutput = {
      address?: string | null;
      amount?: {
        coin?: string | null;
        multiasset?: CardanoValue | null;
      } | null;
      payment_credential_hash?: string | null;
    };

    const collectSignerHashes = (value: CardanoValue | null | undefined): string[] => {
      if (value === null || value === undefined) {
        return [];
      }

      if (typeof value === "string") {
        return [value.toLowerCase()];
      }

      if (Array.isArray(value)) {
        return value.flatMap((entry) => collectSignerHashes(entry));
      }

      if (typeof value === "object") {
        return Object.values(value).flatMap((entry) => collectSignerHashes(entry));
      }

      return [];
    };

    const isFormattedOutput = (value: CardanoValue): value is FormattedOutput => {
      return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        ("address" in value || "amount" in value)
      );
    };

    const formatAda = (value: string | null | undefined) => {
      if (!value) {
        return "0 ADA";
      }
      try {
        const lovelace = BigInt(value);
        const adaUnits = lovelace / 1_000_000n;
        const remainder = lovelace % 1_000_000n;
        if (remainder === 0n) {
          return `${adaUnits.toString()} ADA`;
        }
        const fractional = remainder.toString().padStart(6, "0").replace(/0+$/, "");
        return `${adaUnits.toString()}.${fractional} ADA`;
      } catch {
        return `${value} lovelace`;
      }
    };

    const transferEntries = outputs.reduce<FormattedOutput[]>((entries, output) => {
      if (isFormattedOutput(output)) {
        entries.push(output);
      }
      return entries;
    }, []);
    const requiredSigners = new Set(
      collectSignerHashes(decodedTransaction?.body?.required_signers)
        .filter((hash) => /^[0-9a-f]{56}$/.test(hash))
    );

    return (
      <div className="flex flex-col gap-3 rounded border border-green-300 bg-white px-4 py-3 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-green-700">
            {transferEntries.length} output{transferEntries.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex flex-col divide-y divide-green-100">
          {transferEntries.map((output, index) => {
            const coin = output.amount?.coin ?? null;
            let paymentCredentialHash: string | null = null;
            if (typeof output.payment_credential_hash === "string") {
              paymentCredentialHash = output.payment_credential_hash;
            } 
            const isSender = paymentCredentialHash
              ? requiredSigners.has(paymentCredentialHash.toLowerCase())
              : false;
            const roleLabel = isSender ? "Sender (change)" : "Recipient";
            return (
              <div key={`${output.address ?? "unknown"}-${index}`} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span className="font-semibold text-gray-800">{roleLabel}</span>
                  <span className="font-medium text-gray-900">Output #{index + 1}</span>
                </div>
                <div className="flex flex-col gap-1 rounded bg-green-50 px-3 py-2">
                  <span className="break-all text-xs font-mono text-gray-800">
                    {output.address ?? "Unknown address"}
                  </span>
                  <span className="text-sm font-semibold text-green-800">
                    {formatAda(coin)}
                  </span>
                  <span className="text-[10px] font-medium text-green-600">
                    {coin ? `${coin} lovelace` : "Coin amount unavailable"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSummaryContent = () => {
    if (!decodedTransaction) {
      return (
        <span className="text-sm text-gray-400">
          Decoded transaction will appear here...
        </span>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {decodedTransaction.error ? (
          <div className="rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 shadow-sm">
            <p className="font-semibold">Decoder warning:</p>
            <p>
              {decodedTransaction.message ?? decodedTransaction.error}
            </p>
          </div>
        ) : null}
        {renderTransferSummary()}
        {renderSection("Auxiliary Data", decodedTransaction.auxiliary_data)}
      </div>
    );
  };

  const renderOutputContent = () => {
    if (error) {
      return <span className="text-red-600">Error: {error}</span>;
    }

    if (viewMode === "summary") {
      return renderSummaryContent();
    }

    if (!decodedTransaction) {
      return (
        <span className="text-sm text-gray-400">
          Decoded transaction will appear here...
        </span>
      );
    }

    return (
      <div className="min-h-0 w-full flex-1 overflow-auto bg-white/80 backdrop-blur-sm">
        <JsonView value={decodedTransaction as object} />
      </div>
    );
  };

  return (
    <DecoderLayout
      icon="Cardano"
      title="Cardano Transaction Decoder"
      description="Decode and analyze Cardano transactions."
      inputTitle="Decode a transaction"
      inputContent={
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 [&_textarea]:min-h-[400px] [&_textarea]:bg-white/80 [&_textarea]:text-sm [&_textarea]:font-mono">
            <InputText
              id="cardano-transaction-input"
              multiline
              value={rawTransaction}
              onChange={handleTransactionChange}
              placeholder="Paste your Cardano CBOR-encoded transaction hex here..."
              borderClassName="border-green-100"
            />
          </div>
        </div>
      }
      outputTitle="Output"
      outputToolbar={
        <ToggleGroup
          value={viewMode}
          onValueChange={handleViewModeChange}
          items={[
            { content: "Summary", value: "summary" },
            { content: "JSON", value: "json" },
          ]}
        />
      }
      outputContent={
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {renderOutputContent()}
        </div>
      }
    />
  );
};

const CardanoDecoderPage = () => {
  return (
    <Suspense>
      <CardanoDecoderPageContent />
    </Suspense>
  );
};

export default CardanoDecoderPage;


