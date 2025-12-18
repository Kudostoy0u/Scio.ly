/**
 * People Tab - Unified Version
 *
 * Reads from React Query shared cache.
 * No separate data fetching - everything comes from useTeamMembers.
 */

"use client";

import NamePromptModal from "@/app/components/NamePromptModal";
import { useAuth } from "@/app/contexts/AuthContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useInvalidateTeam, useTeamMembers } from "@/lib/hooks/useTeam";
import type { TeamMember as TeamMemberV2 } from "@/lib/server/teams-v2";
import type { TeamMember as StoreTeamMember } from "@/lib/stores/teams/types";
import {
	generateDisplayName,
	needsNamePrompt,
} from "@/lib/utils/content/displayNameUtils";
import { UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import type { Member } from "../types";
import EventAssignmentModal from "./EventAssignmentModal";
import InlineInvite from "./InlineInvite";
import MemberCard from "./MemberCard";
import { useMemberActions } from "./hooks/useMemberActions";
import { processMembers } from "./utils/processMembers";

interface PeopleTabProps {
	team: {
		id: string;
		school: string;
		division: "B" | "C";
		slug: string;
	};
	isCaptain: boolean;
	isAdmin?: boolean;
	activeSubteamId?: string | null;
	subteams?: Array<{
		id: string;
		name: string;
		team_id: string;
		description: string;
		created_at: string;
	}>;
	onSubteamChange?: (subteamId: string) => void;
}

export default function PeopleTabUnified({
	team,
	isCaptain,
	isAdmin = false,
	subteams = [],
}: PeopleTabProps) {
	const { darkMode } = useTheme();
	const { user } = useAuth();
	const [selectedSubteam, setSelectedSubteam] = useState<string>("all");
	const [linkingMemberId, setLinkingMemberId] = useState<string | null>(null);
	const [linkInput, setLinkInput] = useState("");

	const { data: members, isLoading } = useTeamMembers(
		team.slug,
		selectedSubteam === "all" ? undefined : selectedSubteam,
	);
	// TODO: Re-enable when linkAccount is implemented
	// const linkAccountMutation = trpc.teams.linkAccount.useMutation();

	const { updateTeamData } = useInvalidateTeam();

	const [showInlineInvite, setShowInlineInvite] = useState(false);
	const [linkInviteStates, setLinkInviteStates] = useState<
		Record<string, boolean>
	>({});
	const [pendingLinkInvites, setPendingLinkInvites] = useState<
		Record<string, boolean>
	>({});
	const [showEventModal, setShowEventModal] = useState(false);
	const [selectedMember, setSelectedMember] = useState<Member | null>(null);
	const [showSubteamDropdown, setShowSubteamDropdown] = useState<string | null>(
		null,
	);
	const [showNamePrompt, setShowNamePrompt] = useState(false);

	const normalizedMembers = useMemo<StoreTeamMember[]>(() => {
		const list = (members as TeamMemberV2[] | undefined) ?? [];
		return list.map((member) => ({
			...member,
			subteam: member.subteam?.id
				? {
						id: member.subteam.id,
						name: member.subteam.name ?? "",
						description: member.subteam.description ?? "",
					}
				: undefined,
			subteamId: member.subteamId ?? undefined,
		}));
	}, [members]);

	// Initialize pendingLinkInvites from server data when members change
	// This ensures pending link invites persist across tab navigation
	useEffect(() => {
		if (normalizedMembers.length > 0) {
			const serverPendingInvites: Record<string, boolean> = {};
			// Process members temporarily to get the correct display names
			// (same logic as processMembers uses)
			for (const member of normalizedMembers) {
				if (member.hasPendingLinkInvite) {
					let displayName = member.name;
					// Handle name transformation same way processMembers does
					if (!displayName || typeof displayName !== "string") {
						displayName = null;
					}
					if (needsNamePrompt(displayName)) {
						const emailLocal =
							member.email &&
							typeof member.email === "string" &&
							member.email.includes("@")
								? member.email.split("@")[0]
								: "";
						const { name: robust } = generateDisplayName(
							{
								displayName: null,
								firstName: null,
								lastName: null,
								username:
									member.username &&
									typeof member.username === "string" &&
									member.username.trim()
										? member.username.trim()
										: emailLocal && emailLocal.length > 2
											? emailLocal
											: null,
								email: member.email,
							},
							member.id || "",
						);
						if (robust?.trim()) {
							displayName = robust.trim();
						}
					}
					// Use the final display name
					const finalName =
						displayName ||
						member.email?.split("@")[0] ||
						member.username ||
						"Unknown";
					serverPendingInvites[finalName] = true;
				}
			}
			// Merge with existing state to preserve optimistic updates
			setPendingLinkInvites((prev) => ({ ...serverPendingInvites, ...prev }));
		}
	}, [normalizedMembers]);

	const filteredMembers = useMemo(() => {
		if (normalizedMembers.length === 0) {
			return [];
		}
		return processMembers(normalizedMembers, pendingLinkInvites, team.division);
	}, [normalizedMembers, pendingLinkInvites, team.division]);

	const {
		handleRemoveSelfFromSubteam,
		handleRemoveOtherFromSubteam,
		handleRemoveEvent,
		handleAddEvent,
		handleSubteamAssign,
		handleInviteSubmit,
		handleLinkInviteSubmit,
		handleCancelLinkInvite: originalHandleCancelLinkInvite,
		handleCancelInvitation,
		handleRemoveMember,
		handlePromoteToCaptain,
		handlePromoteToAdmin,
		handleDemoteCaptainToMember,
	} = useMemberActions({
		teamSlug: team.slug,
		selectedSubteam,
	});

	// Wrap handleCancelLinkInvite to also clear the pending state
	const handleCancelLinkInvite = useCallback(
		async (memberName: string) => {
			// Clear from local state immediately for optimistic update
			setPendingLinkInvites((prev) => {
				const updated = { ...prev };
				delete updated[memberName];
				return updated;
			});
			await originalHandleCancelLinkInvite(memberName);
		},
		[originalHandleCancelLinkInvite],
	);

	const handleNameClick = useCallback(
		(member: Member) => {
			if (member.id === user?.id) {
				setShowNamePrompt(true);
			}
		},
		[user?.id],
	);

	const handleNameUpdate = useCallback(() => {
		setShowNamePrompt(false);
	}, []);

	useEffect(() => {
		const onDisplayNameUpdated = (e: Event) => {
			const newName = (e as CustomEvent<string>).detail as string | undefined;
			if (!(newName && user?.id)) {
				return;
			}
			updateTeamData(team.slug, (prev) => {
				if (!prev) return prev;
				return {
					...prev,
					members: (prev.members ?? []).map((m) =>
						m.id === user.id ? { ...m, name: newName } : m,
					),
					rosterEntries: (prev.rosterEntries ?? []).map((r) =>
						r.userId === user.id ? { ...r, displayName: newName } : r,
					),
				};
			});
			setShowNamePrompt(false);
		};
		window.addEventListener(
			"scio-display-name-updated",
			onDisplayNameUpdated as EventListener,
		);
		return () => {
			window.removeEventListener(
				"scio-display-name-updated",
				onDisplayNameUpdated as EventListener,
			);
		};
	}, [team.slug, updateTeamData, user?.id]);

	useEffect(() => {
		if (!(user?.id && filteredMembers.length > 0)) {
			return;
		}
		const me = filteredMembers.find((m) => m.id === user.id);
		if (!me) {
			return;
		}
		if (me.name && needsNamePrompt(me.name)) {
			setShowNamePrompt(true);
		}
	}, [filteredMembers, user?.id]);

	const handleInvitePerson = () => setShowInlineInvite(true);
	const handleLinkInvite = (memberName: string) => {
		setLinkInviteStates((prev) => ({ ...prev, [memberName]: true }));
	};
	const handleLinkInviteClose = (memberName: string) => {
		setLinkInviteStates((prev) => ({ ...prev, [memberName]: false }));
	};
	const handleLinkInviteSubmitWrapper = async (
		memberName: string,
		username: string,
	) => {
		try {
			await handleLinkInviteSubmit(memberName, username);
			setPendingLinkInvites((prev) => ({ ...prev, [memberName]: true }));
			setLinkInviteStates((prev) => ({ ...prev, [memberName]: false }));
		} catch {
			// Error is already handled in handleLinkInviteSubmit
		}
	};

	const handleEventSelect = async (eventName: string, subteamId: string) => {
		if (!selectedMember) {
			return;
		}

		let finalSubteamId = subteamId || selectedMember.subteamId;
		if (!finalSubteamId || finalSubteamId.trim() === "") {
			const matchingSubteam = subteams.find(
				(s) => s.name === selectedMember.subteam?.name,
			);
			if (matchingSubteam) {
				finalSubteamId = matchingSubteam.id;
			} else if (selectedMember.subteam?.id) {
				finalSubteamId = selectedMember.subteam.id;
			} else {
				alert("This member needs to be assigned to a subteam first.");
				return;
			}
		}

		await handleAddEvent(selectedMember, eventName, finalSubteamId);
		setShowEventModal(false);
		setSelectedMember(null);
	};

	const handleLinkAccount = async () => {
		if (!linkingMemberId || !user?.id || linkingMemberId !== user.id) {
			toast.error("You can only link your own account");
			return;
		}
		if (!linkInput.trim()) {
			toast.error("Enter a username to link");
			return;
		}
		try {
			// TODO: Re-enable when linkAccount is implemented
			// await linkAccountMutation.mutateAsync({ username: linkInput.trim() });
			toast.error("Account linking is temporarily disabled");
			setLinkingMemberId(null);
			setLinkInput("");
			// await handleRefresh();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to link account",
			);
		}
	};

	const handleAddEventClick = (member: Member) => {
		setSelectedMember(member);
		setShowEventModal(true);
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2
					className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
				>
					People
				</h2>
				{isCaptain && (
					<button
						type="button"
						onClick={handleInvitePerson}
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						<UserPlus className="w-4 h-4 mr-2 inline" />
						<span>Invite by username</span>
					</button>
				)}
			</div>

			{showInlineInvite && (
				<InlineInvite
					isOpen={showInlineInvite}
					onClose={() => setShowInlineInvite(false)}
					onSubmit={handleInviteSubmit}
				/>
			)}

			{subteams.length > 0 && (
				<div className="flex items-center space-x-2">
					<select
						value={selectedSubteam}
						onChange={(e) => setSelectedSubteam(e.target.value)}
						className={`px-3 py-2 rounded-lg border text-sm font-medium ${
							darkMode
								? "bg-gray-800 text-white border-gray-600"
								: "bg-white text-gray-900 border-gray-300"
						}`}
					>
						<option value="all">All Subteams</option>
						{subteams.map((subteam) => (
							<option key={subteam.id} value={subteam.id}>
								{subteam.name}
							</option>
						))}
					</select>
				</div>
			)}

			{filteredMembers.find((m) => m.id === user?.id && m.isUnlinked) && (
				<div
					className={`rounded-lg border p-4 ${
						darkMode
							? "border-gray-700 bg-gray-800"
							: "border-gray-200 bg-white"
					}`}
				>
					<p className="text-sm font-medium">
						Account not linked. Set your Supabase username to link:
					</p>
					<div className="mt-2 flex flex-col sm:flex-row gap-2">
						<input
							type="text"
							value={linkInput}
							onChange={(e) => setLinkInput(e.target.value)}
							placeholder="Supabase username"
							className={`flex-1 rounded-md border px-3 py-2 text-sm ${
								darkMode
									? "bg-gray-700 border-gray-600 text-white"
									: "bg-white border-gray-300 text-gray-900"
							}`}
						/>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => {
									setLinkingMemberId(user?.id ?? null);
									handleLinkAccount();
								}}
								className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
							>
								Link
							</button>
							<button
								type="button"
								onClick={() => {
									setLinkingMemberId(null);
									setLinkInput("");
								}}
								className="rounded-md bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}

			<div>
				<h3
					className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}
				>
					Team Members
				</h3>

				{isLoading ? (
					<div className="text-center py-12">Loading members...</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
						{filteredMembers.length === 0 ? (
							<div
								className={`col-span-full text-center py-12 ${
									darkMode ? "text-gray-400" : "text-gray-500"
								}`}
							>
								No members found
							</div>
						) : (
							filteredMembers.map((member, index) => (
								<MemberCard
									key={member.id ?? member.name}
									member={member}
									index={index}
									isCaptain={isCaptain}
									isAdmin={isAdmin}
									subteams={subteams}
									selectedMember={selectedMember}
									onNameClick={handleNameClick}
									onRemoveSelfFromSubteam={handleRemoveSelfFromSubteam}
									onRemoveFromSubteam={(person, subteamId, _subteamName) =>
										handleRemoveOtherFromSubteam(person, subteamId)
									}
									onRemoveMember={handleRemoveMember}
									onRemoveEvent={(person, event, subteamId, _subteamName) =>
										handleRemoveEvent(person, event, subteamId)
									}
									onAddEvent={handleAddEventClick}
									onPromoteToCaptain={handlePromoteToCaptain}
									onPromoteToAdmin={handlePromoteToAdmin}
									onDemoteCaptainToMember={handleDemoteCaptainToMember}
									onSubteamAssign={handleSubteamAssign}
									showSubteamDropdown={showSubteamDropdown}
									onSubteamDropdownToggle={setShowSubteamDropdown}
									onSetSelectedMember={setSelectedMember}
									onLinkInvite={handleLinkInvite}
									linkInviteStates={linkInviteStates}
									onLinkInviteSubmit={(memberName, username) =>
										handleLinkInviteSubmitWrapper(memberName, username)
									}
									onLinkInviteClose={handleLinkInviteClose}
									onCancelLinkInvite={handleCancelLinkInvite}
									onCancelInvitation={handleCancelInvitation}
								/>
							))
						)}
					</div>
				)}
			</div>

			{showEventModal && selectedMember && (
				<EventAssignmentModal
					isOpen={showEventModal}
					selectedMember={selectedMember}
					subteamId={
						selectedMember?.subteamId || selectedMember?.subteam?.id || ""
					}
					onClose={() => {
						setShowEventModal(false);
						setSelectedMember(null);
					}}
					onSelectEvent={handleEventSelect}
					division={team.division}
				/>
			)}

			{showNamePrompt && (
				<NamePromptModal
					isOpen={showNamePrompt}
					onClose={() => setShowNamePrompt(false)}
					currentName={(() => {
						if (!user) {
							return "";
						}
						const member = filteredMembers.find((m) => m.id === user.id);
						if (
							member?.name &&
							typeof member.name === "string" &&
							member.name.trim()
						) {
							return member.name;
						}
						return generateDisplayName(user).name;
					})()}
					onSave={() => {
						handleNameUpdate();
					}}
				/>
			)}
		</div>
	);
}
