"use client";
import { useEffect, useRef, useState } from "react";

interface ProgressBarProps {
	answeredCount: number;
	totalCount: number;
	isSubmitted: boolean;
	darkMode?: boolean;
}

export default function ProgressBar({
	answeredCount,
	totalCount,
	isSubmitted,
	darkMode = false,
}: ProgressBarProps) {
	const progressBarRef = useRef<HTMLDivElement>(null);
	const spacerRef = useRef<HTMLDivElement>(null);
	const [isFixed, setIsFixed] = useState(false);
	const [width, setWidth] = useState<number | null>(null);
	const initialTopRef = useRef<number | null>(null);

	useEffect(() => {
		if (isSubmitted || !progressBarRef.current) return;

		const element = progressBarRef.current;

		// Store the initial position and width
		const updateInitialPosition = () => {
			if (!element) return;
			const rect = element.getBoundingClientRect();
			const scrollY = window.scrollY;

			// Only update initial position if element is in normal flow (not fixed)
			if (!isFixed) {
				initialTopRef.current = rect.top + scrollY;
				setWidth(rect.width);
			}
		};

		// Initial measurement
		updateInitialPosition();
		window.addEventListener("resize", updateInitialPosition);

		const handleScroll = () => {
			if (!initialTopRef.current) {
				updateInitialPosition();
				return;
			}

			const scrollY = window.scrollY;
			const threshold = initialTopRef.current - 16; // 16px for top-4 offset

			if (scrollY >= threshold) {
				if (!isFixed) {
					// Capture width right before switching to fixed
					const rect = element.getBoundingClientRect();
					setWidth(rect.width);
					setIsFixed(true);
				}
			} else {
				if (isFixed) {
					setIsFixed(false);
					setWidth(null);
				}
			}
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		handleScroll(); // Check initial state

		return () => {
			window.removeEventListener("scroll", handleScroll);
			window.removeEventListener("resize", updateInitialPosition);
		};
	}, [isSubmitted, isFixed]);

	return (
		<>
			{/* Spacer to maintain layout when fixed */}
			{isFixed && (
				<div
					ref={spacerRef}
					className="h-5 mb-6"
					style={width ? { width: `${width}px` } : undefined}
				/>
			)}
			<div
				ref={progressBarRef}
				className={`z-10 w-full max-w-3xl ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} border-2 rounded-full h-5 mb-6 shadow-lg ${
					isSubmitted
						? ""
						: isFixed
							? "fixed top-4 left-1/2 -translate-x-1/2"
							: "sticky top-4"
				}`}
				style={isFixed && width ? { width: `${width}px` } : undefined}
			>
				<div
					className="bg-blue-500 h-4 rounded-full transition-[width] duration-700 ease-in-out shadow-md"
					style={{ width: `${(answeredCount / totalCount) * 100}%` }}
				/>
			</div>
		</>
	);
}
