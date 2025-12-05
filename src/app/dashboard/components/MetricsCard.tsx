"use client";

// motion import kept for future animations
// import { motion } from 'framer-motion';
import type React from "react";
import NumberAnimation from "./NumberAnimation";

interface MetricsCardProps {
	title: string;
	dailyValue: number;
	weeklyValue: number;
	allTimeValue: number;
	view: "daily" | "weekly" | "allTime";
	onViewChange: (view: "daily" | "weekly" | "allTime") => void;
	color: string;
	darkMode: boolean;

	dailyDenominator?: number;
	weeklyDenominator?: number;
	allTimeDenominator?: number;
	formatAsFraction?: boolean;
	isLoading?: boolean;
}

export default function MetricsCard({
	title,
	dailyValue,
	weeklyValue,
	allTimeValue,
	view,
	onViewChange,
	color,
	darkMode,
	dailyDenominator,
	weeklyDenominator,
	allTimeDenominator,
	formatAsFraction,
	isLoading,
}: MetricsCardProps) {
	const cardStyle = darkMode
		? "bg-gray-800 border border-gray-700 text-white"
		: "bg-white border border-gray-200 text-gray-900";

	const handleClick = () => {
		if (view === "daily") {
			onViewChange("weekly");
		} else if (view === "weekly") {
			onViewChange("allTime");
		} else {
			onViewChange("daily");
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleClick();
		}
	};

	// Helper function to get value for a specific view
	const getValueForView = (
		currentView: "daily" | "weekly" | "allTime",
	): number => {
		if (currentView === "daily") {
			return dailyValue;
		}
		if (currentView === "weekly") {
			return weeklyValue;
		}
		return allTimeValue;
	};

	// Helper function to get denominator for a specific view
	const getDenominatorForView = (
		currentView: "daily" | "weekly" | "allTime",
	): number => {
		if (currentView === "daily") {
			return dailyDenominator ?? 0;
		}
		if (currentView === "weekly") {
			return weeklyDenominator ?? 0;
		}
		return allTimeDenominator ?? 0;
	};

	// Helper function to render loading state
	const renderLoadingState = () => (
		<div className={`text-4xl font-bold ${color}`}>...</div>
	);

	// Helper function to render simple number display
	const renderNumberDisplay = (value: number) => (
		<NumberAnimation value={value} className={`text-4xl font-bold ${color}`} />
	);

	// Helper function to render fraction display
	const renderFractionDisplay = (numerator: number, denominator: number) => (
		<div className={`text-4xl font-bold ${color}`}>
			<span>{numerator}</span>
			<span className={darkMode ? "text-gray-300" : "text-gray-500"}>/</span>
			<span className="text-blue-600">{denominator}</span>
		</div>
	);

	const getDisplay = (currentView: "daily" | "weekly" | "allTime") => {
		const hasData = dailyValue > 0 || weeklyValue > 0 || allTimeValue > 0;
		if (isLoading && !hasData) {
			return renderLoadingState();
		}
		if (!formatAsFraction) {
			const value = getValueForView(currentView);
			return renderNumberDisplay(value);
		}
		const numerator = getValueForView(currentView);
		const denominator = getDenominatorForView(currentView);
		return renderFractionDisplay(numerator, denominator);
	};

	// Compute opacity for each face to prevent z-fighting between 0deg and 360deg faces
	const getDailyOpacity = () => (view === "daily" ? 1 : 0);
	const getWeeklyOpacity = () => (view === "weekly" ? 1 : 0);
	const getAllTimeOpacity = () => (view === "allTime" ? 1 : 0);

	return (
		<div className="perspective-1000 hover:scale-[1.02] transition-transform duration-300 text-center">
			<button
				type="button"
				className="w-full h-32 p-0 rounded-lg cursor-pointer transition-transform duration-700 relative"
				style={{
					transformStyle: "preserve-3d",
					transform:
						view === "daily"
							? "rotateX(0deg)"
							: view === "weekly"
								? "rotateX(180deg)"
								: "rotateX(360deg)",
					minHeight: "120px",
				}}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
			>
				{/* Daily View */}
				<div
					className={`absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 py-4 md:px-5 rounded-lg ${cardStyle}`}
					style={{
						backfaceVisibility: "hidden",
						transform: "rotateX(0deg)",
						opacity: getDailyOpacity(),
						transition: "opacity 0ms",
						pointerEvents: view === "daily" ? "auto" : "none",
					}}
				>
					<h3
						className={`text-lg md:text-xl font-semibold text-center ${darkMode ? "text-white" : "text-gray-800"}`}
					>
						{`Daily ${title}`}
					</h3>
					{getDisplay("daily")}
				</div>

				{/* Weekly View */}
				<div
					className={`absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 py-4 md:px-5 rounded-lg ${cardStyle}`}
					style={{
						backfaceVisibility: "hidden",
						transform: "rotateX(180deg)",
						opacity: getWeeklyOpacity(),
						transition: "opacity 0ms",
						pointerEvents: view === "weekly" ? "auto" : "none",
					}}
				>
					<h3
						className={`text-lg md:text-xl font-semibold text-center ${darkMode ? "text-white" : "text-gray-800"}`}
					>
						{`Weekly ${title}`}
					</h3>
					{getDisplay("weekly")}
				</div>

				{/* All Time View */}
				<div
					className={`absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 py-4 md:px-5 rounded-lg ${cardStyle}`}
					style={{
						backfaceVisibility: "hidden",
						transform: "rotateX(360deg)",
						opacity: getAllTimeOpacity(),
						transition: "opacity 0ms",
						pointerEvents: view === "allTime" ? "auto" : "none",
					}}
				>
					<h3
						className={`text-lg md:text-xl font-semibold text-center ${darkMode ? "text-white" : "text-gray-800"}`}
					>
						{`All-time ${title}`}
					</h3>
					{getDisplay("allTime")}
				</div>
			</button>
		</div>
	);
}
