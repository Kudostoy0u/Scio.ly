import { useAuth } from "@/app/contexts/AuthContext";
import { trpc } from "@/lib/trpc/client";
import {
	AlertTriangle,
	BarChart3,
	Calendar,
	Clock,
	Hash,
	Trash2,
} from "lucide-react";
import {
	AssignmentStatusBadge,
	getAssignmentStatus,
	getStatusIcon,
} from "./AssignmentStatus";
import type { Assignment } from "./types";
import { formatDate, hasEveryoneDeclined } from "./utils";

interface AssignmentCardProps {
	assignment: Assignment;
	darkMode: boolean;
	isCaptain: boolean;
	hasProgress: boolean;
	onStartAssignment: () => void;
	onViewAssignment: () => void;
	onViewAnalytics: () => void;
	onDelete: () => void;
	showDeleteConfirm: boolean;
	isDeletingAssignment: boolean;
	onCancelDelete: () => void;
}

export const AssignmentCard: React.FC<AssignmentCardProps> = ({
	assignment,
	darkMode,
	isCaptain,
	hasProgress,
	onStartAssignment,
	onViewAssignment,
	onViewAnalytics,
	onDelete,
	showDeleteConfirm,
	isDeletingAssignment,
	onCancelDelete,
}) => {
	const { user } = useAuth();
	const everyoneDeclined = hasEveryoneDeclined(assignment);

	// Fetch analytics data for this assignment to get accurate submission status
	const { data: analyticsData } = trpc.teams.getAssignmentAnalytics.useQuery(
		{ assignmentId: assignment.id },
		{
			enabled: !!user?.id && !isCaptain, // Only fetch for non-captains (their own data)
			refetchOnMount: true,
			refetchOnWindowFocus: true,
		},
	);

	// Use analytics data if available, otherwise fall back to assignment data
	const userSubmissionFromAnalytics = analyticsData?.roster?.find(
		(member) => member.user_id === user?.id,
	)?.submission;

	const effectiveUserSubmission =
		userSubmissionFromAnalytics || assignment.user_submission;

	// Calculate submitted count from analytics if available
	const effectiveSubmittedCount = analyticsData
		? analyticsData.submitted_count
		: assignment.submitted_count;

	// Create a merged assignment object with analytics data
	const mergedAssignment: Assignment = {
		...assignment,
		user_submission: effectiveUserSubmission
			? {
					status: effectiveUserSubmission.status,
					submitted_at: effectiveUserSubmission.submitted_at || "",
					grade: effectiveUserSubmission.grade || 0,
					attempt_number: effectiveUserSubmission.attempt_number || 1,
				}
			: assignment.user_submission,
		submitted_count: effectiveSubmittedCount,
	};

	const status = getAssignmentStatus(mergedAssignment, isCaptain);

	const isUserAssigned = !!(
		user?.id &&
		assignment.roster &&
		assignment.roster.some((rosterMember) => rosterMember.user_id === user.id)
	);

	return (
		<div
			className={`p-3 md:p-4 rounded-lg border ${
				darkMode
					? "bg-gray-800 border-gray-700 hover:bg-gray-750"
					: "bg-white border-gray-200 hover:bg-gray-50"
			} transition-colors`}
		>
			<div className="flex items-start justify-between">
				<div className="flex-1">
					<div className="flex items-start justify-between mb-2">
						<div className="flex items-center gap-2 flex-1">
							<h3
								className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
							>
								{assignment.title}
							</h3>
							{!everyoneDeclined && (
								<AssignmentStatusBadge
									assignment={mergedAssignment}
									isCaptain={isCaptain}
									darkMode={darkMode}
								/>
							)}
						</div>
						<div className="ml-4 flex items-center space-x-2">
							{everyoneDeclined ? (
								<div title="Everyone declined this assignment">
									<AlertTriangle className="w-5 h-5 text-orange-500" />
								</div>
							) : (
								getStatusIcon(status)
							)}
							{isCaptain && (
								<>
									<button
										type="button"
										onClick={onViewAnalytics}
										className={`p-2 rounded-lg ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
										title="View Assignment Analytics"
									>
										<BarChart3 className="w-4 h-4" />
									</button>
									{showDeleteConfirm ? (
										<div className="flex items-center space-x-1">
											<button
												type="button"
												onClick={onDelete}
												disabled={isDeletingAssignment}
												className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
											>
												{isDeletingAssignment ? "Deleting..." : "Confirm"}
											</button>
											<button
												type="button"
												onClick={onCancelDelete}
												className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
											>
												Cancel
											</button>
										</div>
									) : (
										<button
											type="button"
											onClick={onDelete}
											className={`p-2 rounded-lg ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"} hover:bg-red-100`}
											title="Delete Assignment"
										>
											<Trash2 className="w-4 h-4 text-red-500" />
										</button>
									)}
								</>
							)}
						</div>
					</div>

					{everyoneDeclined ? (
						<div className="flex items-center gap-2 mb-3">
							<AlertTriangle className="w-4 h-4 text-orange-500" />
							<span
								className={`text-sm font-medium ${darkMode ? "text-orange-400" : "text-orange-600"}`}
							>
								Everyone declined this assignment
							</span>
						</div>
					) : (
						<>
							<p
								className={`mb-3 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
							>
								{assignment.description}
							</p>
						</>
					)}

					{!everyoneDeclined && (
						<>
							{assignment.roster && assignment.roster.length > 0 && (
								<div
									className={`mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
								>
									<div className="text-sm font-medium mb-1">Assigned to:</div>
									<div className="flex flex-wrap gap-1">
										{assignment.roster
											.slice(0, 3)
											.map((student, index: number) => {
												const studentName =
													typeof student === "string"
														? student
														: (student?.display_name ??
															student?.student_name ??
															"Unknown");
												return (
													<span
														key={`student-${index}-${String(studentName).slice(0, 20)}`}
														className={`px-2 py-1 rounded-full text-xs ${darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}
													>
														{studentName}
													</span>
												);
											})}
										{assignment.roster.length > 3 && (
											<span
												className={`px-2 py-1 rounded-full text-xs ${darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}
											>
												+{assignment.roster.length - 3} more
											</span>
										)}
									</div>
								</div>
							)}

							<div
								className={`flex flex-wrap items-center gap-3 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
							>
								{assignment.due_date && (
									<div className="flex items-center space-x-1">
										<Calendar className="w-4 h-4" />
										<span>Due: {formatDate(assignment.due_date)}</span>
									</div>
								)}
								{assignment.time_limit_minutes && (
									<div className="flex items-center space-x-1">
										<Clock className="w-4 h-4" />
										<span>{assignment.time_limit_minutes} min</span>
									</div>
								)}
								{assignment.questions_count && (
									<div className="flex items-center space-x-1">
										<Hash className="w-4 h-4" />
										<span>{assignment.questions_count} questions</span>
									</div>
								)}
							</div>

							{mergedAssignment.user_submission && (
								<div
									className={`mt-2 text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
								>
									Submitted:{" "}
									{formatDate(mergedAssignment.user_submission.submitted_at)}
								</div>
							)}
						</>
					)}

					{!everyoneDeclined &&
						(!isCaptain || (isCaptain && isUserAssigned)) && (
							<div className="mt-3 flex items-center gap-2">
								{mergedAssignment.user_submission ? (
									<button
										type="button"
										onClick={onViewAssignment}
										className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
											darkMode
												? "bg-purple-600 hover:bg-purple-700 text-white"
												: "bg-purple-100 hover:bg-purple-200 text-purple-700"
										}`}
									>
										My Results
									</button>
								) : hasProgress ? (
									<button
										type="button"
										onClick={onStartAssignment}
										className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
											darkMode
												? "bg-green-600 hover:bg-green-700 text-white"
												: "bg-green-100 hover:bg-green-200 text-green-700"
										}`}
									>
										Continue Assignment
									</button>
								) : (
									<button
										type="button"
										onClick={onStartAssignment}
										className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
											darkMode
												? "bg-green-600 hover:bg-green-700 text-white"
												: "bg-green-100 hover:bg-green-200 text-green-700"
										}`}
									>
										Start Assignment
									</button>
								)}
							</div>
						)}

					{!everyoneDeclined &&
						isCaptain &&
						mergedAssignment.roster_count &&
						mergedAssignment.roster_count > 0 && (
							<div className="mt-3">
								<div className="flex justify-between text-xs mb-1">
									<span
										className={darkMode ? "text-gray-400" : "text-gray-500"}
									>
										{(mergedAssignment.submitted_count || 0) ===
										mergedAssignment.roster_count
											? "Completed"
											: "Submissions"}
									</span>
									<span
										className={darkMode ? "text-gray-400" : "text-gray-500"}
									>
										{mergedAssignment.submitted_count || 0}/
										{mergedAssignment.roster_count}
									</span>
								</div>
								<div
									className={`w-full rounded-full h-2 ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
								>
									<div
										className="bg-blue-600 h-2 rounded-full transition-all duration-300"
										style={{
											width: `${((mergedAssignment.submitted_count || 0) / mergedAssignment.roster_count) * 100}%`,
										}}
									/>
								</div>

								{(mergedAssignment.submitted_count || 0) > 0 && (
									<button
										type="button"
										onClick={onViewAnalytics}
										className={`mt-2 text-xs px-3 py-1 rounded-lg transition-colors ${
											darkMode
												? "bg-blue-600 hover:bg-blue-700 text-white"
												: "bg-blue-100 hover:bg-blue-200 text-blue-700"
										}`}
									>
										See Results
									</button>
								)}
							</div>
						)}
				</div>
			</div>
		</div>
	);
};
