"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { AssignmentDetailsStepProps } from "./assignmentTypes";

// Calculate default due date: 1 week from today at 11:59 PM
function getDefaultDueDate(): string {
	const oneWeekFromNow = new Date();
	oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
	oneWeekFromNow.setHours(23, 59, 0, 0);

	// Format as YYYY-MM-DDTHH:mm for datetime-local input
	const year = oneWeekFromNow.getFullYear();
	const month = String(oneWeekFromNow.getMonth() + 1).padStart(2, "0");
	const day = String(oneWeekFromNow.getDate()).padStart(2, "0");
	const hours = String(oneWeekFromNow.getHours()).padStart(2, "0");
	const minutes = String(oneWeekFromNow.getMinutes()).padStart(2, "0");

	return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function AssignmentDetailsStep({
	darkMode,
	onNext,
	onBack: _onBack,
	onError,
	details,
	onDetailsChange,
	availableEvents,
}: AssignmentDetailsStepProps) {
	const [dueDateEnabled, setDueDateEnabled] = useState(false);
	const prevDueDateEnabledRef = useRef(dueDateEnabled);

	// Set default due date when enabled, clear when disabled
	useEffect(() => {
		// Only run when dueDateEnabled actually changes
		if (prevDueDateEnabledRef.current === dueDateEnabled) {
			return;
		}

		prevDueDateEnabledRef.current = dueDateEnabled;

		if (dueDateEnabled) {
			// Only set default if no date is currently set
			if (!details.dueDate) {
				const defaultDate = getDefaultDueDate();
				onDetailsChange({ dueDate: defaultDate });
			}
		} else {
			// Clear date when disabled (only if it's currently set to avoid unnecessary updates)
			if (details.dueDate) {
				onDetailsChange({ dueDate: "" });
			}
		}
	}, [dueDateEnabled, details.dueDate, onDetailsChange]);

	const handleNext = () => {
		const error = validateDetails();
		if (error) {
			onError(error);
			return;
		}
		onNext();
	};

	const validateDetails = () => {
		if (!details.title.trim()) {
			return "Title is required to proceed";
		}
		if (!details.eventName.trim()) {
			return "Event selection is required to proceed";
		}
		return null;
	};

	return (
		<motion.div
			initial={{ opacity: 0, x: 20 }}
			animate={{ opacity: 1, x: 0 }}
			className="space-y-4"
		>
			<h3
				className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
			>
				Assignment Details
			</h3>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label
						htmlFor="assignment-title"
						className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
					>
						Title <span className="text-red-500">*</span>
					</label>
					<input
						id="assignment-title"
						type="text"
						value={details.title}
						onChange={(e) => onDetailsChange({ title: e.target.value })}
						className={`w-full px-3 py-2 border rounded-lg ${
							darkMode
								? "bg-gray-700 border-gray-600 text-white"
								: "bg-white border-gray-300 text-gray-900"
						}`}
						placeholder="Enter assignment title"
					/>
				</div>

				<div>
					<label
						htmlFor="event-selection"
						className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
					>
						Event <span className="text-red-500">*</span>
					</label>
					<select
						id="event-selection"
						value={details.eventName}
						onChange={(e) => onDetailsChange({ eventName: e.target.value })}
						className={`w-full px-3 py-2 border rounded-lg ${
							darkMode
								? "bg-gray-700 border-gray-600 text-white"
								: "bg-white border-gray-300 text-gray-900"
						}`}
					>
						<option value="">Select an event</option>
						{availableEvents.map((event) => (
							<option key={event} value={event}>
								{event}
							</option>
						))}
					</select>
				</div>

				<div>
					<label
						htmlFor="assignment-time-limit"
						className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
					>
						Time Limit (minutes)
					</label>
					<input
						id="assignment-time-limit"
						type="number"
						value={details.timeLimitMinutes || ""}
						onChange={(e) =>
							onDetailsChange({
								timeLimitMinutes: Number.parseInt(e.target.value, 10) || 0,
							})
						}
						className={`w-full px-3 py-2 border rounded-lg ${
							darkMode
								? "bg-gray-700 border-gray-600 text-white"
								: "bg-white border-gray-300 text-gray-900"
						}`}
						placeholder="Optional"
						min={0}
					/>
				</div>

				<div>
					<div className="flex items-center gap-2 mb-1">
						<label
							htmlFor="assignment-due-date"
							className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
						>
							Due Date
						</label>
						<button
							type="button"
							onClick={() => setDueDateEnabled(!dueDateEnabled)}
							className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
						>
							{dueDateEnabled ? "disable?" : "enable?"}
						</button>
					</div>
					<input
						id="assignment-due-date"
						type="datetime-local"
						value={details.dueDate}
						onChange={(e) => onDetailsChange({ dueDate: e.target.value })}
						disabled={!dueDateEnabled}
						className={`w-full px-3 py-2 border rounded-lg ${
							!dueDateEnabled
								? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
								: darkMode
									? "bg-gray-700 border-gray-600 text-white"
									: "bg-white border-gray-300 text-gray-900"
						}`}
					/>
				</div>
			</div>

			<div>
				<label
					htmlFor="assignment-description"
					className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
				>
					Description
				</label>
				<textarea
					id="assignment-description"
					value={details.description}
					onChange={(e) => onDetailsChange({ description: e.target.value })}
					className={`w-full px-3 py-2 border rounded-lg ${
						darkMode
							? "bg-gray-700 border-gray-600 text-white"
							: "bg-white border-gray-300 text-gray-900"
					}`}
					rows={3}
					placeholder="Enter assignment description"
				/>
			</div>

			<div className="flex justify-end">
				<button
					type="button"
					onClick={handleNext}
					className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
				>
					Next: Generate Questions
				</button>
			</div>
		</motion.div>
	);
}
