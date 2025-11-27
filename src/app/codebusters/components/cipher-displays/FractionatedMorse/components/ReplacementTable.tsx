"use client";
import { ReplacementTableCell } from "./ReplacementTableCell";

interface ReplacementTableProps {
  usedTriplets: string[];
  solution: Record<string, string> | undefined;
  fractionationTable: { [key: string]: string } | undefined;
  isTestSubmitted: boolean;
  darkMode: boolean;
  quoteIndex: number;
  onSolutionChange: (quoteIndex: number, key: string, value: string) => void;
  handleReplacementTableChange: (triplet: string, value: string) => void;
}

export function ReplacementTable({
  usedTriplets,
  solution,
  fractionationTable,
  isTestSubmitted,
  darkMode,
  quoteIndex,
  onSolutionChange,
  handleReplacementTableChange,
}: ReplacementTableProps) {
  return (
    <div
      className={`mt-4 mb-4 p-3 rounded border replacement-table-container ${darkMode ? "bg-gray-800 border-gray-600" : "bg-gray-50 border-gray-300"}`}
    >
      <div className={`text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
        Replacement Table
      </div>
      <div className="overflow-x-auto replacement-table-wrapper">
        <table className="text-xs border-collapse min-w-full replacement-table">
          <tbody>
            {/* Replacement row - editable cells */}
            <tr>
              <td
                className={`p-1 border text-center font-bold ${darkMode ? "border-gray-600 text-gray-300" : "border-gray-300 text-gray-700"}`}
              >
                Replacement
              </td>
              {usedTriplets.map((triplet) => {
                const replacementValue = solution?.[`replacement_${triplet}`] || "";
                const correctValue = fractionationTable?.[triplet] || "";
                const isCorrect = replacementValue === correctValue;
                const hasUserInput = replacementValue !== "";

                return (
                  <ReplacementTableCell
                    key={triplet}
                    triplet={triplet}
                    replacementValue={replacementValue}
                    correctValue={correctValue}
                    isCorrect={isCorrect}
                    hasUserInput={hasUserInput}
                    isTestSubmitted={isTestSubmitted}
                    darkMode={darkMode}
                    usedTriplets={usedTriplets}
                    solution={solution}
                    quoteIndex={quoteIndex}
                    onSolutionChange={onSolutionChange}
                    handleReplacementTableChange={handleReplacementTableChange}
                  />
                );
              })}
            </tr>
            {/* Morse triplet rows - 3 rows for the 3 positions in each triplet */}
            {[0, 1, 2].map((position) => (
              <tr key={`fm-position-${position}`}>
                <td
                  className={`p-1 border text-center font-bold ${darkMode ? "border-gray-600 text-gray-300" : "border-gray-300 text-gray-700"}`}
                >
                  {position === 0 ? "Morse code" : ""}
                </td>
                {usedTriplets.map((triplet) => (
                  <td
                    key={`fm-triplet-${triplet}-${position}`}
                    className={`p-1 border text-center ${darkMode ? "border-gray-600 text-gray-400" : "border-gray-300 text-gray-600"}`}
                  >
                    {triplet[position] || ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
