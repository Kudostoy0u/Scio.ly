"use client";

import { DISABLED_CIPHERS } from "@/app/codebusters/config";
import type { QuoteData } from "@/app/codebusters/types";
import type { Event, Settings } from "@/app/practice/types";
import type { MutableRefObject } from "react";

export default function SubtopicDropdown({
  darkMode,
  isCodebusters,
  selectedEvent,
  settings,
  isOpen,
  onToggleOpen,
  onToggleSubtopic,
  displayText,
  dropdownRef,
}: {
  darkMode: boolean;
  isCodebusters: boolean;
  selectedEvent: Event | null;
  settings: Settings;
  isOpen: boolean;
  onToggleOpen: () => void;
  onToggleSubtopic: (subtopic: string) => void;
  displayText: string;
  dropdownRef: MutableRefObject<HTMLDivElement | null>;
}) {
  const renderCodebusters = () => {
    const divisionBOnlyCiphers = ["Affine", "Atbash", "Caesar"];
    const disabledCiphers = DISABLED_CIPHERS;
    const divisionCOnlyAll: QuoteData["cipherType"][] = ["Hill 2x2", "Hill 3x3", "K3 Aristocrat"];
    const divisionCOnlyCiphers = divisionCOnlyAll.filter(
      (cipher) => !disabledCiphers.includes(cipher)
    );
    const bothDivisionsAll: QuoteData["cipherType"][] = [
      "Baconian",
      "Checkerboard",
      "Complete Columnar",
      "Cryptarithm",
      "Fractionated Morse",
      "K1 Aristocrat",
      "K2 Aristocrat",
      "Random Aristocrat",
      "K1 Patristocrat",
      "K2 Patristocrat",
      "K1 Xenocrypt",
      "K2 Xenocrypt",
      "Nihilist",
      "Porta",
    ];
    const bothDivisionsCiphers = bothDivisionsAll.filter(
      (cipher) => !disabledCiphers.includes(cipher)
    );

    const groups: Array<{ label: string; items: string[] }> = [
      { label: "Both Divisions", items: bothDivisionsCiphers },
      { label: "Division B Only", items: divisionBOnlyCiphers },
      { label: "Division C Only", items: divisionCOnlyCiphers },
    ];

    return groups.map((g) => (
      <div key={g.label} className="px-2 py-1">
        <div
          className={`${darkMode ? "text-gray-300" : "text-gray-700"} text-[10px] uppercase tracking-wider mb-1`}
        >
          {g.label}
        </div>
        {g.items.map((cipherType) => (
          <label
            key={cipherType}
            className={`flex items-center px-4 py-2 text-xs cursor-pointer ${darkMode ? "text-gray-300 hover:bg-gray-600" : "text-gray-700 hover:bg-gray-100"}`}
          >
            <input
              type="checkbox"
              checked={settings.subtopics.includes(cipherType)}
              onChange={() => onToggleSubtopic(cipherType)}
              className={`mr-3 rounded ${darkMode ? "bg-gray-600 border-gray-500" : "bg-gray-50 border-gray-300"}`}
            />
            {cipherType}
          </label>
        ))}
      </div>
    ));
  };

  const renderSubtopics = () => {
    const topics = selectedEvent
      ? typeof window !== "undefined" && window.eventSubtopicsMapping
        ? window.eventSubtopicsMapping[selectedEvent.name]
        : undefined
      : null;
    if (!topics) {
      return null;
    }
    return topics.map((subtopic: string) => (
      <label
        key={subtopic}
        className={`flex items-center px-4 py-2 text-xs cursor-pointer ${darkMode ? "text-gray-300 hover:bg-gray-600" : "text-gray-700 hover:bg-gray-100"}`}
      >
        <input
          type="checkbox"
          checked={settings.subtopics.includes(subtopic)}
          onChange={() => onToggleSubtopic(subtopic)}
          className={`mr-3 rounded ${darkMode ? "bg-gray-600 border-gray-500" : "bg-gray-50 border-gray-300"}`}
        />
        {subtopic}
      </label>
    ));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={onToggleOpen}
        className={`w-full flex justify-between items-center px-3 py-2.5 rounded-md border-0 text-sm ${darkMode ? "bg-gray-700 text-white focus:ring-blue-500" : "bg-gray-50 text-gray-900 focus:ring-blue-600"} shadow-sm focus:ring-1 focus:outline-none`}
      >
        <span>{displayText}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div
          className={`absolute z-10 mt-1 w-full rounded-md shadow-lg ${darkMode ? "bg-gray-700" : "bg-white"} ring-1 ring-black ring-opacity-5 max-h-60 overflow-y-auto`}
        >
          <div className="py-1">{isCodebusters ? renderCodebusters() : renderSubtopics()}</div>
        </div>
      )}
    </div>
  );
}
