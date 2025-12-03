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
import DecoderLayout from "../../components/decoder-layout/deconder-layout";
import ToggleGroup from "../../components/toggle-group/toggle-group";
import SolanaInstructionCard from "./components/solana-instruction-card/solana-instruction-card";
import { decodeSolanaTransaction } from "../../lib/tx-decoder/solana/decoders";
import computeSolanaHash from "../../lib/tx-decoder/solana/compute-hash";
import type { SolanaDecodedTransaction } from "../../lib/tx-decoder/types";

const SolanaDecoderPageContent = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [rawTransaction, setRawTransaction] = useState("");
  const [decodedTransaction, setDecodedTransaction] =
    useState<SolanaDecodedTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("summary");
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

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
    async (value: string) => {
      const trimmedValue = value.trim();
      setRawTransaction(trimmedValue);
      setError(null);
      setTransactionHash(null);

      if (!trimmedValue) {
        setDecodedTransaction(null);
        return;
      }

      try {
        const decoded = decodeSolanaTransaction(trimmedValue);
        setDecodedTransaction(decoded);
        updateUrl(trimmedValue);
        
        // Compute hash
        try {
          const hash = await computeSolanaHash(trimmedValue);
          setTransactionHash(hash);
        } catch {
          setTransactionHash(null);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to decode transaction";
        setError(errorMessage);
        setDecodedTransaction(null);
        setTransactionHash(null);
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
      void decodeAndSetTransaction(txParam);
    }
  }, [decodeAndSetTransaction, searchParams]);

  const handleTransactionChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    void decodeAndSetTransaction(event.target.value);
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
          <div className="flex flex-col gap-2">
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
      inputValue={rawTransaction}
      onInputChange={handleTransactionChange}
      inputPlaceholder="Paste your raw Solana transaction data here..."
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
      transactionHash={transactionHash}
      outputContent={renderOutputContent()}
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

