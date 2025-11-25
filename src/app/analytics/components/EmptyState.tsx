import Header from "@/app/components/Header";

interface EmptyStateProps {
  darkMode: boolean;
}

export function EmptyState({ darkMode }: EmptyStateProps) {
  return (
    <div
      className={`min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}
    >
      <Header />
      <div className="flex items-center justify-center min-h-[60vh] pt-24">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-gray-500 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-label="No data icon"
            >
              <title>No Data</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">No Data Available</h2>
          <p className={`${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Team data could not be loaded.
          </p>
        </div>
      </div>
    </div>
  );
}
