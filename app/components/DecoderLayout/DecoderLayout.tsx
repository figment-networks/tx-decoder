"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

import Icon, { IconName } from "../Icon/Icon";

type DecoderLayoutProps = {
  icon: IconName;
  title: string;
  description: string;
  inputTitle: string;
  inputContent: React.ReactNode;
  outputTitle: string;
  outputContent: React.ReactNode;
  outputToolbar?: React.ReactNode;
};

type ProtocolOption = {
  id: string;
  href: string;
  label: string;
  icon: IconName;
};

const protocolOptions: readonly ProtocolOption[] = [
  {
    id: "cardano",
    href: "/cardano",
    label: "Cardano",
    icon: "Cardano",
  },
  {
    id: "solana",
    href: "/solana",
    label: "Solana",
    icon: "Solana",
  },
];

const DecoderLayout: React.FC<DecoderLayoutProps> = ({
  icon,
  title,
  description,
  inputTitle,
  inputContent,
  outputTitle,
  outputContent,
  outputToolbar,
}) => {
  const pathname = usePathname();

  return (
    <div className="relative flex flex-col items-center h-screen bg-green-100 overflow-hidden">
      <div className="relative z-[1] w-full h-full flex flex-col gap-6 px-6 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-center justify-center gap-2 text-center md:items-start md:text-left">
            <div className="mb-2 flex flex-shrink-0 items-center justify-center gap-3 md:justify-start">
              <Icon icon={icon} />
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            </div>
            <p className="text-gray-600">{description}</p>
          </div>
          <div className="flex items-center justify-center md:justify-end">
            <div className="flex items-center gap-1 rounded-full border border-green-200 bg-white/70 p-1 shadow-sm">
              {protocolOptions.map((option) => {
                const isActive = pathname?.startsWith(option.href);

                const baseClasses = "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition";
                const activeClasses = "border border-green-400 bg-green-200/60 text-green-900";
                const inactiveClasses = "text-gray-600 hover:bg-green-50";

                return (
                  <Link key={option.id} href={option.href} prefetch={true}>
                    <div
                      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                    >
                      <Icon icon={option.icon} />
                      <span>{option.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-row gap-6">
          <section className="flex min-w-0 flex-1 flex-col">
            <h2 className="mb-2 text-xl font-bold text-gray-900">{inputTitle}</h2>
            <div className="flex min-h-0 flex-1 flex-col">{inputContent}</div>
          </section>

          <section className="flex min-w-0 flex-1 flex-col">
            <div className="mb-2 flex flex-shrink-0 items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{outputTitle}</h2>
              {outputToolbar}
            </div>
            {outputContent}
          </section>
        </div>
      </div>
    </div>
  );
};

export default DecoderLayout;

