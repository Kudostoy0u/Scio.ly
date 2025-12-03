"use client";

interface ResultsSummaryProps {
	isLoading: boolean;
	paginatedDataLength: number;
	filteredDataLength: number;
	searchTerm: string;
	darkMode: boolean;
}

export function ResultsSummary({
	isLoading,
	paginatedDataLength,
	filteredDataLength,
	searchTerm,
	darkMode,
}: ResultsSummaryProps) {
	return (
		<div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
			{isLoading ? (
				<div className="flex items-center space-x-1">
					<span
						className={`h-4 rounded w-12 animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
					/>
					<span
						className={`h-4 rounded w-8 animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
					/>
					<span
						className={`h-4 rounded w-16 animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
					/>
					<span
						className={`h-4 rounded w-12 animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
					/>
					<span
						className={`h-4 rounded w-16 animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
					/>
				</div>
			) : (
				<>
					Showing {paginatedDataLength} of {filteredDataLength} results
					{searchTerm && ` for "${searchTerm}"`}
				</>
			)}
		</div>
	);
}
