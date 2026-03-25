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
import { parseEthereumTx } from "../../lib/tx-decoder/ethereum/decoder";
import computeEthereumHash from "../../lib/tx-decoder/ethereum/compute-hash";
import type { EthereumDecodedTransaction } from "../../lib/tx-decoder/types";

const PLACEHOLDER = `Paste raw hex (RLP-encoded EIP-1559 / legacy) or Fireblocks JSON:

0x02f8...

— or —

{
  "to": "0x...",
  "value": "0x...",
  "data": "0x...",
  "chainId": 1
}`;

const EthereumDecoderPageContent = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [rawTransaction, setRawTransaction] = useState("");
  const [decodedTransaction, setDecodedTransaction] =
    useState<EthereumDecodedTransaction | null>(null);
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
        const decoded = await parseEthereumTx(trimmedValue);
        setDecodedTransaction(decoded);
        updateUrl(trimmedValue);

        try {
          const hash = await computeEthereumHash(trimmedValue);
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
      icon="Ethereum"
      inputValue={rawTransaction}
      onInputChange={handleTransactionChange}
      inputPlaceholder={PLACEHOLDER}
      transactionHash={transactionHash}
      outputContent={renderOutputContent()}
    />
  );
};

const EthereumDecoderPage = () => {
  return (
    <Suspense>
      <EthereumDecoderPageContent />
    </Suspense>
  );
};

export default EthereumDecoderPage;
