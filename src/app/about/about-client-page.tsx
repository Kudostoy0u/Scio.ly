"use client";

import Header from "@/app/components/Header";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useEffect, useState } from "react";
import { AboutSection } from "./components/AboutSection";
import { ContactSection } from "./components/ContactSection";
import { MethodologySection } from "./components/MethodologySection";
import { PhilosophySection } from "./components/PhilosophySection";
import { StorySection } from "./components/StorySection";

export default function AboutClientPage() {
	const { darkMode } = useTheme();
	const [mounted] = useState(() => {
		if (typeof window !== "undefined") {
			return true;
		}
		return false;
	});

	useEffect(() => {
		document.documentElement.classList.toggle("dark-scrollbar", darkMode);
		document.documentElement.classList.toggle("light-scrollbar", !darkMode);
	}, [darkMode]);

	if (!mounted) {
		return null;
	}

	return (
		<div className="relative min-h-screen overflow-x-hidden">
			<div
				className={`fixed inset-0 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}
			/>
			<Header />
			<main className="relative z-10 pt-36 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
				<div className="text-center mb-16">
					<h1
						className={`text-4xl sm:text-5xl font-bold mb-6 ${darkMode ? "text-white" : "text-black"}`}
					>
						About <span className="text-blue-500">Scio.ly</span>
					</h1>
					<p
						className={`text-xl max-w-3xl mx-auto ${darkMode ? "text-gray-300" : "text-gray-700"}`}
					>
						We&apos;re on a mission to make Science Olympiad practice
						accessible, engaging, and effective for students everywhere.
					</p>
				</div>

				<AboutSection darkMode={darkMode}>
					<StorySection darkMode={darkMode} />
				</AboutSection>

				<AboutSection darkMode={darkMode}>
					<MethodologySection darkMode={darkMode} />
				</AboutSection>

				<AboutSection darkMode={darkMode}>
					<PhilosophySection darkMode={darkMode} />
				</AboutSection>

				<AboutSection darkMode={darkMode} className="text-center">
					<ContactSection darkMode={darkMode} />
				</AboutSection>
			</main>
		</div>
	);
}
