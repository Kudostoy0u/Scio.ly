"use client";

import Header from "@/app/components/Header";
import { useTheme } from "@/app/contexts/ThemeContext";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ForbiddenPage() {
	const { darkMode } = useTheme();
	const [mounted] = useState(() => {
		if (typeof window !== "undefined") {
			return true;
		}
		return false;
	});
	const searchParams = useSearchParams();
	const teamName = searchParams.get("team");
	const isTeamAccess = !!teamName;

	useEffect(() => {
		document.documentElement.classList.toggle("dark-scrollbar", darkMode);
		document.documentElement.classList.toggle("light-scrollbar", !darkMode);
	}, [darkMode]);

	if (!mounted) {
		return null;
	}

	return (
		<div className="relative min-h-screen overflow-x-hidden">
			{/* Background */}
			<div
				className={`fixed inset-0 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}
			/>

			<Header />

			{/* Main Content */}
			<main className="relative z-10 pt-20 px-4 sm:px-6 lg:px-8 w-full">
				<div
					className={`p-8 rounded-xl max-w-3xl mx-auto ${
						darkMode
							? "bg-gray-800/50 backdrop-blur-sm"
							: "bg-white/90 shadow-lg backdrop-blur-sm"
					}`}
				>
					{/* Logo and 403 Content */}
					<div className="text-center mb-8">
						{/* Site Logo */}
						<div className="flex justify-center mb-6">
							<Image
								src="https://res.cloudinary.com/djilwi4nh/image/upload/v1760504427/site-logo_lzc8t0.png"
								alt="Scio.ly Logo"
								width={120}
								height={120}
								className="rounded-lg"
							/>
						</div>

						{/* 403 Number */}
						<h1
							className={`text-8xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}
						>
							403
						</h1>

						{/* Access Denied Message */}
						<div className="mb-6">
							<h2
								className={`text-2xl font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
							>
								{isTeamAccess
									? "You aren't signed into the right account to access this team"
									: "Access Denied"}
							</h2>
							<p
								className={`text-lg ${darkMode ? "text-gray-300" : "text-gray-600"}`}
							>
								{isTeamAccess
									? `You don't have permission to view ${teamName || "this team"}.`
									: "You don't have permission to access this resource."}
							</p>
						</div>

						{/* Cat ASCII Art - Hylas looking disappointed */}
						<div
							className={`font-mono text-sm mb-6 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
						>
							<pre className="whitespace-pre">
								{`  /\\_/\\
 ( -.- )
  > ^ <
  /   \\
 /     \\
|   x   |
 \\_____/`}
							</pre>
						</div>

						{/* Navigation Buttons */}
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							{isTeamAccess ? (
								<>
									<Link
										href="/teams"
										className={`px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors ${
											darkMode ? "hover:bg-blue-500" : "hover:bg-blue-700"
										}`}
									>
										View My Teams
									</Link>
									<Link
										href="/"
										className={`px-6 py-3 ${
											darkMode
												? "bg-gray-700 hover:bg-gray-600 text-white"
												: "bg-gray-200 hover:bg-gray-300 text-gray-900"
										} font-semibold rounded-lg transition-colors`}
									>
										Go Home
									</Link>
								</>
							) : (
								<>
									<Link
										href="/"
										className={`px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors ${
											darkMode ? "hover:bg-blue-500" : "hover:bg-blue-700"
										}`}
									>
										Go Home
									</Link>
									<Link
										href="/practice"
										className={`px-6 py-3 ${
											darkMode
												? "bg-gray-700 hover:bg-gray-600 text-white"
												: "bg-gray-200 hover:bg-gray-300 text-gray-900"
										} font-semibold rounded-lg transition-colors`}
									>
										Lock in
									</Link>
								</>
							)}
						</div>

						{/* Helpful Message */}
						<div
							className={`mt-8 p-4 rounded-lg ${darkMode ? "bg-gray-700/50" : "bg-gray-100"}`}
						>
							<p
								className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
							>
								💡 <strong>Tip:</strong>{" "}
								{isTeamAccess
									? "If you think you should have access, make sure you're signed in with the correct account, or ask a team captain to add you to the team."
									: "If you believe this is a mistake, please contact support or try signing in with a different account."}
							</p>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
