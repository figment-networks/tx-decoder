"use client";

import {
  Suspense,
  useState,
  useEffect,
  useCallback,
  type ChangeEvent,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import JsonView from "@uiw/react-json-view";

import type { ViewMode } from "../types";
import DecoderLayout from "../components/DecoderLayout/DecoderLayout";
import InputText from "../components/InputText/inputText";
import ToggleGroup from "../components/ToggleGroup/toggleGroup";
import SolanaInstructionCard from "../containers/SolanaInstructionCard/solanaInstructionCard";
import { decodeSolanaTransaction } from "../lib/tx-decoder/solana/decoders";
import type { DecodedTransaction } from "../lib/tx-decoder/types";

const SolanaDecoderPageContent = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [rawTransaction, setRawTransaction] = useState("");
  const [decodedTransaction, setDecodedTransaction] =
    useState<DecodedTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("summary");

  const updateUrl = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      if (value) {
        params.set("tx", value);
      } else {
        params.delete("tx");
      }
      router.replace(`${pathname}?${params.toString()}`);
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
        return;
      }

      try {
        const decoded = decodeSolanaTransaction(trimmedValue);
        setDecodedTransaction(decoded);
        updateUrl(trimmedValue);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to decode transaction";
        setError(errorMessage);
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

  const renderOutputContent = () => {
    if (error) {
      return <span className="text-red-600">Error: {error}</span>;
    }

    const placeholder = (
      <span className="text-sm text-gray-400">
        Decoded transaction will appear here...
      </span>
    );

    if (viewMode === "summary") {
      const hasInstructions =
        decodedTransaction && decodedTransaction.instructions.length > 0;
      if (!hasInstructions) {
        return placeholder;
      }
      return (
        <div className="min-h-0 w-full flex-1 overflow-auto">
          <div className="flex flex-col gap-4">
            {decodedTransaction.instructions.map((instruction) => (
              <SolanaInstructionCard
                key={`${instruction.index}-${instruction.programId}`}
                instruction={instruction}
                feePayer={decodedTransaction.feePayer}
              />
            ))}
          </div>
        </div>
      );
    }

    if (!decodedTransaction) {
      return placeholder;
    }

    return (
      <div className="min-h-0 w-full flex-1 overflow-auto bg-white/80 backdrop-blur-sm">
        <JsonView value={decodedTransaction as object} />
      </div>
    );
  };

  return (
    <DecoderLayout
      icon="Solana"
      title="Solana Transaction Decoder"
      description="Decode and analyze Solana transactions."
      inputTitle="Decode a transaction"
      inputContent={
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 [&_textarea]:min-h-[400px] [&_textarea]:bg-white/80 [&_textarea]:text-sm [&_textarea]:font-mono">
            <InputText
              id="raw-transaction-input"
              multiline
              value={rawTransaction}
              onChange={handleTransactionChange}
              placeholder="Paste your raw transaction data here..."
              borderClassName="border-green-100"
            />
          </div>
        </div>
      }
      outputTitle="Output"
      outputToolbar={
        <ToggleGroup
          value={viewMode}
          onValueChange={(value) => setViewMode(value as ViewMode)}
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

const SolanaDecoderPage = () => {
  return (
    <Suspense>
      <SolanaDecoderPageContent />
    </Suspense>
  );
};

export default SolanaDecoderPage;

