import type { ComparisonResult } from "@/app/analytics/types/elo";

interface ComparisonResultsTableProps {
  results: ComparisonResult[];
  darkMode: boolean;
}

function getWinPercentageColor(percentage: number): string {
  if (percentage >= 60) {
    return "text-green-600";
  }
  if (percentage >= 40) {
    return "text-yellow-600";
  }
  return "text-red-600";
}

function getWinPercentageText(percentage: number): string {
  if (percentage >= 60) {
    return "Strong Advantage";
  }
  if (percentage >= 55) {
    return "Moderate Advantage";
  }
  if (percentage >= 45) {
    return "Even Match";
  }
  if (percentage >= 40) {
    return "Moderate Disadvantage";
  }
  return "Strong Disadvantage";
}

export function ComparisonResultsTable({ results, darkMode }: ComparisonResultsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className={darkMode ? "bg-gray-700" : "bg-gray-50"}>
          <tr>
            <th
              className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}
            >
              Event
            </th>
            <th
              className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}
            >
              School 1 Elo
            </th>
            <th
              className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}
            >
              School 2 Elo
            </th>
            <th
              className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}
            >
              Win Probability
            </th>
            <th
              className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}
            >
              Assessment
            </th>
          </tr>
        </thead>
        <tbody
          className={`divide-y ${darkMode ? "bg-gray-800 divide-gray-700" : "bg-white divide-gray-200"}`}
        >
          {results.map((result) => (
            <tr key={result.event} className={darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}>
              <td
                className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
              >
                {result.event}
              </td>
              <td
                className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${darkMode ? "text-blue-400" : "text-blue-600"}`}
              >
                {Math.round(result.school1Elo)}
              </td>
              <td
                className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${darkMode ? "text-blue-400" : "text-blue-600"}`}
              >
                {Math.round(result.school2Elo)}
              </td>
              <td
                className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${getWinPercentageColor(result.school1WinPercentage)}`}
              >
                {result.school1WinPercentage.toFixed(1)}%
              </td>
              <td
                className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${getWinPercentageColor(result.school1WinPercentage)}`}
              >
                {getWinPercentageText(result.school1WinPercentage)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
