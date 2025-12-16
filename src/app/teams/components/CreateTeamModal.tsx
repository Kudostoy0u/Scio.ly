"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { motion } from "framer-motion";
import { School, Trophy, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

/**
 * Props interface for CreateTeamModal component
 */
interface CreateTeamModalProps {
	/** Whether the modal is currently open */
	isOpen: boolean;
	/** Callback function to close the modal */
	onClose: () => void;
	/** Callback function to create a new team */
	onCreateTeam: (teamData: CreateTeamData) => void;
}

/**
 * Team creation data interface
 */
interface CreateTeamData {
	/** School name for the team */
	school: string;
	/** Division level (B or C) */
	division: "B" | "C";
}

/**
 * CreateTeamModal Component
 *
 * Modal component for creating new Science Olympiad teams
 * Provides a form interface for team creation with school and division selection
 *
 * @param {CreateTeamModalProps} props - Component props
 * @returns {JSX.Element | null} Team creation modal or null if not open
 * @example
 * ```tsx
 * <CreateTeamModal
 *   isOpen={showCreateModal}
 *   onClose={() => setShowCreateModal(false)}
 *   onCreateTeam={handleCreateTeam}
 * />
 * ```
 */
export default function CreateTeamModal({
	isOpen,
	onClose,
	onCreateTeam,
}: CreateTeamModalProps) {
	const { darkMode } = useTheme();
	const [formData, setFormData] = useState<CreateTeamData>({
		school: "",
		division: "C",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Reset form when modal is closed
	useEffect(() => {
		if (!isOpen) {
			setFormData({ school: "", division: "C" });
			setIsSubmitting(false);
		}
	}, [isOpen]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			await onCreateTeam(formData);
			onClose();
			setFormData({ school: "", division: "C" });
		} catch (_error) {
			// Ignore errors
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			<div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
				{/* Backdrop */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 transition-opacity z-40"
					style={{
						backgroundColor: darkMode
							? "rgba(0, 0, 0, 0.75)"
							: "rgba(0, 0, 0, 0.5)",
					}}
					onClick={onClose}
				/>

				{/* Modal */}
				<motion.div
					initial={{ opacity: 0, scale: 0.95, y: 20 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.95, y: 20 }}
					className={`relative z-50 inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
						darkMode ? "bg-gray-800" : "bg-white"
					}`}
				>
					<div
						className={`px-6 py-4 border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}
					>
						<div className="flex items-center justify-between">
							<h3
								className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
							>
								Create a new team
							</h3>
							<button
								type="button"
								onClick={onClose}
								className={`p-2 rounded-full transition-colors ${
									darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
								}`}
								aria-label="Close"
							>
								<X
									className={`w-5 h-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
								/>
							</button>
						</div>
					</div>

					<form onSubmit={handleSubmit} className="px-6 py-4">
						<div className="space-y-4">
							{/* School */}
							<div>
								<label
									htmlFor="school"
									className={`block text-sm font-medium mb-2 ${
										darkMode ? "text-gray-300" : "text-gray-700"
									}`}
								>
									School *
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<School
											className={`h-5 w-5 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
										/>
									</div>
									<input
										id="school"
										type="text"
										required={true}
										value={formData.school}
										onChange={(e) =>
											setFormData({ ...formData, school: e.target.value })
										}
										className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
											darkMode
												? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
												: "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
										}`}
										placeholder="Enter school name"
									/>
								</div>
							</div>

							{/* Division */}
							<div>
								<label
									htmlFor="division"
									className={`block text-sm font-medium mb-2 ${
										darkMode ? "text-gray-300" : "text-gray-700"
									}`}
								>
									Division *
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<Trophy
											className={`h-5 w-5 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
										/>
									</div>
									<select
										id="division"
										required={true}
										value={formData.division}
										onChange={(e) =>
											setFormData({
												...formData,
												division: e.target.value as "B" | "C",
											})
										}
										className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
											darkMode
												? "bg-gray-700 border-gray-600 text-white"
												: "bg-white border-gray-300 text-gray-900"
										}`}
									>
										<option value="C">Division C (High School)</option>
										<option value="B">Division B (Middle School)</option>
									</select>
								</div>
							</div>
						</div>

						{/* Actions */}
						<div className="flex justify-end space-x-3 mt-6">
							<button
								type="button"
								onClick={onClose}
								className={`px-4 py-2 border rounded-md font-medium transition-colors ${
									darkMode
										? "border-gray-600 text-gray-300 hover:bg-gray-700"
										: "border-gray-300 text-gray-700 hover:bg-gray-50"
								}`}
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isSubmitting}
								className="px-4 py-2 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{isSubmitting ? "Creating..." : "Create Team"}
							</button>
						</div>
					</form>
				</motion.div>
			</div>
		</div>
	);
}
