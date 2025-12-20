"use client";
import type React from "react";

interface TestLayoutProps {
	children: React.ReactNode;
	darkMode: boolean;
}

export default function TestLayout({ children, darkMode }: TestLayoutProps) {
	return (
		<div className="relative min-h-screen max-w-full overflow-x-hidden">
			{/* Background */}
			<div
				className={`absolute inset-0 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}
			/>

			{/* Global scrollbar theme is centralized in globals.css */}

			{/* Page Content */}
			<div className="relative flex flex-col items-center px-3 md:px-6 w-full">
				{children}
			</div>
		</div>
	);
}
