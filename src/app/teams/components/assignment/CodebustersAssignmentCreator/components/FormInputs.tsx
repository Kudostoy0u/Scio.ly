"use client";
import type { AssignmentDetails, QuestionGenerationSettings } from "../../assignmentTypes";

interface FormInputsProps {
  details: AssignmentDetails;
  settings: QuestionGenerationSettings;
  darkMode: boolean;
  onDetailsChange: (newDetails: Partial<AssignmentDetails>) => void;
  onSettingsChange: (newSettings: Partial<QuestionGenerationSettings>) => void;
}

export function FormInputs({
  details,
  settings,
  darkMode,
  onDetailsChange,
  onSettingsChange,
}: FormInputsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label
          htmlFor="num-questions"
          className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
        >
          Number of Questions *
        </label>
        <input
          id="num-questions"
          type="number"
          value={settings.questionCount}
          onChange={(e) =>
            onSettingsChange({
              questionCount: Number.parseInt(e.target.value) || 0,
            })
          }
          min="1"
          max="10"
          className={`mt-1 block w-full rounded-md border px-3 py-2 ${
            darkMode
              ? "border-gray-600 bg-gray-700 text-white"
              : "border-gray-300 bg-white text-gray-900"
          }`}
        />
      </div>

      <div>
        <label
          htmlFor="time-limit"
          className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
        >
          Time Limit (minutes) *
        </label>
        <input
          id="time-limit"
          type="number"
          value={details.timeLimitMinutes}
          onChange={(e) =>
            onDetailsChange({
              timeLimitMinutes: Number.parseInt(e.target.value) || 0,
            })
          }
          min="1"
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
