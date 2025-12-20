"use client";

import { formatTime } from "@/app/utils/questionUtils";
import { getCurrentTestSession } from "@/app/utils/timeManagement";
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

	// Get total test time from session
	const session = getCurrentTestSession();
	const totalTime = session ? session.timeLimit * 60 : 3600; // Convert minutes to seconds, fallback to 1 hour
	const progress =
		totalTime > 0 ? Math.max(0, Math.min(1, timeLeft / totalTime)) : 0;

	// Gradient color function: green (100%) -> yellow (50%) -> red (0%)
	const getGradientColor = (percentage: number): string => {
		// Clamp percentage between 0 and 1
		const p = Math.max(0, Math.min(1, percentage));

		// Define color stops
		// Green at 100% (1.0): RGB(34, 197, 94) - green-500
		// Yellow at 50% (0.5): RGB(234, 179, 8) - yellow-500
		// Red at 0% (0.0): RGB(239, 68, 68) - red-500

		let r: number;
		let g: number;
		let b: number;

		if (p >= 0.5) {
			// Interpolate between yellow (at p=0.5) and green (at p=1.0)
			// t goes from 0 (at p=0.5) to 1 (at p=1.0)
			const t = (p - 0.5) * 2;
			// Interpolate: yellow * (1-t) + green * t
			r = Math.round(234 * (1 - t) + 34 * t);
			g = Math.round(179 * (1 - t) + 197 * t);
			b = Math.round(8 * (1 - t) + 94 * t);
		} else {
			// Interpolate between red (at p=0.0) and yellow (at p=0.5)
			// t goes from 0 (at p=0.0) to 1 (at p=0.5)
			const t = p * 2;
			// Interpolate: red * (1-t) + yellow * t
			r = Math.round(239 * (1 - t) + 234 * t);
			g = Math.round(68 * (1 - t) + 179 * t);
			b = Math.round(68 * (1 - t) + 8 * t);
		}

		return `rgb(${r}, ${g}, ${b})`;
	};

	const pieColor = getGradientColor(progress);

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
				className="md:hidden fixed top-12 right-4 z-40 transition-opacity duration-300"
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
						stroke={pieColor}
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
