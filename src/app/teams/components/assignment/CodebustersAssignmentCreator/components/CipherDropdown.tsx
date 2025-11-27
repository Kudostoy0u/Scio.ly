"use client";
import type { QuoteData } from "@/app/codebusters/types";
import { getAvailableCiphers } from "../utils/cipherConfig";

interface CipherDropdownProps {
  cipherTypes: string[];
  division: string;
  darkMode: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onCipherTypesChange: (cipherTypes: string[]) => void;
}

export function CipherDropdown({
  cipherTypes,
  division,
  darkMode,
  isOpen,
  onToggle,
  onClose,
  onCipherTypesChange,
}: CipherDropdownProps) {
  const availableCiphers = getAvailableCiphers(division);

  const handleSelectAll = () => {
    onCipherTypesChange(["all"]);
    onClose();
  };

  const handleToggleCipher = (cipher: QuoteData["cipherType"]) => {
    if (cipherTypes.includes("all")) {
      onCipherTypesChange([cipher]);
    } else if (cipherTypes.includes(cipher)) {
      const newTypes = cipherTypes.filter((t) => t !== cipher);
      onCipherTypesChange(newTypes.length > 0 ? newTypes : ["all"]);
    } else {
      onCipherTypesChange([...cipherTypes, cipher]);
    }
  };

  return (
    <div>
      <label
        htmlFor="cipher-types-button"
        className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
      >
        Cipher Types *
      </label>
      <div className="mt-1 relative cipher-dropdown">
        <button
          id="cipher-types-button"
          type="button"
          onClick={onToggle}
          className={`relative w-full rounded-md border px-3 py-2 text-left cursor-pointer ${
            darkMode
              ? "border-gray-600 bg-gray-700 text-white"
              : "border-gray-300 bg-white text-gray-900"
          }`}
        >
          <span className="block truncate">
            {cipherTypes?.includes("all")
              ? "All Available Ciphers"
              : cipherTypes && cipherTypes.length > 0
                ? `${cipherTypes.length} ciphers selected`
                : "Select cipher types"}
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              role="img"
              aria-label="Dropdown arrow"
            >
              <title>Dropdown arrow</title>
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </button>
        {isOpen && (
          <div
            className={`absolute z-10 mt-1 w-full rounded-md border shadow-lg max-h-60 overflow-auto ${
              darkMode ? "border-gray-600 bg-gray-700" : "border-gray-300 bg-white"
            }`}
          >
            <button
              type="button"
              onClick={handleSelectAll}
              className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 ${
                cipherTypes.includes("all")
                  ? darkMode
                    ? "bg-blue-900/20 text-blue-300"
                    : "bg-blue-50 text-blue-700"
                  : darkMode
                    ? "text-gray-300"
                    : "text-gray-900"
              }`}
            >
              All Available Ciphers
            </button>
            {availableCiphers.map((cipher) => (
              <button
                key={cipher}
                type="button"
                onClick={() => handleToggleCipher(cipher)}
                className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 ${
                  cipherTypes.includes(cipher)
                    ? darkMode
                      ? "bg-blue-900/20 text-blue-300"
                      : "bg-blue-50 text-blue-700"
                    : darkMode
                      ? "text-gray-300"
                      : "text-gray-900"
                }`}
              >
                {cipher}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
