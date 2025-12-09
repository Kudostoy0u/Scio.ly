"use client";
import logger from "@/lib/utils/logging/logger";

import { handleShareCodeRedirect } from "@/app/utils/shareCodeUtils";
import { motion } from "framer-motion";
import { ArrowRight, ChartPie, GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import {
	FaBook,
	FaBookmark,
	FaDiscord,
	FaFileAlt,
	FaUsers,
} from "react-icons/fa";
import { toast } from "react-toastify";

interface ActionButtonsProps {
	darkMode: boolean;
}

export default function ActionButtons({ darkMode }: ActionButtonsProps) {
	const router = useRouter();
	const [testCodeDigits, setTestCodeDigits] = useState([
		"",
		"",
		"",
		"",
		"",
		"",
	]);

	const cardStyle = darkMode
		? "bg-gray-800 border border-gray-700 text-white relative overflow-hidden group"
		: "bg-white border border-gray-200 text-gray-900 relative overflow-hidden group";

	const handleLoadTest = async (code: string) => {
		try {
			await handleShareCodeRedirect(code);
		} catch (error) {
			logger.error("Error loading test:", error);
			toast.error("An error occurred while loading the test.");
		}
	};

	const handlePaste = (
		e: React.ClipboardEvent<HTMLInputElement>,
		index: number,
	) => {
		e.preventDefault();
		const pastedData = e.clipboardData.getData("text");

		const chars = pastedData
			.replace(/[^a-zA-Z0-9]/g, "")
			.toUpperCase()
			.split("")
			.slice(0, 6);

		const newDigits = [...testCodeDigits];
		for (const [i, digit] of chars.entries()) {
			if (index + i < 6) {
				newDigits[index + i] = digit;
			}
		}

		setTestCodeDigits(newDigits);

		if (newDigits.every((d) => d !== "") && newDigits.join("").length === 6) {
			handleLoadTest(newDigits.join(""));
		}
	};

	const handleDigitChange = (
		e: React.ChangeEvent<HTMLInputElement>,
		index: number,
	) => {
		const sanitized = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
		const value = sanitized.slice(0, 1);

		const newDigits = [...testCodeDigits];
		newDigits[index] = value;
		setTestCodeDigits(newDigits);

		if (value && index < 5) {
			const nextInput = document.getElementById(
				`digit-${index + 1}`,
			) as HTMLInputElement;
			if (nextInput) {
				nextInput.focus();
			}
		}

		if (newDigits.every((d) => d !== "") && newDigits.join("").length === 6) {
			handleLoadTest(newDigits.join(""));
		}
	};

	const handleKeyDown = (
		e: React.KeyboardEvent<HTMLInputElement>,
		index: number,
	) => {
		if (e.key === "Backspace" && !testCodeDigits[index] && index > 0) {
			const prevInput = document.getElementById(
				`digit-${index - 1}`,
			) as HTMLInputElement;
			if (prevInput) {
				prevInput.focus();
			}
		}
	};

	// Helper function to render action card
	const renderActionCard = (
		onClick: () => void,
		icon: React.ReactNode,
		title: string,
		description: string,
		arrowColor: string,
		hoverTranslate = "translate-x-2",
		showArrow = true,
	) => (
		<motion.div
			onClick={onClick}
			className={`rounded-lg cursor-pointer ${cardStyle}`}
		>
			<div
				className={`w-full h-full p-6 flex items-center gap-4 ${darkMode ? "text-white" : "text-black"} transition-transform duration-300 group-hover:${hoverTranslate}`}
			>
				<div
					className={`p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}
				>
					{icon}
				</div>
				<div className="flex-1">
					<h3 className="text-xl font-bold mb-1">{title}</h3>
					<p
						className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
					>
						{description}
					</p>
				</div>
			</div>
			{showArrow && (
				<div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-full group-hover:translate-x-2 transition-transform duration-300">
					<ArrowRight className={`w-5 h-5 ${arrowColor}`} />
				</div>
			)}
		</motion.div>
	);

	// Helper function to render load test section
	const renderLoadTestSection = () => (
		<div className={`rounded-lg cursor-pointer ${cardStyle}`}>
			<div
				className={`w-full h-full p-4 flex items-center gap-4 ${darkMode ? "text-white" : "text-black"}`}
			>
				<div
					className={`p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}
				>
					<svg
						className="w-6 h-6 text-blue-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-label="Lock icon"
					>
						<title>Lock icon</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
						/>
					</svg>
				</div>
				<div className="flex-1 min-w-0">
					<h3 className="text-md lg:text-xl font-bold mb-1">
						Load Test with Code
					</h3>
					<p className="hidden lg:block text-sm text-gray-500 dark:text-gray-400">
						Take a test with a friend
					</p>
				</div>
				<div
					className="grid grid-cols-3 gap-2 lg:flex lg:space-x-2 lg:grid-cols-none"
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(3, 1fr)",
						gap: "0.5rem",
					}}
				>
					{testCodeDigits.map((digit, index) => (
						<input
							key={`digit-input-${index}-${digit}`}
							id={`digit-${index}`}
							type="text"
							maxLength={1}
							value={digit}
							onChange={(e) => handleDigitChange(e, index)}
							onPaste={(e) => handlePaste(e, index)}
							onKeyDown={(e) => handleKeyDown(e, index)}
							className={`w-10 h-10 text-center text-sm font-bold border-2 rounded-lg uppercase ${
								darkMode
									? "bg-gray-700 border-gray-600 text-white focus:border-blue-500"
									: "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"
							} focus:outline-none focus:placeholder-transparent`}
							placeholder="•"
						/>
					))}
				</div>
			</div>
		</div>
	);

	return (
		<>
			{/* Row 1: Load Test with Code and Bookmarks */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
				{renderLoadTestSection()}
				{renderActionCard(
					() => router.push("/bookmarks"),
					<FaBookmark className="text-2xl text-green-500" />,
					"Bookmarks",
					"View and practice over your bookmarked questions",
					"text-green-500",
					"translate-x-4",
					false,
				)}
			</div>

			{/* Row 2: Teams and SciConnect */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
				{renderActionCard(
					() => router.push("/teams"),
					<FaUsers className="text-2xl text-blue-500" />,
					"Teams",
					"Organize, collaborate, and test-take with your team",
					"text-blue-500",
				)}
				{renderActionCard(
					() => window.open("https://www.sciconnect.org/", "_blank"),
					<GraduationCap className="w-6 h-6 text-purple-500" />,
					"SciConnect",
					"Introductory Science Olympiad courses",
					"text-purple-500",
				)}
			</div>

			{/* Row 3: Analytics and Recent Reports */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
				{renderActionCard(
					() => router.push("/analytics"),
					<ChartPie className="w-6 h-6 text-blue-500" />,
					"Analytics",
					"Elo, charts, and comparisons across teams",
					"text-blue-500",
				)}
				{renderActionCard(
					() => router.push("/reports"),
					<FaFileAlt className="text-2xl text-blue-500" />,
					"Recent Reports",
					"Check out how the community has been fixing up the question base",
					"text-blue-500",
				)}
			</div>

			{/* Row 4: Discord Bot and Scio.ly Docs */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
				{renderActionCard(
					() =>
						window.open(
							"https://discord.com/oauth2/authorize?client_id=1400979720614711327&permissions=8&integration_type=0&scope=bot+applications.commands",
							"_blank",
						),
					<FaDiscord className="text-2xl text-purple-500" />,
					"Add Discord Bot",
					"Add Scio.ly bot to your Discord server for quick access",
					"text-purple-500",
				)}
				{renderActionCard(
					() => router.push("/docs"),
					<FaBook className="text-2xl text-orange-500" />,
					"Scio.ly Docs",
					"Science Olympiad event documentation and resources",
					"text-orange-500",
				)}
			</div>
		</>
	);
}
