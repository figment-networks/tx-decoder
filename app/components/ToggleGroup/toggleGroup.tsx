"use client";

import React, { memo } from "react";

export type ToggleGroupItem = {
  content: React.ReactNode;
  value: string;
  prependedIcon?: React.ReactNode;
};

export type ToggleGroupProps = {
  onValueChange: (value: string) => void;
  items: ToggleGroupItem[];
  value: string;
  testId?: string;
};

const ToggleGroup: React.FC<ToggleGroupProps> = ({
  onValueChange,
  items,
  value,
  testId,
}) => {
  return (
    <div
      className="flex items-center gap-0.5 rounded-full border border-green-200 bg-white/70 p-0.5 shadow-sm"
      data-testid={testId}
      role="tablist"
      aria-orientation="horizontal"
    >
      {items.map((item) => {
        const isActive = item.value === value;

        const baseClasses = "flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium transition cursor-pointer";
        const activeClasses = "border border-green-400 bg-green-200/60 text-green-900";
        const inactiveClasses = "text-gray-600 hover:bg-green-50";

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onValueChange(item.value)}
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
            role="tab"
            aria-selected={isActive}
          >
            {item.prependedIcon && (
              <span className="flex items-center" aria-hidden>
                {item.prependedIcon}
              </span>
            )}
            <span>{item.content}</span>
          </button>
        );
      })}
    </div>
  );
};

export default memo(ToggleGroup);
