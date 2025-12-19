"use client";

import Modal from "@/app/components/Modal";
import { useTeamFull } from "@/lib/hooks/useTeam";
import { trpc } from "@/lib/trpc/client";
import {
	getEventCapabilities,
	isCodebustersEvent,
} from "@/lib/utils/assessments/eventConfig";
import { useEffect, useMemo, useState } from "react";
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
	generateQuestions,
	getAvailableEvents,
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
		title: "Scio.ly Assignment",
		description: "",
		dueDate: "",
		points: 0,
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
	const [idPercentageForReplace, setIdPercentageForReplace] =
		useState<number>(0);

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
		const seenUserIds = new Set<string>();
		const seenRosterEntries = new Set<string>(); // Track roster entries by userId + displayName

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

		// Add roster entries, deduplicating by userId (if linked) or roster entry ID (if unlinked)
		for (const rosterEntry of teamData.rosterEntries) {
			if (rosterEntry.subteamId === subteamId) {
				const member = rosterEntry.userId
					? memberMap.get(rosterEntry.userId)
					: null;
				const displayName = rosterEntry.displayName || "";

				// For linked entries, skip if we've already added this user
				// (one user can have multiple roster entries for different events)
				if (rosterEntry.userId && seenUserIds.has(rosterEntry.userId)) {
					continue; // Skip duplicate linked entries - user already added
				}

				// For unlinked entries, use the roster entry ID to ensure uniqueness
				const entryKey = rosterEntry.userId
					? `user_${rosterEntry.userId}`
					: `roster_${rosterEntry.id}`;

				// Skip if we've already seen this exact entry
				if (seenRosterEntries.has(entryKey)) {
					continue;
				}

				seenRosterEntries.add(entryKey);
				if (rosterEntry.userId) {
					seenUserIds.add(rosterEntry.userId);
				}

				members.push({
					student_name: displayName,
					user_id: rosterEntry.userId || undefined,
					subteam_id: subteamId,
					isLinked: !!rosterEntry.userId,
					userEmail: member?.email || undefined,
					username: member?.username || undefined,
					roster_entry_id: rosterEntry.id,
				});
			}
		}

		// Add team members who aren't in roster yet
		for (const member of teamData.members) {
			if (member.subteamId === subteamId) {
				// Check if already added from roster (by userId)
				if (!seenUserIds.has(member.id)) {
					members.push({
						student_name: member.name,
						user_id: member.id,
						subteam_id: subteamId,
						isLinked: true,
						userEmail: member.email || undefined,
						username: member.username || undefined,
					});
					seenUserIds.add(member.id);
				}
			}
		}

		return members;
	}, [teamData, subteamId]);

	// Get all available events - start with all events from EVENTS_2026, then add any from roster
	const availableEvents = useMemo(() => {
		const eventSet = new Set<string>();

		// Start with all events from the events list
		const allEvents = getAvailableEvents();
		for (const event of allEvents) {
			eventSet.add(event);
		}

		// Also add any events from roster entries (in case there are custom events)
		if (teamData?.rosterEntries) {
			for (const entry of teamData.rosterEntries) {
				if (entry.eventName) {
					eventSet.add(entry.eventName);
				}
			}
		}

		// Always include prefillEventName if set (even if not in events list or roster)
		if (prefillEventName) {
			eventSet.add(prefillEventName);
		}

		return Array.from(eventSet).sort();
	}, [teamData?.rosterEntries, prefillEventName]);

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
			const calculatedIdPercentage =
				settings.questionCount > 0
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
			const idPercentageToUse =
				idPercentageForReplace > 0
					? idPercentageForReplace
					: settings.questionCount > 0
						? Math.round((settings.idPercentage / settings.questionCount) * 100)
						: 0;

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

	// tRPC mutation for creating assignments
	const createAssignmentMutation = trpc.teams.createAssignment.useMutation();

	const handleCreateAssignment = async () => {
		setLoading(true);
		setError(null);

		try {
			// Format questions for the API
			const formattedQuestions = generatedQuestions.map((q) => {
				// Extract correct answer from answers array
				// The API expects: MCQ answers as letter (A, B, C) or index string, FRQ as text
				let correctAnswer: string | undefined;
				if (q.question_type === "multiple_choice" && q.options) {
					// For MCQ, answers are indices - convert to letter (A, B, C, etc.)
					if (Array.isArray(q.answers) && q.answers.length > 0) {
						const answerIndex =
							typeof q.answers[0] === "number"
								? q.answers[0]
								: Number.parseInt(String(q.answers[0]));
						if (
							!Number.isNaN(answerIndex) &&
							answerIndex >= 0 &&
							answerIndex < 26
						) {
							// Convert index to letter (0 -> A, 1 -> B, etc.)
							correctAnswer = String.fromCharCode(65 + answerIndex); // 65 is 'A'
						} else {
							// Fallback to index as string
							correctAnswer = String(answerIndex);
						}
					}
				} else if (q.question_type === "free_response") {
					// For FRQ, answers are strings - join if array
					correctAnswer = Array.isArray(q.answers)
						? q.answers.join(", ")
						: String(q.answers || "");
				}

				return {
					questionText: q.question_text,
					questionType: q.question_type,
					options: q.options?.map((opt) =>
						typeof opt === "string" ? opt : opt.text || "",
					),
					correctAnswer,
					points: 1,
					imageData: q.imageData || null,
					difficulty: q.difficulty,
				};
			});

			// Get roster member details for selected members
			const rosterMemberDetails = selectedRoster.map((memberName) => {
				const member = rosterMembers.find((m) => m.student_name === memberName);
				return {
					studentName: memberName,
					userId: member?.user_id || null,
					displayName: memberName,
				};
			});

			const assignment = await createAssignmentMutation.mutateAsync({
				teamSlug: teamId,
				title: details.title,
				description: details.description || null,
				dueDate: details.dueDate || null,
				eventName: details.eventName || null,
				timeLimitMinutes: details.timeLimitMinutes || null,
				points: 0,
				isRequired: false,
				maxAttempts: 1,
				subteamId: subteamId || null,
				questions: formattedQuestions,
				rosterMembers: rosterMemberDetails,
			});

			toast.success("Assignment created successfully!");
			onAssignmentCreated({ id: assignment.id, title: assignment.title });
		} catch (error) {
			console.error("Failed to create assignment:", error);
			setError("Failed to create assignment. Please try again.");
			toast.error("Failed to create assignment. Please try again.");
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
		<Modal
			isOpen={true}
			onClose={onCancel}
			title="Create Assignment"
			maxWidth="4xl"
						>
			<div className="max-h-[80vh] overflow-y-auto">
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
		</Modal>
	);
}
