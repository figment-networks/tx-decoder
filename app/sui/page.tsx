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
import DecoderLayout from "../../components/decoder-layout/deconder-layout";
import { parseSuiTx } from "../../lib/tx-decoder/sui/decoder";
import computeSuiHash from "../../lib/tx-decoder/sui/compute-hash";
import type { SuiDecodedTransaction } from "../../lib/tx-decoder/types";

const SuiDecoderPageContent = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [rawTransaction, setRawTransaction] = useState("");
  const [decodedTransaction, setDecodedTransaction] =
    useState<SuiDecodedTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
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
        const decoded = await parseSuiTx(trimmedValue);
        setDecodedTransaction(decoded as SuiDecodedTransaction);
        updateUrl(trimmedValue);
        
        // Compute hash
        try {
          const hash = await computeSuiHash(trimmedValue);
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
      icon="Sui"
      inputValue={rawTransaction}
      onInputChange={handleTransactionChange}
      inputPlaceholder="Paste your raw SUI transaction data here..."
      transactionHash={transactionHash}
      outputContent={renderOutputContent()}
    />
  );
};

const SuiDecoderPage = () => {
  return (
    <Suspense>
      <SuiDecoderPageContent />
    </Suspense>
  );
};

export default SuiDecoderPage;
