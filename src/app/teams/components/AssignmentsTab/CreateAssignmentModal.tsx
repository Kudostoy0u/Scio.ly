"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { trpc } from "@/lib/trpc/client";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

interface CreateAssignmentModalProps {
	isOpen: boolean;
	onClose: () => void;
	teamSlug: string;
	activeSubteamId?: string | null;
}

export default function CreateAssignmentModal({
	isOpen,
	onClose,
	teamSlug,
	activeSubteamId,
}: CreateAssignmentModalProps) {
	const { darkMode } = useTheme();
	const utils = trpc.useUtils();
	const [formData, setFormData] = useState({
		title: "",
		description: "",
		assignmentType: "standard" as "task" | "quiz" | "exam" | "standard",
		dueDate: "",
		eventName: "",
		timeLimitMinutes: "",
		points: "",
		isRequired: false,
		maxAttempts: "1",
	});

	const createAssignmentMutation = trpc.teams.createAssignment.useMutation({
		onSuccess: async () => {
			toast.success("Assignment created successfully");
			await utils.teams.assignments.invalidate({ teamSlug });
			onClose();
			setFormData({
				title: "",
				description: "",
				assignmentType: "standard",
				dueDate: "",
				eventName: "",
				timeLimitMinutes: "",
				points: "",
				isRequired: false,
				maxAttempts: "1",
			});
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Failed to create assignment",
			);
		},
	});

	useEffect(() => {
		if (!isOpen) {
			setFormData({
				title: "",
				description: "",
				assignmentType: "standard",
				dueDate: "",
				eventName: "",
				timeLimitMinutes: "",
				points: "",
				isRequired: false,
				maxAttempts: "1",
			});
		}
	}, [isOpen]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.title.trim()) {
			toast.error("Please enter a title");
			return;
		}

		createAssignmentMutation.mutate({
			teamSlug,
			title: formData.title.trim(),
			description: formData.description.trim() || null,
			assignmentType:
				formData.assignmentType === "standard"
					? undefined
					: formData.assignmentType,
			dueDate: formData.dueDate || null,
			eventName: formData.eventName.trim() || null,
			timeLimitMinutes: formData.timeLimitMinutes
				? Number.parseInt(formData.timeLimitMinutes, 10)
				: null,
			points: formData.points ? Number.parseInt(formData.points, 10) : null,
			isRequired: formData.isRequired,
			maxAttempts: formData.maxAttempts
				? Number.parseInt(formData.maxAttempts, 10)
				: null,
			subteamId: activeSubteamId || null,
		});
	};

	if (!isOpen) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto"
			style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
		>
			<div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
				<div
					className="fixed inset-0 transition-opacity"
					onClick={onClose}
					aria-hidden="true"
				>
					<div className="absolute inset-0 bg-gray-500 opacity-75" />
				</div>

				<div className="inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
					<div className={`${darkMode ? "bg-gray-800" : "bg-white"} px-6 py-4`}>
						<div className="flex items-center justify-between mb-4">
							<h3
								className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
							>
								Create Assignment
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

						<form onSubmit={handleSubmit} className="space-y-4">
							<div>
								<label
									className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
								>
									Title <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formData.title}
									onChange={(e) =>
										setFormData({ ...formData, title: e.target.value })
									}
									required
									className={`w-full p-2 rounded-lg border ${
										darkMode
											? "bg-gray-700 border-gray-600 text-white"
											: "bg-white border-gray-300 text-gray-900"
									}`}
									placeholder="Assignment title"
								/>
							</div>

							<div>
								<label
									className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
								>
									Description
								</label>
								<textarea
									value={formData.description}
									onChange={(e) =>
										setFormData({ ...formData, description: e.target.value })
									}
									rows={3}
									className={`w-full p-2 rounded-lg border resize-none ${
										darkMode
											? "bg-gray-700 border-gray-600 text-white"
											: "bg-white border-gray-300 text-gray-900"
									}`}
									placeholder="Assignment description (optional)"
								/>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label
										className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
									>
										Type
									</label>
									<select
										value={formData.assignmentType}
										onChange={(e) =>
											setFormData({
												...formData,
												assignmentType: e.target.value as
													| "task"
													| "quiz"
													| "exam"
													| "standard",
											})
										}
										className={`w-full p-2 rounded-lg border ${
											darkMode
												? "bg-gray-700 border-gray-600 text-white"
												: "bg-white border-gray-300 text-gray-900"
										}`}
									>
										<option value="standard">Standard</option>
										<option value="task">Task</option>
										<option value="quiz">Quiz</option>
										<option value="exam">Exam</option>
									</select>
								</div>

								<div>
									<label
										className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
									>
										Event Name
									</label>
									<input
										type="text"
										value={formData.eventName}
										onChange={(e) =>
											setFormData({ ...formData, eventName: e.target.value })
										}
										className={`w-full p-2 rounded-lg border ${
											darkMode
												? "bg-gray-700 border-gray-600 text-white"
												: "bg-white border-gray-300 text-gray-900"
										}`}
										placeholder="e.g., Astronomy"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<label
										className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
									>
										Due Date
									</label>
									<input
										type="datetime-local"
										value={formData.dueDate}
										onChange={(e) =>
											setFormData({ ...formData, dueDate: e.target.value })
										}
										className={`w-full p-2 rounded-lg border ${
											darkMode
												? "bg-gray-700 border-gray-600 text-white"
												: "bg-white border-gray-300 text-gray-900"
										}`}
									/>
								</div>

								<div>
									<label
										className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
									>
										Time Limit (minutes)
									</label>
									<input
										type="number"
										value={formData.timeLimitMinutes}
										onChange={(e) =>
											setFormData({
												...formData,
												timeLimitMinutes: e.target.value,
											})
										}
										min="1"
										className={`w-full p-2 rounded-lg border ${
											darkMode
												? "bg-gray-700 border-gray-600 text-white"
												: "bg-white border-gray-300 text-gray-900"
										}`}
										placeholder="Optional"
									/>
								</div>

								<div>
									<label
										className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
									>
										Points
									</label>
									<input
										type="number"
										value={formData.points}
										onChange={(e) =>
											setFormData({ ...formData, points: e.target.value })
										}
										min="0"
										className={`w-full p-2 rounded-lg border ${
											darkMode
												? "bg-gray-700 border-gray-600 text-white"
												: "bg-white border-gray-300 text-gray-900"
										}`}
										placeholder="Optional"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label
										className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
									>
										Max Attempts
									</label>
									<input
										type="number"
										value={formData.maxAttempts}
										onChange={(e) =>
											setFormData({ ...formData, maxAttempts: e.target.value })
										}
										min="1"
										className={`w-full p-2 rounded-lg border ${
											darkMode
												? "bg-gray-700 border-gray-600 text-white"
												: "bg-white border-gray-300 text-gray-900"
										}`}
									/>
								</div>

								<div className="flex items-center pt-6">
									<label className="flex items-center space-x-2 cursor-pointer">
										<input
											type="checkbox"
											checked={formData.isRequired}
											onChange={(e) =>
												setFormData({
													...formData,
													isRequired: e.target.checked,
												})
											}
											className="w-4 h-4 rounded border-gray-300"
										/>
										<span
											className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}
										>
											Required
										</span>
									</label>
								</div>
							</div>

							<div className="flex justify-end space-x-3 pt-4">
								<button
									type="button"
									onClick={onClose}
									className={`px-4 py-2 rounded-lg transition-colors ${
										darkMode
											? "bg-gray-700 hover:bg-gray-600 text-white"
											: "bg-gray-200 hover:bg-gray-300 text-gray-900"
									}`}
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={createAssignmentMutation.isPending}
									className={`px-4 py-2 rounded-lg transition-colors ${
										darkMode
											? "bg-blue-600 hover:bg-blue-700 text-white"
											: "bg-blue-600 hover:bg-blue-700 text-white"
									} disabled:opacity-50 disabled:cursor-not-allowed`}
								>
									{createAssignmentMutation.isPending
										? "Creating..."
										: "Create Assignment"}
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
}
