"use client";

import React from "react";
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";
import { twMerge as tw } from "tailwind-merge";

import SolanaIcon from "./icons/solana-icon";
import CardanoIcon from "./icons/cardano-icon";
import SuiIcon from "./icons/sui-icon";

export const icons = Object.freeze({
  Solana: SolanaIcon,
  Cardano: CardanoIcon,
  Sui: SuiIcon,
  MdKeyboardArrowUp,
  MdKeyboardArrowDown,
});

export type IconName = keyof typeof icons;

export type IconProps = {
  icon: IconName;
  className?: string;
};

const Icon: React.FC<IconProps> = ({
  icon,
  className,
}) => {
  const IconComponent = icons[icon] as React.ComponentType;

  if (!IconComponent) {
    return <span className="text-red-600">?</span>;
  }

  return (
    <span className={tw("inline-flex items-center justify-center leading-none", className)}>
      <IconComponent aria-hidden="true" />
    </span>
  );
};

export default Icon;
