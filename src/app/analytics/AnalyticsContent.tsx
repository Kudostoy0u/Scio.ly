"use client";

import Header from "@/app/components/Header";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useEffect, useMemo, useState } from "react";
import { BackgroundLoadingIndicator } from "./components/BackgroundLoadingIndicator";
import { DivisionSelector } from "./components/DivisionSelector";
import EloViewer from "./components/EloViewer";
import { EmptyState } from "./components/EmptyState";
import { ErrorState } from "./components/ErrorState";
import { LoadingState } from "./components/LoadingState";
import { useLazyEloData } from "./hooks/useLazyEloData";

// Regex for extracting state codes from school names
const STATE_CODE_REGEX = /\(([A-Z]{2})\)$/;

/**
 * Extract state codes from compare hash link
 */
function getPriorityStatesFromHash(): string[] {
	if (typeof window === "undefined") return [];

	const hash = window.location.hash;
	if (!hash.startsWith("#compare?")) return [];

	try {
		const params = new URLSearchParams(hash.slice(9)); // Remove "#compare?"
		let school1 = params.get("school1") || "";
		let school2 = params.get("school2") || "";

		// Handle double-encoded URLs by decoding multiple times
		let decoded1 = school1;
		let decoded2 = school2;
		let prev1 = "";
		let prev2 = "";

		// Decode until no more changes (handles double/triple encoding)
		while (decoded1 !== prev1 || decoded2 !== prev2) {
			prev1 = decoded1;
			prev2 = decoded2;
			try {
				decoded1 = decodeURIComponent(decoded1);
				decoded2 = decodeURIComponent(decoded2);
			} catch {
				// If decoding fails, use the last successful decode
				decoded1 = prev1;
				decoded2 = prev2;
				break;
			}
		}

		const states = new Set<string>();

		// Extract state codes from school names
		const match1 = decoded1.match(STATE_CODE_REGEX);
		if (match1 && match1[1]) {
			states.add(match1[1]);
		}

		const match2 = decoded2.match(STATE_CODE_REGEX);
		if (match2 && match2[1]) {
			states.add(match2[1]);
		}

		return Array.from(states);
	} catch {
		return [];
	}
}

export default function AnalyticsContent() {
	const [division, setDivision] = useState<"b" | "c">("c");
	const { darkMode } = useTheme();

	// Get priority states from hash if it's a compare link
	const priorityStates = useMemo(() => getPriorityStatesFromHash(), []);

	const {
		data: eloData,
		metadata,
		loading,
		backgroundLoading,
		error,
		loadingProgress,
		loadedStates,
	} = useLazyEloData({
		division,
		priorityStates: priorityStates.length > 0 ? priorityStates : undefined,
	});

	// Only show loading state while fetching metadata
	// After that, render with empty data and load states in background
	if (loading && !metadata) {
		return <LoadingState darkMode={darkMode} />;
	}

	if (error) {
		return <ErrorState darkMode={darkMode} error={error} />;
	}

	// Allow rendering with empty data (will be populated as states load)
	if (!eloData) {
		return <EmptyState darkMode={darkMode} />;
	}

	return (
		<div
			className={`min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}
		>
			<Header />
			<BackgroundLoadingIndicator
				backgroundLoading={backgroundLoading}
				loadingProgress={loadingProgress}
				loadedStates={loadedStates}
			/>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
				<div className="flex flex-col items-center gap-4 mb-8">
					<DivisionSelector
						division={division}
						darkMode={darkMode}
						onDivisionChange={setDivision}
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
