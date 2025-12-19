"use client";

import {
	CheckCircle,
	ChevronDown,
	ChevronUp,
	Clock,
	FileText,
	Target,
	X,
} from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

interface Question {
	id: string;
	question_text: string;
	question_type: "multiple_choice" | "free_response" | "codebusters";
	options?: Array<{ id: string; text: string; isCorrect: boolean }>;
	correct_answer?: string;
	points: number;
	order_index: number;
}

interface RosterMember {
	id: string;
	student_name: string;
	user_id: string | null;
	subteam_id: string | null;
	assigned_at: string;
	email: string | null;
	display_name: string | null;
	submission?: {
		id: string;
		status: string;
		grade: number | null;
		attempt_number: number;
		submitted_at: string;
	};
	analytics?: {
		total_questions: number;
		correct_answers: number;
		total_points: number;
		earned_points: number;
		completion_time_seconds: number | null;
		submitted_at: string;
	};
}

// Assignment type is now inferred from tRPC response

interface AssignmentViewerModalProps {
	assignmentId: string;
	teamSlug: string;
	isCaptain: boolean;
	onClose: () => void;
	darkMode?: boolean;
}

export default function AssignmentViewerModal({
	assignmentId,
	teamSlug: _teamSlug,
	isCaptain,
	onClose,
	darkMode = false,
}: AssignmentViewerModalProps) {
	const [collapsedSections, setCollapsedSections] = useState({
		studentResults: false,
		assignmentDetails: false,
	});

	const {
		data: assignment,
		isLoading: loading,
		error: queryError,
	} = trpc.teams.getAssignmentAnalytics.useQuery(
		{ assignmentId },
		{ enabled: isCaptain },
	);

	const error = queryError ? queryError.message : null;

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (loading) {
		return (
			<div
				className="fixed inset-0 flex items-center justify-center z-50"
				style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
			>
				<div
					className={`max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-lg ${darkMode ? "bg-gray-800" : "bg-white"}`}
				>
					<div className="p-6">
						<div className="flex items-center justify-center h-64">
							<div
								className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}
							>
								Loading assignment...
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (error || !assignment) {
		return (
			<div
				className="fixed inset-0 flex items-center justify-center z-50"
				style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
			>
				<div
					className={`max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-lg ${darkMode ? "bg-gray-800" : "bg-white"}`}
				>
					<div className="p-6">
						<div className="text-center py-12">
							<div className="text-red-500 mb-4">⚠️</div>
							<h3
								className={`text-lg font-medium mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
							>
								Error loading assignment
							</h3>
							<p className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
								{error || "Assignment not found"}
							</p>
							<button
								type="button"
								onClick={onClose}
								className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	const isOverdue =
		assignment.dueDate && new Date() > new Date(assignment.dueDate);

	// derive counts from roster to ensure metrics reflect actual roster data
	const rosterList = assignment.roster || [];
	const computedSubmittedCount = rosterList.filter(
		(m) => !!m.submission,
	).length;
	// const _computedGradedCount = rosterList.filter(m => m.submission?.status === 'graded').length;
	// const _computedPendingCount = (assignment.roster_count || rosterList.length) - computedSubmittedCount;

	// Calculate average accuracy from submitted assignments
	type RosterMember = {
		submission?: { status: string } | null;
		analytics?: {
			correct_answers: number | null;
			total_questions: number | null;
		} | null;
	};
	const submittedWithAnalytics = rosterList.filter(
		(m: RosterMember) => m.submission && m.analytics,
	) as Array<
		RosterMember & {
			submission: { status: string };
			analytics: {
				correct_answers: number | null;
				total_questions: number | null;
			};
		}
	>;
	const averageAccuracy =
		submittedWithAnalytics.length > 0
			? Math.round(
					submittedWithAnalytics.reduce((sum: number, m) => {
						const correct = m.analytics.correct_answers ?? 0;
						const total = m.analytics.total_questions ?? 1;
						return sum + (Number(correct) / Number(total)) * 100;
					}, 0) / submittedWithAnalytics.length,
				)
			: 0;

	// Calculate submission percentage
	const submissionPercentage =
		rosterList.length > 0
			? Math.round((computedSubmittedCount / rosterList.length) * 100)
			: 0;

	return (
		<div
			className="fixed inset-0 flex items-center justify-center z-50"
			style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
		>
			<div
				className={`max-w-4xl w-full mx-2 md:mx-4 max-h-[90vh] overflow-y-auto rounded-lg ${darkMode ? "bg-gray-800" : "bg-white"}`}
			>
				<div className="p-4 md:p-6">
					<div className="flex justify-between items-start mb-4 md:mb-6">
						<h2
							className={`text-lg md:text-2xl font-bold pr-4 ${darkMode ? "text-white" : "text-gray-900"}`}
						>
							{assignment.title}
							{assignment.eventName ? ` - ${assignment.eventName}` : ""}
						</h2>
						<button
							type="button"
							onClick={onClose}
							className={`p-2 rounded-lg flex-shrink-0 ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Assignment Info */}
					<div
						className={`mb-4 p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}
					>
						<div className="grid grid-cols-2 md:flex md:justify-between items-center py-2 mx-2 md:mx-4 gap-3 md:gap-0">
							<div className="flex items-center space-x-2">
								<Clock className="w-4 h-4 md:w-5 md:h-5" />
								<span
									className={`text-xs md:text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
								>
									{assignment.timeLimitMinutes} min
								</span>
							</div>
							<div className="flex items-center space-x-2">
								<FileText className="w-4 h-4 md:w-5 md:h-5" />
								<span
									className={`text-xs md:text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
								>
									{assignment.questionsCount ||
										assignment.questions?.length ||
										0}{" "}
									questions
								</span>
							</div>
							<div className="flex items-center space-x-2">
								<Target className="w-4 h-4 md:w-5 md:h-5" />
								<span
									className={`text-xs md:text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
								>
									{averageAccuracy}% accuracy
								</span>
							</div>
							<div className="flex items-center space-x-2">
								<CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
								<span
									className={`text-xs md:text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
								>
									{submissionPercentage}% submitted
								</span>
							</div>
							{assignment.dueDate && (
								<div className="flex items-center space-x-2 col-span-2 md:col-span-1 justify-center md:justify-start">
									<span
										className={`text-xs md:text-sm ${isOverdue ? "text-red-500" : darkMode ? "text-gray-300" : "text-gray-600"}`}
									>
										Due: {formatDate(assignment.dueDate)}
									</span>
								</div>
							)}
						</div>
						{assignment.description && (
							<p
								className={`mt-2 text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
							>
								{assignment.description}
							</p>
						)}
					</div>

					{/* Analytics Content */}
					<div className="space-y-6">
						{/* Student Results (also shown in analytics for quick access) */}
						<div
							className={`p-4 md:p-6 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}
						>
							<button
								type="button"
								onClick={() =>
									setCollapsedSections((prev) => ({
										...prev,
										studentResults: !prev.studentResults,
									}))
								}
								className={`w-full flex items-center justify-between text-left ${darkMode ? "text-white" : "text-gray-900"}`}
							>
								<h3
									className={`text-lg font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
								>
									Student Results
								</h3>
								{collapsedSections.studentResults ? (
									<ChevronDown className="w-5 h-5" />
								) : (
									<ChevronUp className="w-5 h-5" />
								)}
							</button>
							{!collapsedSections.studentResults && (
								<div className="space-y-3 mt-4">
									{assignment.roster && assignment.roster.length > 0 ? (
										assignment.roster.map((member) => {
											const hasSubmission = !!member.submission;
											const isGraded = member.submission?.status === "graded";

											return (
												<div
													key={member.id}
													className={`p-3 md:p-4 rounded-lg border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
												>
													<div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
														<div className="flex-1">
															<div className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-3">
																<h4
																	className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
																>
																	{member.display_name || member.student_name}
																</h4>
																<span
																	className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
																		isGraded
																			? "bg-green-100 text-green-800"
																			: hasSubmission
																				? "bg-blue-100 text-blue-800"
																				: "bg-yellow-100 text-yellow-800"
																	}`}
																>
																	{isGraded
																		? "Graded"
																		: hasSubmission
																			? "Submitted"
																			: "Pending"}
																</span>
															</div>
															{member.email && (
																<p
																	className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
																>
																	{member.email}
																</p>
															)}
														</div>

														<div className="text-left md:text-right">
															{hasSubmission && member.analytics ? (
																<div className="space-y-1">
																	<div
																		className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
																	>
																		Submitted:{" "}
																		{member.analytics?.submitted_at
																			? formatDate(
																					member.analytics.submitted_at,
																				)
																			: member.submission?.submitted_at
																				? formatDate(
																						member.submission.submitted_at,
																					)
																				: "N/A"}
																	</div>
																	<div className="text-sm">
																		<span
																			className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
																		>
																			{member.analytics.correct_answers}/
																			{member.analytics.total_questions} correct
																		</span>
																		<span
																			className={`ml-2 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
																		>
																			(
																			{Math.round(
																				(Number(
																					member.analytics.correct_answers,
																				) /
																					Number(
																						member.analytics.total_questions,
																					)) *
																					100,
																			) || 0}
																			%)
																		</span>
																	</div>
																</div>
															) : (
																<div
																	className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
																>
																	Not started
																</div>
															)}
														</div>
													</div>
												</div>
											);
										})
									) : (
										<div
											className={`${darkMode ? "text-gray-400" : "text-gray-600"}`}
										>
											No students assigned
										</div>
									)}
								</div>
							)}
						</div>

						{/* Assignment Details */}
						<div
							className={`p-4 md:p-6 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}
						>
							<button
								type="button"
								onClick={() =>
									setCollapsedSections((prev) => ({
										...prev,
										assignmentDetails: !prev.assignmentDetails,
									}))
								}
								className={`w-full flex items-center justify-between text-left ${darkMode ? "text-white" : "text-gray-900"}`}
							>
								<h3
									className={`text-lg font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
								>
									Assignment Details
								</h3>
								{collapsedSections.assignmentDetails ? (
									<ChevronDown className="w-5 h-5" />
								) : (
									<ChevronUp className="w-5 h-5" />
								)}
							</button>
							{!collapsedSections.assignmentDetails && (
								<div className="space-y-3 mt-4">
									<div className="flex flex-col md:flex-row md:justify-between space-y-1 md:space-y-0">
										<span
											className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}
										>
											Type:
										</span>
										<span
											className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
										>
											{assignment.assignmentType || "standard"}
										</span>
									</div>
									{assignment.dueDate && (
										<div className="flex flex-col md:flex-row md:justify-between space-y-1 md:space-y-0">
											<span
												className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}
											>
												Due Date:
											</span>
											<span
												className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
											>
												{formatDate(assignment.dueDate)}
											</span>
										</div>
									)}
									<div className="flex flex-col md:flex-row md:justify-between space-y-1 md:space-y-0">
										<span
											className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}
										>
											Created:
										</span>
										<span
											className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
										>
											{formatDate(assignment.createdAt)}
										</span>
									</div>
									<div className="flex flex-col md:flex-row md:justify-between space-y-1 md:space-y-0">
										<span
											className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}
										>
											Created By:
										</span>
										<span
											className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
										>
											{assignment.creatorName}
										</span>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
