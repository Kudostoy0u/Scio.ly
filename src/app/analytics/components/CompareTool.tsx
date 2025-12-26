"use client";
import logger from "@/lib/utils/logging/logger";

import type { ComparisonResult, EloData } from "@/app/analytics/types/elo";
import {
	compareSchools,
	getAllSchools,
} from "@/app/analytics/utils/eloDataProcessor";
import { useTheme } from "@/app/contexts/ThemeContext";
import { stripTrailingParenthetical } from "@/lib/utils/content/string";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

// Regex for extracting state codes from school names
const STATE_CODE_REGEX = /\(([A-Z]{2})\)$/;
import { MobileComparisonView } from "./CompareTool/MobileComparisonView";
import { OverallResult } from "./CompareTool/OverallResult";
import { SchoolInput } from "./CompareTool/SchoolInput";
import { getMostRecentSeason } from "./CompareTool/utils";

interface CompareToolProps {
	eloData: EloData;
	division?: "b" | "c";
}

const SCHOOL_NAME_REGEX = /\s*\([^)]*\)$/;

function getWinPercentageColor(percentage: number, darkMode: boolean): string {
	const colorMap: Array<{ threshold: number; dark: string; light: string }> = [
		{ threshold: 70, dark: "text-green-600", light: "text-green-800" },
		{ threshold: 60, dark: "text-green-400", light: "text-green-600" },
		{ threshold: 50, dark: "text-green-500", light: "text-green-500" },
		{ threshold: 40, dark: "text-yellow-400", light: "text-yellow-500" },
		{ threshold: 30, dark: "text-orange-400", light: "text-orange-600" },
	];

	for (const { threshold, dark, light } of colorMap) {
		if (percentage >= threshold) {
			return darkMode ? dark : light;
		}
	}
	return darkMode ? "text-red-400" : "text-red-600";
}

function getWinPercentageText(percentage: number, schoolName?: string): string {
	const textMap: Array<{ threshold: number; text: string }> = [
		{ threshold: 70, text: "Strong Advantage" },
		{ threshold: 60, text: "Moderate Advantage" },
		{ threshold: 50, text: "Slight Advantage" },
		{ threshold: 40, text: "Slight Disadvantage" },
		{ threshold: 30, text: "Moderate Disadvantage" },
	];

	let baseText = "Strong Disadvantage";
	for (const { threshold, text } of textMap) {
		if (percentage >= threshold) {
			baseText = text;
			break;
		}
	}

	return schoolName ? `${baseText} to ${schoolName}` : baseText;
}

interface ComparisonTableRowProps {
	result: ComparisonResult;
	darkMode: boolean;
	getWinPercentageColor: (percentage: number, darkMode: boolean) => string;
	getWinPercentageText: (percentage: number) => string;
}

const ComparisonTableRow: React.FC<ComparisonTableRowProps> = ({
	result,
	darkMode,
	getWinPercentageColor,
	getWinPercentageText,
}) => {
	const rowClassName = darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50";
	const eventClassName = `px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`;
	const eloClassName = `px-6 py-4 whitespace-nowrap text-sm font-semibold ${darkMode ? "text-blue-400" : "text-blue-600"}`;
	const winPercentageColor = getWinPercentageColor(
		result.school1WinPercentage,
		darkMode,
	);
	const winPercentageClassName = `px-6 py-4 whitespace-nowrap text-sm font-semibold ${winPercentageColor}`;

	return (
		<tr className={rowClassName}>
			<td className={eventClassName}>{result.event}</td>
			<td className={eloClassName}>{Math.round(result.school1Elo)}</td>
			<td className={eloClassName}>{Math.round(result.school2Elo)}</td>
			<td className={winPercentageClassName}>
				{result.school1WinPercentage.toFixed(1)}%
			</td>
			<td className={winPercentageClassName}>
				{getWinPercentageText(result.school1WinPercentage)}
			</td>
		</tr>
	);
};

interface ComparisonResultsProps {
	comparisonResults: ComparisonResult[];
	school1: string;
	school2: string;
	darkMode: boolean;
	getWinPercentageColor: (percentage: number, darkMode: boolean) => string;
	getWinPercentageText: (percentage: number) => string;
}

const ComparisonResults: React.FC<ComparisonResultsProps> = ({
	comparisonResults,
	school1,
	school2,
	darkMode,
	getWinPercentageColor,
	getWinPercentageText,
}) => {
	if (comparisonResults.length === 0) {
		return null;
	}

	return (
		<div>
			<h3
				className={`text-lg font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}
			>
				Event-by-Event Comparison
			</h3>

			<MobileComparisonView
				results={comparisonResults}
				school1={school1}
				darkMode={darkMode}
				getWinPercentageColor={getWinPercentageColor}
				getWinPercentageText={getWinPercentageText}
			/>

			{/* Desktop table view */}
			<div className="hidden md:block">
				<div
					className={`overflow-hidden rounded-lg border ${darkMode ? "border-gray-700" : "border-gray-200"}`}
				>
					<div className="overflow-x-auto">
						<table
							className={`min-w-full divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}
						>
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
										<strong>{stripTrailingParenthetical(school1)}</strong> Elo
									</th>
									<th
										className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}
									>
										<strong>{stripTrailingParenthetical(school2)}</strong> Elo
									</th>
									<th
										className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}
									>
										<strong>{school1.replace(SCHOOL_NAME_REGEX, "")}</strong>{" "}
										Win %
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
								{comparisonResults.map((result) => (
									<ComparisonTableRow
										key={result.event}
										result={result}
										darkMode={darkMode}
										getWinPercentageColor={getWinPercentageColor}
										getWinPercentageText={getWinPercentageText}
									/>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
};

const CompareTool: React.FC<CompareToolProps> = ({ eloData, division }) => {
	// Parse hash parameters on initial load
	// Handles double-encoded URLs (e.g., %2520 instead of %20)
	const getInitialSchoolsFromHash = (): {
		school1: string;
		school2: string;
	} => {
		if (typeof window === "undefined") return { school1: "", school2: "" };

		const hash = window.location.hash;
		if (hash.startsWith("#compare?")) {
			const params = new URLSearchParams(hash.slice(9)); // Remove "#compare?"
			const school1Param = params.get("school1") || "";
			const school2Param = params.get("school2") || "";

			// Handle double-encoded URLs by decoding multiple times
			let decoded1 = school1Param;
			let decoded2 = school2Param;
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

			return {
				school1: decoded1,
				school2: decoded2,
			};
		}
		return { school1: "", school2: "" };
	};

	const initialSchools = getInitialSchoolsFromHash();
	const [school1, setSchool1] = useState<string>(initialSchools.school1);
	const [school2, setSchool2] = useState<string>(initialSchools.school2);
	const [school1Search, setSchool1Search] = useState<string>("");
	const [school2Search, setSchool2Search] = useState<string>("");
	const [comparisonResults, setComparisonResults] = useState<
		ComparisonResult[]
	>([]);
	const [overallResult, setOverallResult] = useState<ComparisonResult | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { darkMode } = useTheme();

	const schools = useMemo(() => getAllSchools(eloData), [eloData]);
	const mostRecentSeason = useMemo(
		() => getMostRecentSeason(eloData),
		[eloData],
	);

	// Track if we're loading from hash to prevent hash updates during initial load
	const [isLoadingFromHash, setIsLoadingFromHash] = useState(
		!!(initialSchools.school1 && initialSchools.school2),
	);

	// Update hash when schools change (but not during initial hash load)
	useEffect(() => {
		if (typeof window === "undefined") return;
		// Don't update hash if we're still loading from hash
		if (isLoadingFromHash) return;

		if (school1 && school2) {
			const params = new URLSearchParams({
				school1: encodeURIComponent(school1),
				school2: encodeURIComponent(school2),
			});
			const newHash = `#compare?${params.toString()}`;
			if (window.location.hash !== newHash) {
				window.history.replaceState(null, "", newHash);
			}
		} else if (!school1 && !school2) {
			// Clear hash if both schools are cleared
			if (window.location.hash.startsWith("#compare")) {
				window.history.replaceState(null, "", "#compare");
			}
		}
	}, [school1, school2, isLoadingFromHash]);

	const handleSchool1Select = (selectedSchool: string) => {
		setSchool1(selectedSchool);
		setSchool1Search("");
		// Auto-compare when both schools are selected
		// Pass the selected school directly to avoid stale state issues
		if (selectedSchool && school2) {
			setTimeout(() => {
				handleCompare(selectedSchool, school2);
			}, 100);
		}
	};

	const handleSchool2Select = (selectedSchool: string) => {
		setSchool2(selectedSchool);
		setSchool2Search("");
		// Auto-compare when both schools are selected
		// Pass the selected school directly to avoid stale state issues
		if (school1 && selectedSchool) {
			setTimeout(() => {
				handleCompare(school1, selectedSchool);
			}, 100);
		}
	};

	const handleSchool1Remove = () => {
		setSchool1("");
		setSchool1Search("");
		// Clear comparison results when a school is removed
		setComparisonResults([]);
		setOverallResult(null);
		setError(null);
	};

	const handleSchool2Remove = () => {
		setSchool2("");
		setSchool2Search("");
		// Clear comparison results when a school is removed
		setComparisonResults([]);
		setOverallResult(null);
		setError(null);
	};

	const handleCompare = useCallback(
		(overrideSchool1?: string, overrideSchool2?: string) => {
			const school1ToUse = overrideSchool1 ?? school1;
			const school2ToUse = overrideSchool2 ?? school2;

			if (!(school1ToUse && school2ToUse)) {
				setError("Please select both schools to compare");
				return;
			}

			if (school1ToUse === school2ToUse) {
				setError("Please select different schools to compare");
				return;
			}

			setIsLoading(true);
			setError(null);

			try {
				const { eventResults, overallResult } = compareSchools(
					eloData,
					school1ToUse,
					school2ToUse,
					mostRecentSeason,
					division,
				);
				setComparisonResults(eventResults);
				setOverallResult(overallResult);

				// Update hash after comparison
				if (typeof window !== "undefined") {
					const params = new URLSearchParams({
						school1: encodeURIComponent(school1ToUse),
						school2: encodeURIComponent(school2ToUse),
					});
					const newHash = `#compare?${params.toString()}`;
					window.history.replaceState(null, "", newHash);
				}
			} catch (err) {
				setError("Error comparing schools");
				logger.error(err);
			} finally {
				setIsLoading(false);
			}
		},
		[eloData, school1, school2, mostRecentSeason, division],
	);

	// Auto-compare ONLY when schools are loaded from hash on initial mount
	// Do NOT auto-compare when schools are manually selected

	// Listen for hash changes (when navigating with hash links)
	// When hash changes to a compare link, update schools and auto-compare
	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleHashChange = () => {
			const hash = window.location.hash;
			if (hash.startsWith("#compare?")) {
				const params = new URLSearchParams(hash.slice(9));
				// Handle double-encoded URLs
				const school1Param = params.get("school1") || "";
				const school2Param = params.get("school2") || "";

				// Decode multiple times to handle double encoding
				let decoded1 = school1Param;
				let decoded2 = school2Param;
				let prev1 = "";
				let prev2 = "";
				while (decoded1 !== prev1 || decoded2 !== prev2) {
					prev1 = decoded1;
					prev2 = decoded2;
					try {
						decoded1 = decodeURIComponent(decoded1);
						decoded2 = decodeURIComponent(decoded2);
					} catch {
						decoded1 = prev1;
						decoded2 = prev2;
						break;
					}
				}

				if (decoded1 && decoded2 && schools.length > 0) {
					const school1Exists = schools.includes(decoded1);
					const school2Exists = schools.includes(decoded2);

					if (school1Exists && school2Exists) {
						setSchool1(decoded1);
						setSchool2(decoded2);
						// Clear previous comparison
						setComparisonResults([]);
						setOverallResult(null);
						setError(null);
						// Auto-compare when navigating via hash
						setTimeout(() => {
							handleCompare(decoded1, decoded2);
						}, 100);
					}
				}
			}
		};

		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, [schools, handleCompare]);

	// Auto-compare when schools are loaded from hash on initial mount
	// This ensures direct links with query parameters auto-compare
	useEffect(() => {
		// Only run if we're loading from hash
		if (!isLoadingFromHash) return;

		// Check if we have schools from hash
		if (!initialSchools.school1 || !initialSchools.school2) {
			setIsLoadingFromHash(false);
			return;
		}

		// Function to check and run comparison
		const tryComparison = () => {
			// Get fresh schools list
			const currentSchools = getAllSchools(eloData);

			// Verify schools exist in the data
			const school1Exists = currentSchools.includes(initialSchools.school1);
			const school2Exists = currentSchools.includes(initialSchools.school2);

			if (school1Exists && school2Exists) {
				// Schools exist, run comparison immediately
				// Use a small delay to ensure state is ready
				setTimeout(() => {
					handleCompare(initialSchools.school1, initialSchools.school2);
					setIsLoadingFromHash(false);
				}, 100);
				return true;
			}
			return false;
		};

		// Try immediately if data is available
		if (Object.keys(eloData).length > 0) {
			if (tryComparison()) {
				return;
			}
		}

		// If schools don't exist yet, wait a bit and retry (data might still be loading)
		const retryTimeout = setTimeout(() => {
			if (!tryComparison()) {
				// Schools still not found after retry, stop trying
				setIsLoadingFromHash(false);
			}
		}, 2000);

		return () => clearTimeout(retryTimeout);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [eloData, isLoadingFromHash, handleCompare]);

	// Clear comparison results when either school is removed
	useEffect(() => {
		if (!school1 || !school2) {
			setComparisonResults([]);
			setOverallResult(null);
			setError(null);
		}
	}, [school1, school2]);

	// Auto-compare whenever both schools are set AND their state data is available
	// This ensures comparison runs as soon as data is loaded, regardless of how schools were set
	useEffect(() => {
		// Must have both schools
		if (!school1 || !school2) return;

		// Must have some data loaded
		if (!eloData || Object.keys(eloData).length === 0) return;

		// Extract state codes from school names
		const match1 = school1.match(STATE_CODE_REGEX);
		const match2 = school2.match(STATE_CODE_REGEX);

		if (!match1 || !match2) return;

		const state1 = match1[1];
		const state2 = match2[1];

		if (!state1 || !state2) return;

		// Check if both states are loaded
		const state1Loaded = eloData[state1] !== undefined;
		const state2Loaded = eloData[state2] !== undefined;

		// Extract school names without state codes
		const school1Name = school1.replace(` (${state1})`, "");
		const school2Name = school2.replace(` (${state2})`, "");

		// Check if both schools exist in their respective states
		const school1Exists =
			state1Loaded && eloData[state1]?.[school1Name] !== undefined;
		const school2Exists =
			state2Loaded && eloData[state2]?.[school2Name] !== undefined;

		// If both schools are available and we don't have comparison results yet, run comparison
		if (
			school1Exists &&
			school2Exists &&
			comparisonResults.length === 0 &&
			!overallResult
		) {
			// Small delay to avoid multiple rapid calls
			const timeoutId = setTimeout(() => {
				handleCompare(school1, school2);
			}, 200);
			return () => clearTimeout(timeoutId);
		}

		return undefined;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [school1, school2, eloData, comparisonResults.length, overallResult]);

	return (
		<div
			className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-sm border ${darkMode ? "border-gray-700" : "border-gray-200"} p-6`}
		>
			<div className="text-center mb-6">
				<h2
					className={`text-2xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
				>
					School Comparison Tool
				</h2>
				<p className={darkMode ? "text-gray-400" : "text-gray-600"}>
					Compare two schools and see their win probabilities across events -{" "}
					{mostRecentSeason} Season
				</p>
			</div>

			<div className="space-y-6 mb-6">
				{/* School Selection Row with Sword Design */}
				<div className="flex flex-col md:flex-row items-start gap-4">
					{/* School 1 */}
					<div className="flex-1 w-full md:w-auto">
						<label
							htmlFor="school1-input"
							className={`block text-sm font-medium text-center ${darkMode ? "text-gray-300" : "text-gray-700"} mb-2`}
						>
							School 1
						</label>
						<SchoolInput
							id="school1-input"
							label="school 1"
							selectedSchool={school1}
							search={school1Search}
							onSearchChange={setSchool1Search}
							onSelect={handleSchool1Select}
							onRemove={handleSchool1Remove}
							schools={schools}
							darkMode={darkMode}
						/>
					</div>

					{/* Sword Icon - Hidden on mobile, shown on desktop */}
					<div className="hidden md:flex items-center justify-center pt-8 px-2">
						<div
							className={`text-4xl ${darkMode ? "text-gray-400" : "text-gray-500"}`}
						>
							⚔️
						</div>
					</div>

					{/* School 2 */}
					<div className="flex-1 w-full md:w-auto">
						<label
							htmlFor="school2-input"
							className={`block text-sm font-medium text-center ${darkMode ? "text-gray-300" : "text-gray-700"} mb-2`}
						>
							School 2
						</label>
						<SchoolInput
							id="school2-input"
							label="school 2"
							selectedSchool={school2}
							search={school2Search}
							onSearchChange={setSchool2Search}
							onSelect={handleSchool2Select}
							onRemove={handleSchool2Remove}
							schools={schools}
							darkMode={darkMode}
						/>
					</div>
				</div>
			</div>

			{error && (
				<div
					className={`px-4 py-3 rounded-md mb-6 ${
						darkMode
							? "bg-red-900/20 border border-red-800 text-red-300"
							: "bg-red-50 border border-red-200 text-red-700"
					}`}
				>
					{error}
				</div>
			)}

			{overallResult && (
				<OverallResult
					result={overallResult}
					school1={school1}
					school2={school2}
					darkMode={darkMode}
					getWinPercentageColor={getWinPercentageColor}
					getWinPercentageText={getWinPercentageText}
				/>
			)}

			<div>
				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<div className="text-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
							<p
								className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
							>
								Analyzing schools...
							</p>
						</div>
					</div>
				) : (
					<ComparisonResults
						comparisonResults={comparisonResults}
						school1={school1}
						school2={school2}
						darkMode={darkMode}
						getWinPercentageColor={getWinPercentageColor}
						getWinPercentageText={getWinPercentageText}
					/>
				)}
			</div>
		</div>
	);
};

export default CompareTool;
