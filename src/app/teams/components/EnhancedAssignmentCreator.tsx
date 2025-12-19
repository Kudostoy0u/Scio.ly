"use client";

import { useTeamFull } from "@/lib/hooks/useTeam";
import { getEventCapabilities, isCodebustersEvent } from "@/lib/utils/assessments/eventConfig";
import { useMemo } from "react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import AssignmentDetailsStep from "./assignment/AssignmentDetailsStep";
import CodebustersAssignmentCreator from "./assignment/CodebustersAssignmentCreator";
import QuestionGenerationStep from "./assignment/QuestionGenerationStep";
import QuestionPreviewStep from "./assignment/QuestionPreviewStep";
import RosterSelectionStep from "./assignment/RosterSelectionStep";
import type {
	AssignmentCreatorProps,
	AssignmentDetails,
	Question,
	QuestionGenerationSettings,
	RosterMember,
} from "./assignment/assignmentTypes";
import {
	createAssignment,
	generateQuestions,
	getAvailableEvents,
	getEventCapabilitiesForEvent,
} from "./assignment/assignmentUtils";

export default function EnhancedAssignmentCreator({
	teamId,
	subteamId,
	onAssignmentCreated,
	onCancel,
	darkMode = false,
	prefillEventName = "",
}: AssignmentCreatorProps) {
	const [step, setStep] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Assignment details
	const [details, setDetails] = useState<AssignmentDetails>({
		title: "",
		description: "",
		assignmentType: "homework",
		dueDate: "",
		points: 100,
		timeLimitMinutes: 30,
		eventName: prefillEventName,
	});

	// Question generation settings
	const [settings, setSettings] = useState<QuestionGenerationSettings>({
		questionCount: 10,
		questionType: "mcq",
		idPercentage: 0,
		pureIdOnly: false,
		difficulties: ["any"], // Default to any difficulty
		division: "any",
		subtopics: [],
		rmTypeFilter: undefined,
	});
	
	// Store the calculated ID percentage for replace operations
	const [idPercentageForReplace, setIdPercentageForReplace] = useState<number>(0);

	// Generated questions and roster
	const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
	const [generatingQuestions, setGeneratingQuestions] = useState(false);
	const [selectedRoster, setSelectedRoster] = useState<string[]>([]);
	const [showAnswers, setShowAnswers] = useState(false);

	// Get roster and members from tRPC cache
	const { data: teamData, isLoading: loadingRoster } = useTeamFull(teamId);

	// Transform cached data into RosterMember format
	const rosterMembers = useMemo<RosterMember[]>(() => {
		if (!teamData || !subteamId) {
			return [];
		}

		const members: RosterMember[] = [];
		const memberMap = new Map<
			string,
			{
				id: string;
				email: string | null;
				name: string;
				username: string | null;
			}
		>();

		// Build member map from team members
		for (const member of teamData.members) {
			if (member.subteamId === subteamId) {
				memberMap.set(member.id, {
					id: member.id,
					email: member.email,
					name: member.name,
					username: member.username,
				});
			}
		}

		// Add roster entries
		for (const rosterEntry of teamData.rosterEntries) {
			if (rosterEntry.subteamId === subteamId) {
				const member = rosterEntry.userId
					? memberMap.get(rosterEntry.userId)
					: null;
				const displayName = rosterEntry.displayName || "";

				members.push({
					student_name: displayName,
					user_id: rosterEntry.userId || undefined,
					subteam_id: subteamId,
					isLinked: !!rosterEntry.userId,
					userEmail: member?.email || undefined,
					username: member?.username || undefined,
				});
			}
		}

		// Add team members who aren't in roster yet
		for (const member of teamData.members) {
			if (member.subteamId === subteamId) {
				// Check if already added from roster
				if (!members.some((m) => m.user_id === member.id)) {
					members.push({
						student_name: member.name,
						user_id: member.id,
						subteam_id: subteamId,
						isLinked: true,
						userEmail: member.email || undefined,
						username: member.username || undefined,
					});
				}
			}
		}

		return members;
	}, [teamData, subteamId]);

	// Available events
	const [availableEvents] = useState<string[]>(getAvailableEvents());
	const [eventCapabilities, setEventCapabilities] = useState({
		supportsPictureQuestions: false,
		supportsIdentificationOnly: false,
		supportsIdQuestions: false,
	});

	// Update event name when prefillEventName changes
	useEffect(() => {
		if (prefillEventName && prefillEventName !== details.eventName) {
			setDetails((prev) => ({ ...prev, eventName: prefillEventName }));
		}
	}, [prefillEventName, details.eventName]);

	// Roster members are now loaded from tRPC cache via useTeamFull hook above

	// Update capabilities when event changes - use shared eventConfig
	useEffect(() => {
		if (details.eventName) {
			const capabilities = getEventCapabilities(details.eventName);
			setEventCapabilities({
				supportsPictureQuestions: capabilities.supportsPictureQuestions,
				supportsIdentificationOnly: capabilities.supportsIdentificationOnly,
				supportsIdQuestions: capabilities.supportsIdQuestions,
			});
		}
	}, [details.eventName]);

	// Check if this is a Codebusters assignment and render accordingly
	if (isCodebustersEvent(details.eventName)) {
		return (
			<CodebustersAssignmentCreator
				teamId={teamId}
				subteamId={subteamId}
				onAssignmentCreated={onAssignmentCreated}
				onCancel={onCancel}
				darkMode={darkMode}
				prefillEventName={details.eventName}
			/>
		);
	}

	const handleGenerateQuestions = async () => {
		setGeneratingQuestions(true);
		setError(null);

		try {
			// Calculate the ID percentage for this generation
			const calculatedIdPercentage = settings.questionCount > 0
				? Math.round((settings.idPercentage / settings.questionCount) * 100)
				: 0;
			
			// Store it for replace operations
			setIdPercentageForReplace(calculatedIdPercentage);

			const questions = await generateQuestions(
				details.eventName,
				settings.questionCount,
				settings.questionType,
				settings.idPercentage,
				settings.pureIdOnly,
				teamId,
				settings.difficulties,
				settings.division,
				settings.subtopics,
				settings.rmTypeFilter,
			);

			setGeneratedQuestions(questions);
			toast.success(`Generated ${questions.length} questions successfully!`);
		} catch (_error) {
			setError("Failed to generate questions. Please try again.");
		} finally {
			setGeneratingQuestions(false);
		}
	};

	const replaceQuestion = async (index: number) => {
		try {
			// When replacing, use the stored percentage instead of recalculating from raw count
			// This prevents the percentage from being > 100 when questionCount is 1
			const idPercentageToUse = idPercentageForReplace > 0 
				? idPercentageForReplace 
				: (settings.questionCount > 0 
					? Math.round((settings.idPercentage / settings.questionCount) * 100) 
					: 0);
			
			// Convert percentage back to raw count for 1 question
			const idCountForOne = Math.round((idPercentageToUse / 100) * 1);
			
			const newQuestion = await generateQuestions(
				details.eventName,
				1,
				settings.questionType,
				idCountForOne, // Use calculated count for 1 question
				settings.pureIdOnly,
				teamId,
				settings.difficulties,
				settings.division,
				settings.subtopics,
				settings.rmTypeFilter,
			);

			if (newQuestion.length > 0 && newQuestion[0]) {
				const updatedQuestions = [...generatedQuestions];
				updatedQuestions[index] = newQuestion[0];
				setGeneratedQuestions(updatedQuestions);
				toast.success("Question replaced successfully!");
			}
		} catch (_error) {
			setError("Failed to replace question. Please try again.");
		}
	};

	const handleCreateAssignment = async () => {
		setLoading(true);
		setError(null);

		try {
			const assignmentData = {
				title: details.title,
				description: details.description,
				assignment_type: details.assignmentType,
				due_date: details.dueDate,
				points: details.points ?? 0,
				time_limit_minutes: details.timeLimitMinutes,
				event_name: details.eventName,
				questions: generatedQuestions,
				roster_members: selectedRoster,
			};

			const assignment = await createAssignment(
				teamId,
				subteamId,
				assignmentData,
			);

			toast.success("Assignment created successfully!");
			onAssignmentCreated(assignment);
		} catch (_error) {
			setError("Failed to create assignment. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleDetailsChange = (updates: Partial<AssignmentDetails>) => {
		setDetails((prev) => ({ ...prev, ...updates }));
	};

	const handleSettingsChange = (
		updates: Partial<QuestionGenerationSettings>,
	) => {
		setSettings((prev) => ({ ...prev, ...updates }));
	};

	const handleError = (errorMessage: string) => {
		setError(errorMessage);
	};

	const handleNext = () => {
		setError(null);
		setStep((prev) => prev + 1);
	};

	const handleQuestionGenerationNext = async () => {
		setError(null);
		try {
			await handleGenerateQuestions();
			setStep((prev) => prev + 1);
		} catch {
			// Error is already handled in handleGenerateQuestions
			// Don't advance to next step if generation fails
		}
	};

	const handleBack = () => {
		setError(null);
		setStep((prev) => prev - 1);
	};

	return (
		<div
			className="fixed inset-0 flex items-center justify-center z-50"
			style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
		>
			<div
				className={`max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-lg ${darkMode ? "bg-gray-800" : "bg-white"}`}
			>
				<div className="p-6">
					<div className="flex justify-between items-center mb-6">
						<h2
							className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
						>
							Create Assignment
						</h2>
						<button
							type="button"
							onClick={onCancel}
							className={`p-2 rounded-lg hover:bg-opacity-20 transition-colors ${
								darkMode ? "hover:bg-gray-600" : "hover:bg-gray-200"
							}`}
						>
							<svg
								className="w-5 h-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>Close</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					{/* Progress indicator */}
					<div className="mb-6">
						<div className="flex items-center justify-between">
							{[1, 2, 3, 4].map((stepNumber) => (
								<div key={stepNumber} className="flex items-center">
									<div
										className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
											step >= stepNumber
												? "bg-blue-600 text-white"
												: darkMode
													? "bg-gray-600 text-gray-300"
													: "bg-gray-200 text-gray-600"
										}`}
									>
										{stepNumber}
									</div>
									{stepNumber < 4 && (
										<div
											className={`w-12 h-1 mx-2 ${
												step > stepNumber
													? "bg-blue-600"
													: darkMode
														? "bg-gray-600"
														: "bg-gray-200"
											}`}
										/>
									)}
								</div>
							))}
						</div>
						<div className="flex justify-between mt-2 text-xs">
							<span className={darkMode ? "text-gray-400" : "text-gray-500"}>
								Details
							</span>
							<span className={darkMode ? "text-gray-400" : "text-gray-500"}>
								Questions
							</span>
							<span className={darkMode ? "text-gray-400" : "text-gray-500"}>
								Preview
							</span>
							<span className={darkMode ? "text-gray-400" : "text-gray-500"}>
								Roster
							</span>
						</div>
					</div>

					{error && (
						<div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
							{error}
						</div>
					)}

					{/* Step 1: Assignment Details */}
					{step === 1 && (
						<AssignmentDetailsStep
							darkMode={darkMode}
							onNext={handleNext}
							onBack={onCancel}
							onError={handleError}
							details={details}
							onDetailsChange={handleDetailsChange}
							prefillEventName={prefillEventName}
							availableEvents={availableEvents}
						/>
					)}

					{/* Step 2: Question Generation */}
					{step === 2 && (
						<QuestionGenerationStep
							darkMode={darkMode}
							onNext={handleQuestionGenerationNext}
							onBack={handleBack}
							onError={handleError}
							settings={settings}
							onSettingsChange={handleSettingsChange}
							supportsPictureQuestions={
								eventCapabilities.supportsPictureQuestions
							}
							supportsIdentificationOnly={
								eventCapabilities.supportsIdentificationOnly
							}
							onGenerateQuestions={handleGenerateQuestions}
							generatingQuestions={generatingQuestions}
							eventName={details.eventName}
						/>
					)}

					{/* Step 3: Question Preview */}
					{step === 3 && (
						<QuestionPreviewStep
							onNext={handleNext}
							onBack={handleBack}
							onError={handleError}
							questions={generatedQuestions}
							showAnswers={showAnswers}
							onShowAnswersChange={setShowAnswers}
							onReplaceQuestion={replaceQuestion}
						/>
					)}

					{/* Step 4: Roster Selection */}
					{step === 4 && (
						<RosterSelectionStep
							darkMode={darkMode}
							onNext={handleNext}
							onBack={handleBack}
							onError={handleError}
							rosterMembers={rosterMembers}
							selectedRoster={selectedRoster}
							onRosterChange={setSelectedRoster}
							loadingRoster={loadingRoster}
							onCreateAssignment={handleCreateAssignment}
							creating={loading}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
