"use client";
import { useTheme } from "@/app/contexts/ThemeContext";
import { getLetterFrequencies } from "@/app/codebusters/utils/substitution";

interface FrequencyTableProps {
  text: string;
  frequencyNotes?: { [key: string]: string };
  onNoteChange: (letter: string, note: string) => void;
  quoteIndex: number;
}

export const FrequencyTable = ({
  text,
  frequencyNotes,
  onNoteChange,
  quoteIndex,
}: FrequencyTableProps) => {
  const { darkMode } = useTheme();
  const frequencies = getLetterFrequencies(text);

  return (
    <div className={`mt-4 p-2 rounded ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
      <p className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
        Frequency Analysis
      </p>
      <div className="flex flex-wrap gap-2">
        {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
          <div key={letter} className="flex flex-col items-center min-w-[2rem]">
            <div
              className={`text-xs sm:text-sm font-bold ${darkMode ? "text-gray-300" : "text-gray-900"}`}
            >
              {letter}
            </div>
            <div className={`text-[10px] sm:text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              {frequencies[letter]}
            </div>
            <input
              type="text"
              id={`frequency-${quoteIndex}-${letter}`}
              name={`frequency-${quoteIndex}-${letter}`}
              maxLength={1}
              value={frequencyNotes?.[letter] || ""}
              onChange={(e) => onNoteChange(letter, e.target.value)}
              autoComplete="off"
              className={`w-5 h-5 sm:w-6 sm:h-6 text-center border rounded text-xs sm:text-sm mt-1 ${
                darkMode
                  ? "bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500"
                  : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
