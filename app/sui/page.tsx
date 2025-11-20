"use client";

import DecoderLayout from "@app/components/decoder-layout/deconder-layout";
import InputText from "@app/components/input-text/input-text";
import { ChangeEvent, useState } from "react";
import { ViewMode } from "../types";
import ToggleGroup from "@app/components/toggle-group/toggle-group";

const SuiDecoderPage = () => {
    const [rawTransaction, setRawTransaction] = useState("");
    const [viewMode, setViewMode] = useState<ViewMode>("summary");

    const handleTransactionChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setRawTransaction(event.target.value);
    };
    return (
        <DecoderLayout
        icon="Sui"
        title="Sui Transaction Decoder"
        description="Decode and analyze Sui transactions."
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
          </div>
        }
      />
    );
  };
  
  export default SuiDecoderPage;