"use client";

import { useQuestionGeneration } from "@/app/codebusters/hooks/useQuestionGeneration";
import type { QuoteData } from "@/app/codebusters/types";
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
		charLengthMin: 50,
		charLengthMax: 200,
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
	const { generateCodebustersQuestionsFromParams } = useQuestionGeneration();
	const [codebustersQuotes, setCodebustersQuotes] = useState<QuoteData[]>([]);

	// Get roster and members from tRPC cache
	const { data: teamData, isLoading: loadingRoster } = useTeamFull(teamId);

	// Transform cached data into RosterMember format
	const rosterMembers = useMemo<RosterMember[]>(() => {
		if (!teamData) {
			return [];
		}

		const members: RosterMember[] = [];
		const subteamNameById = new Map(
			teamData.subteams.map((subteam) => [subteam.id, subteam.name || null]),
		);
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
			memberMap.set(member.id, {
				id: member.id,
				email: member.email,
				name: member.name,
				username: member.username,
			});
		}

		// Add roster entries, deduplicating by userId (if linked) or roster entry ID (if unlinked)
		for (const rosterEntry of teamData.rosterEntries) {
			const member = rosterEntry.userId
				? memberMap.get(rosterEntry.userId)
				: null;
			const displayName = rosterEntry.displayName || "";

			if (!rosterEntry.userId) {
				continue;
			}

			// For linked entries, skip if we've already added this user
			// (one user can have multiple roster entries for different events)
			if (seenUserIds.has(rosterEntry.userId)) {
				continue;
			}

			const entryKey = `user_${rosterEntry.userId}`;
			if (seenRosterEntries.has(entryKey)) {
				continue;
			}

			seenRosterEntries.add(entryKey);
			seenUserIds.add(rosterEntry.userId);

			const subteamName =
				subteamNameById.get(rosterEntry.subteamId || "") || null;

			members.push({
				student_name: displayName,
				user_id: rosterEntry.userId,
				subteam_id: rosterEntry.subteamId || undefined,
				subteam_name: subteamName,
				isLinked: true,
				userEmail: member?.email || undefined,
				username: member?.username || undefined,
				roster_entry_id: rosterEntry.id,
			});
		}

		// Add team members who aren't in roster yet
		for (const member of teamData.members) {
			// Check if already added from roster (by userId)
			if (!seenUserIds.has(member.id)) {
				const subteamName = subteamNameById.get(member.subteamId || "") || null;
				members.push({
					student_name: member.name,
					user_id: member.id,
					subteam_id: member.subteamId || undefined,
					subteam_name: subteamName,
					isLinked: true,
					userEmail: member.email || undefined,
					username: member.username || undefined,
				});
				seenUserIds.add(member.id);
			}
		}

		return members;
	}, [teamData]);

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

	const isCodebusters = isCodebustersEvent(details.eventName);

	const mapCodebustersPreview = (
		quotes: Array<{
			quote: string;
			author: string;
			cipherType: string;
			difficulty?: number;
		}>,
	) => {
		return quotes.map((quote, index) => ({
			question_text: quote.quote,
			question_type: "codebusters" as const,
			author: quote.author,
			answers: [],
			order_index: index,
			difficulty: quote.difficulty,
			cipherType: quote.cipherType,
		}));
	};

	const generateCodebustersQuotes = async (
		count: number,
	): Promise<QuoteData[]> => {
		const cipherTypes =
			settings.subtopics && settings.subtopics.length > 0
				? settings.subtopics
				: undefined;
		return generateCodebustersQuestionsFromParams({
			questionCount: count,
			charLengthMin: settings.charLengthMin ?? 50,
			charLengthMax: settings.charLengthMax ?? 200,
			division: settings.division || "any",
			cipherTypes,
		});
	};

	const handleGenerateQuestions = async () => {
		if (isCodebusters) {
			return;
		}
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
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to generate questions";
			
			// Check if it's a rate limit error
			if (
				errorMessage.includes("429") ||
				errorMessage.includes("Too Many Requests") ||
				errorMessage.includes("rate limit")
			) {
				const rateLimitMessage =
					"Too many requests. Please wait a moment and try again.";
				setError(rateLimitMessage);
				toast.error(rateLimitMessage);
			} else {
				setError("Failed to generate questions. Please try again.");
				toast.error("Failed to generate questions. Please try again.");
			}
		} finally {
			setGeneratingQuestions(false);
		}
	};

	const handleGenerateCodebustersPreview = async (count: number) => {
		setGeneratingQuestions(true);
		setError(null);
		try {
			const generated = await generateCodebustersQuotes(count);
			const mapped = mapCodebustersPreview(generated);
			if (count === 1) {
				return mapped[0] || null;
			}
			setCodebustersQuotes(generated);
			setGeneratedQuestions(mapped);
			toast.success(`Generated ${mapped.length} questions successfully!`);
			return null;
		} catch (_error) {
			setError("Failed to generate questions. Please try again.");
			return null;
		} finally {
			setGeneratingQuestions(false);
		}
	};

	const replaceQuestion = async (index: number) => {
		if (isCodebusters) {
			const generated = await generateCodebustersQuotes(1);
			const replacement = generated[0];
			if (replacement) {
				const updatedQuotes = [...codebustersQuotes];
				updatedQuotes[index] = replacement;
				setCodebustersQuotes(updatedQuotes);
				const updatedQuestions = [...generatedQuestions];
				const mappedQuestion = mapCodebustersPreview([replacement])[0];
				if (mappedQuestion) {
					updatedQuestions[index] = mappedQuestion;
					setGeneratedQuestions(updatedQuestions);
					toast.success("Question replaced successfully!");
				}
			}
			return;
		}
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

			if (isCodebusters) {
				const codebustersQuestionsPayload =
					codebustersQuotes.length > 0 ? codebustersQuotes : undefined;
				const url = subteamId
					? `/api/teams/${teamId}/subteams/${subteamId}/assignments/codebusters`
					: `/api/teams/${teamId}/assignments/codebusters`;
				const response = await fetch(url, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						title: details.title,
						description: details.description || null,
						assignment_type: "standard",
						due_date: details.dueDate || null,
						points: details.points ?? 100,
						time_limit_minutes: details.timeLimitMinutes || null,
						event_name: details.eventName || "Codebusters",
						questions: [],
						roster_members: rosterMemberDetails.map((member) => ({
							user_id: member.userId,
							student_name: member.studentName,
							display_name: member.displayName,
						})),
						codebusters_params: {
							questionCount: settings.questionCount,
							cipherTypes: settings.subtopics || [],
							division: settings.division || "any",
							charLengthMin: settings.charLengthMin ?? 50,
							charLengthMax: settings.charLengthMax ?? 200,
						},
						codebusters_questions: codebustersQuestionsPayload,
					}),
				});
				if (!response.ok) {
					throw new Error("Failed to create Codebusters assignment");
				}
				const { assignment } = await response.json();
				toast.success("Assignment created successfully!");
				onAssignmentCreated({ id: assignment.id, title: assignment.title });
				return;
			}

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
			if (isCodebusters) {
				await handleGenerateCodebustersPreview(settings.questionCount);
			} else {
				await handleGenerateQuestions();
			}
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

	const totalSteps = 4;

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
						{Array.from({ length: totalSteps }, (_, i) => i + 1).map(
							(stepNumber) => (
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
									{stepNumber < totalSteps && (
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
							),
						)}
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
