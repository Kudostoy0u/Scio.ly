"use client";

import { formatTime } from "@/app/utils/questionUtils";
import { useEffect, useState } from "react";

interface FloatingTimerProps {
	timeLeft: number | null;
	darkMode: boolean;
	isSubmitted: boolean;
}

export default function FloatingTimer({
	timeLeft,
	darkMode,
	isSubmitted,
}: FloatingTimerProps) {
	const [scrollY, setScrollY] = useState(0);
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			const currentScrollY = window.scrollY;
			setScrollY(currentScrollY);

			// Show timer when scrolled past 100px (when navbar starts fading)
			// Fade in over the next 100px
			const fadeThreshold = 100;
			const fadeRange = 100;
			const opacity = Math.max(
				0,
				Math.min(1, (currentScrollY - fadeThreshold) / fadeRange),
			);
			setIsVisible(opacity > 0.1);
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		handleScroll(); // Check initial state

		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	if (timeLeft === null || isSubmitted || !isVisible) {
		return null;
	}

	// Calculate color based on time left
	// Green: > 5 minutes (300s)
	// Yellow: 1-5 minutes (60-300s)
	// Red: < 1 minute (< 60s)
	const getColor = () => {
		if (timeLeft > 300) {
			return darkMode ? "text-green-400" : "text-green-600";
		}
		if (timeLeft > 60) {
			return darkMode ? "text-yellow-400" : "text-yellow-600";
		}
		return darkMode ? "text-red-400" : "text-red-600";
	};

	const getBgColor = () => {
		if (timeLeft > 300) {
			return darkMode
				? "bg-gray-800/90 border-green-400/30"
				: "bg-white/90 border-green-600/30";
		}
		if (timeLeft > 60) {
			return darkMode
				? "bg-gray-800/90 border-yellow-400/30"
				: "bg-white/90 border-yellow-600/30";
		}
		return darkMode
			? "bg-gray-800/90 border-red-400/30"
			: "bg-white/90 border-red-600/30";
	};

	// Calculate opacity based on scroll
	const fadeThreshold = 100;
	const fadeRange = 100;
	const opacity = Math.max(
		0,
		Math.min(1, (scrollY - fadeThreshold) / fadeRange),
	);

	// Calculate pie chart progress (0-1)
	const totalTime = 3600; // Assume 1 hour max, adjust if needed
	const progress = Math.min(1, timeLeft / totalTime);

	// Pie chart colors
	const getPieColor = () => {
		if (timeLeft > 300) return "#10b981"; // green-500
		if (timeLeft > 60) return "#eab308"; // yellow-500
		return "#ef4444"; // red-500
	};

	return (
		<>
			{/* Desktop: Text timer box */}
			<div
				className={`hidden md:flex fixed top-4 right-4 z-40 items-center justify-center px-4 py-2 rounded-lg border-2 backdrop-blur-sm shadow-lg transition-opacity duration-300 ${getBgColor()}`}
				style={{ opacity }}
			>
				<div className={`text-lg font-semibold ${getColor()}`}>
					{formatTime(timeLeft)}
				</div>
			</div>

			{/* Mobile: Pie chart timer */}
			<div
				className="md:hidden fixed top-14 right-4 z-40 transition-opacity duration-300"
				style={{ opacity }}
			>
				<svg
					width="40"
					height="40"
					viewBox="0 0 40 40"
					className="transform -rotate-90"
					aria-label={`Time remaining: ${formatTime(timeLeft)}`}
				>
					<title>Time remaining: {formatTime(timeLeft)}</title>
					{/* Background circle */}
					<circle
						cx="20"
						cy="20"
						r="16"
						fill="none"
						stroke={darkMode ? "#374151" : "#e5e7eb"}
						strokeWidth="6"
					/>
					{/* Progress circle */}
					<circle
						cx="20"
						cy="20"
						r="16"
						fill="none"
						stroke={getPieColor()}
						strokeWidth="6"
						strokeLinecap="round"
						strokeDasharray={`${2 * Math.PI * 16}`}
						strokeDashoffset={`${2 * Math.PI * 16 * (1 - progress)}`}
						className="transition-all duration-1000"
					/>
				</svg>
			</div>
		</>
	);
}
