"use client";

import { useTheme } from "@/app/contexts/themeContext";
import { AnimatePresence, motion } from "framer-motion";
import { Send, User, X } from "lucide-react";
import type React from "react";
import { useState } from "react";

interface LinkInviteProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (username: string) => Promise<void>;
	studentName: string;
}

export default function LinkInvite({
	isOpen,
	onClose,
	onSubmit,
	studentName,
}: LinkInviteProps) {
	const { darkMode } = useTheme();
	const [username, setUsername] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!username.trim()) {
			return;
		}

		try {
			setSubmitting(true);
			await onSubmit(username.trim());
			setUsername("");
			onClose();
		} catch (_error) {
			// Errors handled by parent
		} finally {
			setSubmitting(false);
		}
	};

	const handleClose = () => {
		setUsername("");
		onClose();
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: "auto" }}
					exit={{ opacity: 0, height: 0 }}
					transition={{ duration: 0.2 }}
					className="overflow-hidden"
				>
					<div
						className={`p-4 rounded-lg border ${
							darkMode
								? "bg-gray-800 border-gray-700"
								: "bg-white border-gray-200 shadow-sm"
						}`}
					>
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center space-x-2">
								<User
									className={`w-5 h-5 ${darkMode ? "text-blue-400" : "text-blue-600"}`}
								/>
								<span
									className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
								>
									Link {studentName} to account
								</span>
							</div>
							<button
								type="button"
								onClick={handleClose}
								className={`p-1 rounded transition-colors ${
									darkMode
										? "hover:bg-gray-700 text-gray-400 hover:text-white"
										: "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
								}`}
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						<form onSubmit={handleSubmit} className="space-y-3">
							<div>
								<label
									htmlFor="username"
									className={`block text-xs font-medium mb-1 ${
										darkMode ? "text-gray-400" : "text-gray-600"
									}`}
								>
									Username or Email
								</label>
								<input
									id="username"
									type="text"
									placeholder="Enter username..."
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									autoFocus
									className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
										darkMode
											? "bg-gray-700 text-white border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
											: "bg-white text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
									} outline-none`}
								/>
							</div>

							<div className="flex items-center space-x-2">
								<button
									type="submit"
									disabled={!username.trim() || submitting}
									className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
										username.trim() && !submitting
											? "bg-blue-600 text-white hover:bg-blue-700"
											: "bg-gray-400 text-gray-200 cursor-not-allowed"
									}`}
								>
									{submitting ? (
										<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
									) : (
										<>
											<Send className="w-4 h-4" />
											<span>Send Link Invite</span>
										</>
									)}
								</button>
								<button
									type="button"
									onClick={handleClose}
									className={`px-4 py-2 rounded-lg font-medium transition-colors ${
										darkMode
											? "bg-gray-700 text-gray-300 hover:bg-gray-600"
											: "bg-gray-200 text-gray-700 hover:bg-gray-300"
									}`}
								>
									Cancel
								</button>
							</div>
						</form>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
