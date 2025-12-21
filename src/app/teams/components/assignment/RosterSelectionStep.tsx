"use client";

import { motion } from "framer-motion";
import type { RosterMember, RosterSelectionStepProps } from "./assignmentTypes";

export default function RosterSelectionStep({
	darkMode,
	onNext: _onNext,
	onBack,
	onError,
	rosterMembers,
	selectedRoster,
	onRosterChange,
	loadingRoster,
	onCreateAssignment,
	creating,
}: RosterSelectionStepProps) {
	const toggleRosterMember = (memberName: string) => {
		if (selectedRoster.includes(memberName)) {
			onRosterChange(selectedRoster.filter((name) => name !== memberName));
		} else {
			onRosterChange([...selectedRoster, memberName]);
		}
	};

	// Helper functions to reduce cognitive complexity
	const getMemberCardClasses = (member: RosterMember) => {
		if (selectedRoster.includes(member.student_name)) {
			return darkMode
				? "bg-blue-900/20 border-blue-400 cursor-pointer"
				: "bg-blue-100 border-blue-300 cursor-pointer";
		}

		return darkMode
			? "bg-gray-700 border-gray-600 hover:bg-gray-600 cursor-pointer"
			: "bg-white border-gray-200 hover:bg-gray-50 cursor-pointer";
	};

	const getMemberTextColor = (_member: RosterMember) => {
		return darkMode ? "text-white" : "text-gray-900";
	};

	const renderMemberInfo = (member: RosterMember) => {
		const subteamLabel = member.subteam_name || "No subteam";
		if (member.username && member.username !== "unknown") {
			return (
				<div
					className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
				>
					@{member.username}
					<span
						className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
							darkMode
								? "bg-gray-700 text-gray-200"
								: "bg-gray-200 text-gray-700"
						}`}
					>
						{subteamLabel}
					</span>
				</div>
			);
		}

		if (!member.username && member.userEmail) {
			return (
				<div
					className={`text-xs mt-1 ${
						darkMode ? "text-gray-400" : "text-gray-500"
					}`}
				>
					{member.userEmail}
					<span
						className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
							darkMode
								? "bg-gray-700 text-gray-200"
								: "bg-gray-200 text-gray-700"
						}`}
					>
						{subteamLabel}
					</span>
				</div>
			);
		}

		return (
			<div
				className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
			>
				<span
					className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
						darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-700"
					}`}
				>
					{subteamLabel}
				</span>
			</div>
		);
	};

	const handleCreateAssignment = async () => {
		if (selectedRoster.length === 0) {
			onError("Please select at least one roster member");
			return;
		}
		try {
			await onCreateAssignment();
		} catch {
			onError("Failed to create assignment. Please try again.");
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, x: 20 }}
			animate={{ opacity: 1, x: 0 }}
			className="space-y-4"
			data-testid="roster-selection-step"
		>
			<h3
				className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
			>
				Select Roster Members
			</h3>

			{loadingRoster ? (
				<div className="text-center py-4">Loading roster...</div>
			) : rosterMembers.length === 0 ? (
				<div className="text-center py-8">
					<div
						className={`text-lg font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}
					>
						No roster members found
					</div>
					<div
						className={`text-sm mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
					>
						Make sure team members are properly linked to their accounts.
					</div>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
					{rosterMembers.map((member, index) => (
						<button
							key={
								member.user_id
									? `user_${member.user_id}`
									: member.roster_entry_id
										? `roster_${member.roster_entry_id}`
										: `unlinked_${member.student_name}_${index}`
							}
							type="button"
							className={`p-3 border rounded-lg transition-colors text-left w-full ${getMemberCardClasses(
								member,
							)}`}
							onClick={() => toggleRosterMember(member.student_name)}
							aria-label={`Toggle selection for ${member.student_name}`}
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center space-x-2">
									<input
										type="checkbox"
										checked={selectedRoster.includes(member.student_name)}
										onChange={() => toggleRosterMember(member.student_name)}
										className="mr-2"
									/>
									<span className={`font-medium ${getMemberTextColor(member)}`}>
										{member.student_name}
									</span>
								</div>
							</div>
							{renderMemberInfo(member)}
						</button>
					))}
				</div>
			)}

			<div className="flex justify-between">
				<button
					type="button"
					onClick={onBack}
					className={`px-4 py-2 border rounded-lg ${
						darkMode
							? "border-gray-600 text-gray-300 hover:bg-gray-800"
							: "border-gray-300 text-gray-700 hover:bg-gray-50"
					}`}
				>
					Back
				</button>
				<button
					type="button"
					onClick={handleCreateAssignment}
					disabled={creating || selectedRoster.length === 0}
					className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
				>
					{creating ? "Creating..." : "Create Assignment"}
				</button>
			</div>
		</motion.div>
	);
}
