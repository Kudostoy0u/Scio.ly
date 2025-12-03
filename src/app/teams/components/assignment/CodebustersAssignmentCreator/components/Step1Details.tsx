"use client";
import type { AssignmentDetails } from "../../assignmentTypes";

interface Step1DetailsProps {
	details: AssignmentDetails;
	darkMode: boolean;
	onDetailsChange: (newDetails: Partial<AssignmentDetails>) => void;
	onNext: () => void;
}

export function Step1Details({
	details,
	darkMode,
	onDetailsChange,
	onNext,
}: Step1DetailsProps) {
	return (
		<div className="space-y-6">
			<h2
				className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
			>
				Assignment Details
			</h2>

			<div className="space-y-4">
				<div>
					<label
						htmlFor="assignment-title"
						className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
					>
						Title *
					</label>
					<input
						id="assignment-title"
						type="text"
						value={details.title}
						onChange={(e) => onDetailsChange({ title: e.target.value })}
						className={`mt-1 block w-full rounded-md border px-3 py-2 ${
							darkMode
								? "border-gray-600 bg-gray-700 text-white"
								: "border-gray-300 bg-white text-gray-900"
						}`}
						placeholder="Enter assignment title"
					/>
				</div>

				<div>
					<label
						htmlFor="assignment-description"
						className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
					>
						Description
					</label>
					<textarea
						id="assignment-description"
						value={details.description}
						onChange={(e) => onDetailsChange({ description: e.target.value })}
						rows={3}
						className={`mt-1 block w-full rounded-md border px-3 py-2 ${
							darkMode
								? "border-gray-600 bg-gray-700 text-white"
								: "border-gray-300 bg-white text-gray-900"
						}`}
						placeholder="Enter assignment description"
					/>
				</div>

				<div>
					<label
						htmlFor="assignment-due-date"
						className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
					>
						Due Date
					</label>
					<input
						id="assignment-due-date"
						type="datetime-local"
						value={details.dueDate}
						onChange={(e) => onDetailsChange({ dueDate: e.target.value })}
						className={`mt-1 block w-full rounded-md border px-3 py-2 ${
							darkMode
								? "border-gray-600 bg-gray-700 text-white"
								: "border-gray-300 bg-white text-gray-900"
						}`}
					/>
				</div>
			</div>

			<div className="flex justify-end">
				<button
					type="button"
					onClick={onNext}
					disabled={!details.title.trim()}
					className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
				>
					Next: Configure Settings
				</button>
			</div>
		</div>
	);
}
