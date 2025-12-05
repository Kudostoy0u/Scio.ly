"use client";

import { useTheme } from "@/app/contexts/ThemeContext";

export default function Hero() {
	const { darkMode } = useTheme();
	return (
		<div className="text-center mb-12">
			<h1
				className={`text-4xl font-bold mb-4 ${darkMode ? "text-gray-100" : "text-gray-900"}`}
			>
				🧪 Science Olympiad API Documentation
			</h1>
			<p
				className={`text-xl max-w-3xl mx-auto ${darkMode ? "text-gray-400" : "text-gray-600"}`}
			>
				Comprehensive REST API for Science Olympiad question management,
				AI-powered features, collaborative testing, and content moderation
			</p>
		</div>
	);
}
