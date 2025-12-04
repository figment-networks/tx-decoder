"use client";

import { usePathname } from "next/navigation";
import React, { useState } from "react";

import Icon, { IconName } from "../icon/icon";
import InputText from "../input-text/input-text";
import ToggleGroup, { ToggleGroupItem } from "../toggle-group/toggle-group";
import { Protocol, protocolDisplayName } from "@app/app/types";

type DecoderLayoutProps = {
  icon: IconName;
  inputId?: string;
  inputPlaceholder: string;
  inputValue: string;
  onInputChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  >;
  outputContent: React.ReactNode;
  outputToolbar?: React.ReactNode;
  transactionHash?: string | null;
};

type ProtocolOption = {
  href: string;
  protocol: string;
};

const protocolOptions: readonly ProtocolOption[] = [
  {
    href: `/${Protocol.SOLANA.toLowerCase()}`,
    protocol: protocolDisplayName[Protocol.SOLANA],
  },
  {
    href: `/${Protocol.CARDANO.toLowerCase()}`,
    protocol: protocolDisplayName[Protocol.CARDANO],
  },
  {
    href: `/${Protocol.SUI.toLowerCase()}`,
    protocol: protocolDisplayName[Protocol.SUI],
  },
];

const TransactionHashDisplay: React.FC<{ hash: string | null }> = ({ hash }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    if (!hash) return;
    
    try {
      await navigator.clipboard.writeText(hash);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-white/70 rounded-lg px-3 py-2 border border-gray-200 shadow-sm">
      <div className="flex items-center gap-1.5 bg-gray-100 rounded-md px-2 py-1">
        <span className="text-xs font-semibold text-gray-700">Transaction hash</span>
      </div>
      <span className="text-xs text-gray-500 flex-1 truncate">
        {hash ? `${hash}` : "No transaction hash yet"}
      </span>
      <button
        onClick={handleCopy}
        disabled={!hash}
        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Copy transaction hash"
      >
        <Icon
          icon={isCopied ? "MdCheck" : "MdContentCopy"}
          className="w-4 h-4"
        />
      </button>
    </div>
  );
};

const DecoderLayout: React.FC<DecoderLayoutProps> = ({
  icon,
  inputId,
  inputPlaceholder,
  inputValue,
  onInputChange,
  outputContent,
  outputToolbar,
  transactionHash,
}) => {
  const pathname = usePathname();

  return (
    <div className="relative flex flex-col items-center h-screen bg-green-100 overflow-hidden">
      <div className="relative z-[1] w-full h-full flex flex-col gap-4 px-6 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-center justify-center gap-2 text-center md:items-start md:text-left">
            <div className="mb-2 flex flex-shrink-0 items-center justify-center gap-3 md:justify-start">
              <Icon icon="Figment" className="text-4xl" />
              <h1 className="text-3xl font-bold text-gray-900">Transaction Decoder</h1>
            </div>
            <p className="text-gray-600">Decode your transaction data into a human-readable format.</p>
          </div>
          <div className="flex flex-col items-center gap-4 text-center md:flex-row md:items-center lg:text-right justify-center">
            <button
              onClick={() => window.open("https://github.com/figment-networks/tx-decoder", "_blank", "noopener,noreferrer")}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:text-gray-900 hover:border-gray-400 transition-colors lg:justify-end"
            >
              <Icon icon="Github" className="text-lg" />
              View on Github
            </button>
            <ToggleGroup
              size="md"
              value=""
              items={protocolOptions.map(
                (option): ToggleGroupItem => ({
                  value: option.protocol.toLowerCase(),
                  href: option.href,
                  content: option.protocol,
                  prependedIcon: <Icon icon={option.protocol as IconName}className="text-2xl" />,
                })
              )}
              isActive={(item) => pathname?.startsWith(item.href || "") ?? false}
            />
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row md:overflow-visible">
          <section className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg border border-gray-200 bg-white/70 px-2 py-2 shadow-sm overflow-hidden">
            <div className="flex h-8 flex-shrink-0 items-center">
              <Icon icon={icon} className="text-3xl" />
              <h2 className="text-xl font-bold text-gray-900">Decode Transaction</h2>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-auto [&_textarea]:min-h-[400px] [&_textarea]:bg-white/80 [&_textarea]:text-sm [&_textarea]:font-mono">
              <InputText
                id={inputId ?? "raw-transaction-input"}
                multiline
                value={inputValue}
                onChange={onInputChange}
                placeholder={inputPlaceholder}
                borderClassName="border-green-100"
              />
            </div>
          </section>
          <section className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg border border-gray-200 bg-white/70 px-2 py-2 shadow-sm overflow-hidden">
            <div className="flex h-8 flex-shrink-0 items-center justify-between align-middle">
              <h2 className="text-xl font-bold text-gray-900">Output</h2>
              {outputToolbar}
            </div>
            <TransactionHashDisplay hash={transactionHash ?? null} />
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto rounded-lg border border-gray-200 bg-white/70 px-2 py-2 shadow-sm cursor-default">
              {outputContent}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DecoderLayout;

