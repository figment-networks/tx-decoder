"use client";

import Link from "next/link";
import React, { memo } from "react";

export type ToggleGroupItem = {
  content: React.ReactNode;
  value: string;
  prependedIcon?: React.ReactNode;
  href?: string; // If provided, renders as Link instead of button
};

export type ToggleGroupProps = {
  items: ToggleGroupItem[];
  value: string;
  testId?: string;
  size?: "sm" | "md"; // sm: smaller, md: medium (default)
  onValueChange?: (value: string) => void; // Required only when using buttons (no href)
  isActive?: (item: ToggleGroupItem) => boolean; // Custom active check (e.g., for pathname matching)
};

const ToggleGroup: React.FC<ToggleGroupProps> = ({
  items,
  value,
  testId,
  size = "sm",
  onValueChange,
  isActive,
}) => {
  const containerGap = size === "sm" ? "gap-0.5" : "gap-1";
  const containerPadding = size === "sm" ? "p-0.5" : "p-1";
  const itemGap = size === "sm" ? "gap-1.5" : "gap-2";
  const itemPadding = size === "sm" ? "px-2 py-1" : "px-3 py-2";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div
      className={`flex items-center ${containerGap} rounded-full border border-gray-200 bg-white/70 ${containerPadding} shadow-sm`}
      data-testid={testId}
      role="tablist"
      aria-orientation="horizontal"
    >
      {items.map((item) => {
        const active = isActive ? isActive(item) : item.value === value;
        const baseClasses = `flex items-center ${itemGap} rounded-full ${itemPadding} ${textSize} font-medium transition cursor-pointer`;
        const activeClasses = "border border-gray-400 bg-gray-200/60 text-gray-900";
        const inactiveClasses = "text-gray-600 hover:bg-gray-50";

        const content = (
          <>
            {item.prependedIcon && (
              <span className="flex items-center" aria-hidden>
                {item.prependedIcon}
              </span>
            )}
            <span>{item.content}</span>
          </>
        );

        if (item.href) {
          return (
            <Link key={item.value} href={item.href} prefetch={true}>
              <div
                className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
                role="tab"
                aria-selected={active}
              >
                {content}
              </div>
            </Link>
          );
        }

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onValueChange?.(item.value)}
            className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
            role="tab"
            aria-selected={active}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
};

export default memo(ToggleGroup);
