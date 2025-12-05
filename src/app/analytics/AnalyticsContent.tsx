"use client";

import Header from "@/app/components/Header";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useState } from "react";
import { BackgroundLoadingIndicator } from "./components/BackgroundLoadingIndicator";
import { DivisionSelector } from "./components/DivisionSelector";
import EloViewer from "./components/EloViewer";
import { EmptyState } from "./components/EmptyState";
import { ErrorState } from "./components/ErrorState";
import { LoadingState } from "./components/LoadingState";
import { useLazyEloData } from "./hooks/useLazyEloData";

export default function AnalyticsContent() {
	const [division, setDivision] = useState<"b" | "c">("c");
	const { darkMode } = useTheme();

	const {
		data: eloData,
		metadata,
		loading,
		backgroundLoading,
		error,
		loadingProgress,
		loadedStates,
	} = useLazyEloData({ division });

	if (loading) {
		return <LoadingState darkMode={darkMode} />;
	}

	if (error) {
		return <ErrorState darkMode={darkMode} error={error} />;
	}

	if (!eloData) {
		return <EmptyState darkMode={darkMode} />;
	}

	return (
		<div
			className={`min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}
		>
			<Header />
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
				<div className="flex flex-col items-center gap-4 mb-8">
					<DivisionSelector
						division={division}
						darkMode={darkMode}
						onDivisionChange={setDivision}
					/>
					<BackgroundLoadingIndicator
						backgroundLoading={backgroundLoading}
						loadingProgress={loadingProgress}
						loadedStates={loadedStates}
					/>
				</div>

				<EloViewer
					eloData={eloData}
					division={division}
					metadata={metadata ?? undefined}
				/>
			</div>
		</div>
	);
}
