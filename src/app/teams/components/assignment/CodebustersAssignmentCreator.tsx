"use client";

import { useTeamFull } from "@/lib/hooks/useTeam";
import { useMemo } from "react";
import { type ReactElement, useState } from "react";
import { toast } from "react-toastify";
import { Step1Details } from "./CodebustersAssignmentCreator/components/Step1Details";
import { Step2Settings } from "./CodebustersAssignmentCreator/components/Step2Settings";
import { Step3Roster } from "./CodebustersAssignmentCreator/components/Step3Roster";
import { getAvailableCiphers } from "./CodebustersAssignmentCreator/utils/cipherConfig";
import { validateAssignmentCreation } from "./CodebustersAssignmentCreator/utils/validation";
import type {
	AssignmentCreatorProps,
	AssignmentDetails,
	QuestionGenerationSettings,
	RosterMember,
} from "./assignmentTypes";
import { createAssignment } from "./assignmentUtils";

interface CodebustersAssignmentCreatorProps extends AssignmentCreatorProps {
	darkMode?: boolean;
}

export default function CodebustersAssignmentCreator({
	teamId,
	subteamId,
	onAssignmentCreated,
	onCancel,
	darkMode = false,
	prefillEventName = "Codebusters",
}: CodebustersAssignmentCreatorProps) {
	const [step, setStep] = useState(1);
	const [_error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	// Assignment details
	const [details, setDetails] = useState<AssignmentDetails>({
		title: "",
		description: "",
		dueDate: "",
		points: 100,
		timeLimitMinutes: 15,
		eventName: prefillEventName,
	});

	// Codebusters-specific settings
	const [settings, setSettings] = useState<QuestionGenerationSettings>({
		questionCount: 3,
		questionType: "frq",
		idPercentage: 0,
		pureIdOnly: false,
		difficulties: ["any"], // Default to any difficulty
		cipherTypes: ["all"], // Default to "all"
		division: "any",
		charLengthMin: 50,
		charLengthMax: 200,
	});

	// Roster data
	const [selectedRoster, setSelectedRoster] = useState<string[]>([]);

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

	// Helper functions for member rendering
	const getMemberTextColor = (member: RosterMember): string => {
		return member.isLinked
			? darkMode
				? "text-white"
				: "text-gray-900"
			: darkMode
				? "text-gray-400"
				: "text-gray-500";
	};

	const renderMemberInfo = (member: RosterMember): ReactElement | null => {
		if (member.userEmail || member.username) {
			return (
				<div
					className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
				>
					{member.userEmail && <div>{member.userEmail}</div>}
					{member.username && <div>@{member.username}</div>}
				</div>
			);
		}
		return null;
	};

	// Available events

	// Roster members are now loaded from tRPC cache via useTeamFull hook above

	const handleDetailsChange = (newDetails: Partial<AssignmentDetails>) => {
		setDetails((prev) => ({ ...prev, ...newDetails }));
	};

	const handleSettingsChange = (
		newSettings: Partial<QuestionGenerationSettings>,
	) => {
		setSettings((prev) => ({ ...prev, ...newSettings }));
	};

	// Special handler for division changes that also updates cipher types
	const handleDivisionChange = (division: "B" | "C" | "any") => {
		setSettings((prev) => ({
			...prev,
			division,
			cipherTypes: ["all"], // Reset to "all" when division changes
		}));
	};

	const handleCreateAssignment = async () => {
		// Validate all requirements for assignment creation
		const validationError = validateAssignmentCreation(
			details,
			settings,
			selectedRoster,
		);
		if (validationError) {
			setError(validationError);
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const rosterMembersPayload = rosterMembers
				.filter((member) => selectedRoster.includes(member.student_name))
				.map((member) => ({
					user_id: member.user_id,
					student_name: member.student_name,
					display_name: member.student_name,
				}));

			const assignment = await createAssignment(teamId, subteamId, {
				title: details.title,
				description: details.description,
				assignment_type: "standard",
				due_date: details.dueDate,
				points: details.points ?? 100,
				time_limit_minutes: details.timeLimitMinutes,
				event_name: details.eventName,
				questions: [], // Questions are generated server-side for Codebusters
				roster_members: rosterMembersPayload,
				// Include Codebusters-specific parameters for dynamic generation
				codebusters_params: {
					questionCount: settings.questionCount,
					cipherTypes: settings.cipherTypes?.includes("all")
						? getAvailableCiphers(settings.division || "any")
						: settings.cipherTypes || [],
					division: settings.division || "any",
					charLengthMin: settings.charLengthMin || 50,
					charLengthMax: settings.charLengthMax || 200,
				},
			});

			toast.success("Codebusters assignment created successfully!");
			// Handle both return types: { assignment } or direct assignment
			const assignmentData =
				"assignment" in assignment ? assignment.assignment : assignment;
			onAssignmentCreated({
				id: assignmentData.id,
				title: assignmentData.title,
			});
		} catch (error) {
			setError(
				error instanceof Error ? error.message : "Failed to create assignment",
			);
		} finally {
			setLoading(false);
		}
	};

	const handleNext = () => {
		if (!details.title.trim()) {
			setError("Title is required");
			return;
		}
		if (!details.eventName) {
			setError("Event is required");
			return;
		}
		setError(null);
		setStep((prev) => prev + 1);
	};

	const handleRosterToggle = (memberName: string) => {
		if (selectedRoster.includes(memberName)) {
			setSelectedRoster((prev) => prev.filter((name) => name !== memberName));
		} else {
			setSelectedRoster((prev) => [...prev, memberName]);
		}
	};

	const renderStep = () => {
		switch (step) {
			case 1:
				return (
					<Step1Details
						details={details}
						darkMode={darkMode}
						onDetailsChange={handleDetailsChange}
						onNext={handleNext}
					/>
				);
			case 2:
				return (
					<Step2Settings
						details={details}
						settings={settings}
						darkMode={darkMode}
						onDetailsChange={handleDetailsChange}
						onSettingsChange={handleSettingsChange}
						onDivisionChange={handleDivisionChange}
						onBack={() => setStep(1)}
						onCreateAssignment={handleCreateAssignment}
						loading={loading}
					/>
				);
			case 3:
				return (
					<Step3Roster
						rosterMembers={rosterMembers}
						selectedRoster={selectedRoster}
						loadingRoster={loadingRoster}
						darkMode={darkMode}
						onRosterToggle={handleRosterToggle}
						getMemberTextColor={getMemberTextColor}
						renderMemberInfo={renderMemberInfo}
					/>
				);
			default:
				return null;
		}
	};

	return (
		<div
			className="fixed inset-0 flex items-center justify-center z-50"
			style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
			onClick={onCancel}
			onKeyDown={(e) => {
				if (e.key === "Escape") {
					onCancel();
				}
			}}
			tabIndex={-1}
		>
			<div
				className={`max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-lg ${
					darkMode ? "bg-gray-800" : "bg-white"
				}`}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.stopPropagation();
					}
				}}
				role="presentation"
			>
				<div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
					<h1
						className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
					>
						Create Codebusters Assignment
					</h1>
					<button
						type="button"
						onClick={onCancel}
						className="p-2 rounded-lg text-transparent hover:text-gray-400 dark:hover:text-gray-400 transition-colors"
						aria-label="Close modal"
					>
						<svg
							className="w-6 h-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							role="img"
							aria-label="Close"
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

				<div className="p-6">{renderStep()}</div>
			</div>
		</div>
	);
}
