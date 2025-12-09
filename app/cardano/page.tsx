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

import DecoderLayout from "../../components/decoder-layout/deconder-layout";
import { decodeCardanoTransaction } from "../../lib/tx-decoder/cardano/decoders";
import computeAdaHash from "../../lib/tx-decoder/cardano/compute-hash";
import type {
  CardanoDecodedTransaction,
} from "../../lib/tx-decoder/types";

const CardanoDecoderPageContent = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [rawTransaction, setRawTransaction] = useState("");
  const [decodedTransaction, setDecodedTransaction] =
    useState<CardanoDecodedTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

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
    async (value: string) => {
      const trimmedValue = value.trim();
      setRawTransaction(trimmedValue);
      setError(null);
      setTransactionHash(null);

      if (!trimmedValue) {
        setDecodedTransaction(null);
        updateUrl("");
        return;
      }

      try {
        const decoded = decodeCardanoTransaction(trimmedValue);
        setDecodedTransaction(decoded);
        updateUrl(trimmedValue);
        
        // Compute hash
        try {
          const hash = computeAdaHash(trimmedValue);
          setTransactionHash(hash);
        } catch {
          setTransactionHash(null);
        }
      } catch (decodeError) {
        const message =
          decodeError instanceof Error
            ? decodeError.message
            : "Failed to decode transaction";
        setError(message);
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

    if (!decodedTransaction) {
      return (
        <span className="text-sm text-gray-400">
          Decoded transaction will appear here...
        </span>
      );
    }

    return (
      <div className="min-h-0 w-full flex-1 overflow-auto bg-white/80 backdrop-blur-sm">
        <JsonView
          value={decodedTransaction as object}
          shortenTextAfterLength={0}
          displayDataTypes={false}
          displayObjectSize={false}
        />
      </div>
    );
  };

  return (
    <DecoderLayout
      icon="Cardano"
      inputId="cardano-transaction-input"
      inputValue={rawTransaction}
      onInputChange={handleTransactionChange}
      inputPlaceholder="Paste your raw Cardano transaction data here..."
      transactionHash={transactionHash}
      outputContent={renderOutputContent()}
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


