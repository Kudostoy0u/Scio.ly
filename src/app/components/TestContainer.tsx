"use client";
import type React from "react";

interface TestContainerProps {
	children: React.ReactNode;
	darkMode: boolean;
	maxWidth?: "3xl" | "6xl";
	className?: string;
}

/**
 * Reusable test container component that ensures full width on mobile
 * and proper centering/width on desktop. Used by both /test and /codebusters pages.
 */
export default function TestContainer({
	children,
	darkMode,
	maxWidth = "3xl",
	className = "",
}: TestContainerProps) {
	const maxWidthClass = maxWidth === "6xl" ? "md:max-w-6xl" : "md:max-w-3xl";

	return (
		<main
			className={`w-screen md:w-full ${maxWidthClass} rounded-none md:rounded-lg shadow-md px-3 md:p-6 pt-4 pb-4 md:pt-4 mt-4 relative left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:mx-auto ${
				darkMode ? "bg-gray-800" : "bg-white"
			} ${className}`}
		>
			{children}
		</main>
	);
}
