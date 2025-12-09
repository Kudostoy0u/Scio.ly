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
import { useMemo, useState } from "react";
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
	const [school1, setSchool1] = useState<string>("");
	const [school2, setSchool2] = useState<string>("");
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

	const handleSchool1Select = (selectedSchool: string) => {
		setSchool1(selectedSchool);
		setSchool1Search("");
	};

	const handleSchool2Select = (selectedSchool: string) => {
		setSchool2(selectedSchool);
		setSchool2Search("");
	};

	const handleSchool1Remove = () => {
		setSchool1("");
		setSchool1Search("");
	};

	const handleSchool2Remove = () => {
		setSchool2("");
		setSchool2Search("");
	};

	const handleCompare = () => {
		if (!(school1 && school2)) {
			setError("Please select both schools to compare");
			return;
		}

		if (school1 === school2) {
			setError("Please select different schools to compare");
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const { eventResults, overallResult } = compareSchools(
				eloData,
				school1,
				school2,
				mostRecentSeason,
				division,
			);
			setComparisonResults(eventResults);
			setOverallResult(overallResult);
		} catch (err) {
			setError("Error comparing schools");
			logger.error(err);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div
			className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-sm border ${darkMode ? "border-gray-700" : "border-gray-200"} p-6`}
		>
			<div className="text-center mb-6">
				<h2
					className={`text-2xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
				>
					⚔️ School Comparison Tool
				</h2>
				<p className={darkMode ? "text-gray-400" : "text-gray-600"}>
					Compare two schools and see their win probabilities across events -{" "}
					{mostRecentSeason} Season
				</p>
			</div>

			<div className="space-y-6 mb-6">
				<div>
					<label
						htmlFor="school1-input"
						className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"} mb-2`}
					>
						School 1:
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

				<div>
					<label
						htmlFor="school2-input"
						className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"} mb-2`}
					>
						School 2:
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

				<button
					type="button"
					onClick={handleCompare}
					disabled={!(school1 && school2) || isLoading}
					className="w-full px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
				>
					{isLoading ? "Comparing..." : "Compare Schools"}
				</button>
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
