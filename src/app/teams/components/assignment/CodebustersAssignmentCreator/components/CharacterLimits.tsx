"use client";
import type { QuestionGenerationSettings } from "../../assignmentTypes";

interface CharacterLimitsProps {
  charLengthMin: number | undefined;
  charLengthMax: number | undefined;
  darkMode: boolean;
  onSettingsChange: (newSettings: Partial<QuestionGenerationSettings>) => void;
}

export function CharacterLimits({
  charLengthMin,
  charLengthMax,
  darkMode,
  onSettingsChange,
}: CharacterLimitsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label
          htmlFor="min-char-length"
          className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
        >
          Min Character Length
        </label>
        <input
          id="min-char-length"
          type="number"
          value={charLengthMin || 50}
          onChange={(e) =>
            onSettingsChange({ charLengthMin: Number.parseInt(e.target.value) || 50 })
          }
          className={`mt-1 block w-full rounded-md border px-3 py-2 ${
            darkMode
              ? "border-gray-600 bg-gray-700 text-white"
              : "border-gray-300 bg-white text-gray-900"
          }`}
        />
      </div>

      <div>
        <label
          htmlFor="max-char-length"
          className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
        >
          Max Character Length
        </label>
        <input
          id="max-char-length"
          type="number"
          value={charLengthMax || 200}
          onChange={(e) =>
            onSettingsChange({
              charLengthMax: Number.parseInt(e.target.value) || 200,
            })
          }
          className={`mt-1 block w-full rounded-md border px-3 py-2 ${
            darkMode
              ? "border-gray-600 bg-gray-700 text-white"
              : "border-gray-300 bg-white text-gray-900"
          }`}
        />
      </div>
    </div>
  );
}
