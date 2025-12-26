"use client";

import { useTheme } from "@/app/contexts/ThemeContext";

interface BackgroundLoadingIndicatorProps {
	backgroundLoading: boolean;
	loadingProgress: { loaded: number; total: number };
	loadedStates: string[];
}

export function BackgroundLoadingIndicator({
	backgroundLoading,
	loadingProgress,
}: BackgroundLoadingIndicatorProps) {
	const { darkMode } = useTheme();

	if (!backgroundLoading) {
		return null;
	}

	// Show indeterminate progress if total is 0 (initial loading state)
	const progressPercentage =
		loadingProgress.total === 0
			? 0
			: Math.min(100, (loadingProgress.loaded / loadingProgress.total) * 100);

	return (
		<div
			className={`fixed top-16 left-0 right-0 z-50 h-1 ${
				darkMode ? "bg-gray-700" : "bg-gray-200"
			}`}
		>
			{loadingProgress.total === 0 ? (
				// Indeterminate progress bar - show pulsing bar
				<div
					className="h-full w-1/4 bg-blue-600 animate-pulse"
					role="progressbar"
					aria-label="Loading data..."
					aria-valuenow={0}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-busy="true"
					tabIndex={0}
				/>
			) : (
				<div
					className="h-full bg-blue-600 transition-all duration-300 ease-out"
					style={{ width: `${progressPercentage}%` }}
					role="progressbar"
					aria-valuenow={loadingProgress.loaded}
					aria-valuemin={0}
					aria-valuemax={loadingProgress.total}
					aria-label={`Loading: ${loadingProgress.loaded} of ${loadingProgress.total} states`}
					tabIndex={0}
				/>
			)}
		</div>
	);
}
