"use client";

import Modal from "@/app/components/Modal";
import { useTheme } from "@/app/contexts/ThemeContext";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import { motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const STORAGE_KEY = "teams-feature-modal-viewed";

function getExpiryDate(): Date {
	const now = new Date();
	const year = now.getFullYear();
	return new Date(`${year}-12-24`); // December 24th (so it stops showing after Dec 23rd)
}

export default function TeamsFeatureModal() {
	const { darkMode } = useTheme();
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		// Check if modal should be shown
		const hasViewed = SyncLocalStorage.getItem(STORAGE_KEY) === "true";
		const now = new Date();
		const expiryDate = getExpiryDate();
		const isExpired = now >= expiryDate;

		if (!hasViewed && !isExpired) {
			setIsOpen(true);
		}
	}, []);

	const handleClose = () => {
		setIsOpen(false);
		SyncLocalStorage.setItem(STORAGE_KEY, "true");
	};

	const handleExplore = () => {
		handleClose();
		router.push("/teams");
	};

	const updates = [
		"Overhauled teams feature",
		"Updated analytics",
		"Frontpage tweaks",
		"Codebusters bug fixes",
		"And more",
	];

	return (
		<Modal
			isOpen={isOpen}
			onClose={handleClose}
			maxWidth="lg"
			showCloseButton={true}
		>
			<div className="relative">
				{/* Header */}
				<div className="text-center mb-6">
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{
							type: "spring",
							stiffness: 200,
							damping: 15,
						}}
						className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4"
					>
						<Sparkles className="w-8 h-8 text-white" />
					</motion.div>
					<motion.h2
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
						className={`text-2xl font-bold mb-2 ${
							darkMode ? "text-white" : "text-gray-900"
						}`}
					>
						What's New
					</motion.h2>
					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.2 }}
						className={`text-sm ${
							darkMode ? "text-gray-400" : "text-gray-500"
						}`}
					>
						December 20, 2025
					</motion.p>
				</div>

				{/* Changelog list */}
				<div className="space-y-3 mb-6">
					{updates.map((update, index) => (
						<motion.div
							key={update}
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.3 + index * 0.1 }}
							className="flex items-start gap-3"
						>
							<CheckCircle2
								className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
									darkMode ? "text-green-400" : "text-green-600"
								}`}
							/>
							<span
								className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}
							>
								{update}
							</span>
						</motion.div>
					))}
				</div>

				{/* CTA Button */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.8 }}
					className="flex justify-center"
				>
					<button
						type="button"
						onClick={handleExplore}
						className={`px-6 py-2 rounded-lg font-medium transition-colors ${
							darkMode
								? "bg-blue-600 text-white hover:bg-blue-700"
								: "bg-blue-600 text-white hover:bg-blue-700"
						}`}
					>
						Check it out
					</button>
				</motion.div>
			</div>
		</Modal>
	);
}
