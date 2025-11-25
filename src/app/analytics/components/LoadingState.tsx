import Header from "@/app/components/Header";

interface LoadingStateProps {
  darkMode: boolean;
}

export function LoadingState({ darkMode }: LoadingStateProps) {
  return (
    <div
      className={`min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}
    >
      <Header />
      <div className="flex items-center justify-center min-h-[60vh] pt-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-lg">Loading teams...</p>
        </div>
      </div>
    </div>
  );
}
