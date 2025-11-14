"use client";

import React, { memo } from "react";
import * as RadixToggleGroup from "@radix-ui/react-toggle-group";
import { twMerge as tw } from "tailwind-merge";

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
  const selectedRef = React.useRef<HTMLButtonElement | null>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [width, setWidth] = React.useState(0);
  const [offset, setOffset] = React.useState(0);

  const handleValueChange = (nextValue: string) => {
    if (!isInitialized) {
      setIsInitialized(true);
    }

    if (nextValue !== "") {
      onValueChange(nextValue);
    }
  };

  React.useEffect(() => {
    if (selectedRef.current) {
      const itemRect = selectedRef.current.getBoundingClientRect();
      const toggleRect =
        selectedRef.current.parentElement?.getBoundingClientRect();

      if (!toggleRect) {
        return;
      }

      setWidth(Math.max(itemRect.width - 2, 0));
      setOffset(itemRect.left - toggleRect.left + 1);
    }
  }, [value, items]);

  return (
    <div
      className={tw(
        "relative w-fit h-fit overflow-x-auto rounded-full bg-basic-100"
      )}
      data-testid={testId}
      role="tablist"
      aria-orientation="horizontal"
    >
      <RadixToggleGroup.Root
        type="single"
        onValueChange={handleValueChange}
        value={value}
        className="flex flex-nowrap"
      >
        {items.map((item) => {
          const isSelectedOption = item.value === value;
          const itemTextColor = isSelectedOption
            ? "text-green-1000"
            : "text-basic-800";

          return (
            <RadixToggleGroup.Item
              key={item.value}
              value={item.value}
              className={tw(
                "relative z-[1] flex flex-shrink-0 items-center gap-1 pb-0.5 px-4 font-medium",
                "transition-colors duration-150",
                "text-sm",
                itemTextColor
              )}
              ref={value === item.value ? selectedRef : null}
            >
              {item.prependedIcon && (
                <span className="flex items-center" aria-hidden>
                  {item.prependedIcon}
                </span>
              )}
              <span className="contents">{item.content}</span>
            </RadixToggleGroup.Item>
          );
        })}
      </RadixToggleGroup.Root>
      <div
        style={{ width: `${width}px`, transform: `translateX(${offset}px)` }}
        className={tw(
          "pointer-events-none absolute inset-x-0 top-[1px] h-6 rounded-full",
          isInitialized && "transition-all duration-300",
          "bg-green-100 outline outline-1 outline-green-300"
        )}
        aria-hidden
      />
    </div>
  );
};

export default memo(ToggleGroup);
