"use client";
import type { LucideIcon } from "lucide-react";
import React from "react";

export interface SummaryItem {
  label: string;
  value: string | number;
  valueClassName?: string;
  icon?: LucideIcon;
}

interface SummaryGridProps {
  items: SummaryItem[];
  darkMode: boolean;
  showCompactLayout: boolean; // controls 4-col -> 2x2 transform
  className?: string; // optional wrapper classes
}

export default function SummaryGrid({
  items,
  darkMode,
  showCompactLayout,
  className = "",
}: SummaryGridProps) {
  const cardBase = `text-center rounded-lg transition-all duration-500 md:transition-none ${darkMode ? "bg-gray-700" : "bg-gray-50"}`;
  const cardPadding = showCompactLayout ? "py-2 px-4 md:py-2 md:px-6" : "py-2 md:py-2"; // more padding in compact mode
  const labelClass = `${darkMode ? "text-gray-300" : "text-gray-600"} text-sm`;
  const valueClassBase = "font-bold text-xl"; // slightly smaller than 2xl to reduce width

  return (
    <div
      className={`grid gap-3 transition-all duration-500 ease-in-out md:transition-none ${
        showCompactLayout
          ? "grid-cols-2 md:grid-cols-2 max-w-[280px] mx-auto"
          : "grid-cols-2 md:grid-cols-4"
      } ${className}`}
    >
      {/* Top-left */}
      <div className={`${cardBase} ${cardPadding} relative`}>
        {items[0]?.icon && (
          <div
            className={`absolute left-2 top-1/2 -translate-y-1/2 transition-opacity duration-300 md:transition-none ${showCompactLayout ? "opacity-100" : "opacity-0 md:opacity-0"}`}
          >
            {React.createElement(items[0].icon, {
              className: `w-4 h-4 ${items[0]?.valueClassName || ""}`,
            })}
          </div>
        )}
        <div className={`${valueClassBase} ${items[0]?.valueClassName || ""}`}>{items[0]?.value}</div>
        <div
          className={`${labelClass} transition-all duration-300 md:transition-none overflow-hidden ${showCompactLayout ? "max-h-0 opacity-0 md:max-h-6 md:opacity-100" : "max-h-6 opacity-100"}`}
        >
          {items[0]?.label}
        </div>
      </div>

      {/* Top-right */}
      <div className={`${cardBase} ${cardPadding} relative`}>
        {items[1]?.icon && (
          <div
            className={`absolute left-2 top-1/2 -translate-y-1/2 transition-opacity duration-300 md:transition-none ${showCompactLayout ? "opacity-100" : "opacity-0 md:opacity-0"}`}
          >
            {React.createElement(items[1].icon, {
              className: `w-4 h-4 ${items[1]?.valueClassName || ""}`,
            })}
          </div>
        )}
        <div className={`${valueClassBase} ${items[1]?.valueClassName || ""}`}>{items[1]?.value}</div>
        <div
          className={`${labelClass} transition-all duration-300 md:transition-none overflow-hidden ${showCompactLayout ? "max-h-0 opacity-0 md:max-h-6 md:opacity-100" : "max-h-6 opacity-100"}`}
        >
          {items[1]?.label}
        </div>
      </div>

      {/* Bottom-left */}
      <div className={`${cardBase} ${cardPadding} relative`}>
        {items[2]?.icon && (
          <div
            className={`absolute left-2 top-1/2 -translate-y-1/2 transition-opacity duration-300 md:transition-none ${showCompactLayout ? "opacity-100" : "opacity-0 md:opacity-0"}`}
          >
            {React.createElement(items[2].icon, {
              className: `w-4 h-4 ${items[2]?.valueClassName || ""}`,
            })}
          </div>
        )}
        <div className={`${valueClassBase} ${items[2]?.valueClassName || ""}`}>{items[2]?.value}</div>
        <div
          className={`${labelClass} transition-all duration-300 md:transition-none overflow-hidden ${showCompactLayout ? "max-h-0 opacity-0 md:max-h-6 md:opacity-100" : "max-h-6 opacity-100"}`}
        >
          {items[2]?.label}
        </div>
      </div>

      {/* Bottom-right */}
      <div className={`${cardBase} ${cardPadding} relative`}>
        {items[3]?.icon && (
          <div
            className={`absolute left-2 top-1/2 -translate-y-1/2 transition-opacity duration-300 md:transition-none ${showCompactLayout ? "opacity-100" : "opacity-0 md:opacity-0"}`}
          >
            {React.createElement(items[3].icon, {
              className: `w-4 h-4 ${items[3]?.valueClassName || ""}`,
            })}
          </div>
        )}
        <div className={`${valueClassBase} ${items[3]?.valueClassName || ""}`}>{items[3]?.value}</div>
        <div
          className={`${labelClass} transition-all duration-300 md:transition-none overflow-hidden ${showCompactLayout ? "max-h-0 opacity-0 md:max-h-6 md:opacity-100" : "max-h-6 opacity-100"}`}
        >
          {items[3]?.label}
        </div>
      </div>
    </div>
  );
}
