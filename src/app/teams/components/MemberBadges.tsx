"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import logger from "@/lib/utils/logger";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import type { Member } from "../types";

interface MemberBadgesProps {
	member: Member;
	isCaptain: boolean;
	subteams: Array<{
		id: string;
		name: string;
		team_id: string;
		description: string;
		created_at: string;
	}>;
	showSubteamDropdown: string | null;
	selectedMember: Member | null;
	onRemoveFromSubteam: (
		member: Member,
		subteamId: string,
		subteamName: string,
	) => Promise<void>;
	onRemoveSelfFromSubteam: (subteamId: string) => Promise<void>;
	onRemoveEvent: (
		member: Member,
		event: string,
		subteamId: string,
		subteamName: string,
	) => Promise<void>;
	onAddEvent: (member: Member) => void;
	onSubteamAssign: (member: Member, subteamId: string) => Promise<void>;
	onSubteamDropdownToggle: (memberId: string | null) => void;
	onSetSelectedMember: (member: Member | null) => void;
}

export default function MemberBadges({
	member,
	isCaptain,
	showSubteamDropdown,
	onRemoveFromSubteam,
	onRemoveSelfFromSubteam,
	onRemoveEvent,
	onAddEvent,
	onSubteamDropdownToggle,
	onSetSelectedMember,
}: MemberBadgesProps) {
	const { darkMode } = useTheme();
	const { user } = useAuth();

	// Create a list of all events with their subteams
	const eventsWithSubteams: Array<{
		event: string;
		subteam: string;
		subteamId: string;
	}> = [];

	// If member has multiple subteams, show each event for each subteam it appears in
	if (member.subteams && member.subteams.length > 0) {
		for (const subteam of member.subteams as Array<{
			id: string;
			name: string;
			description: string;
			events?: string[];
		}>) {
			if (subteam.events) {
				for (const event of subteam.events) {
					eventsWithSubteams.push({
						event,
						subteam: subteam.name,
						subteamId: subteam.id,
					});
				}
			}
		}
	} else if (member.subteam) {
		// Fallback for single subteam
		for (const event of member.events) {
			eventsWithSubteams.push({
				event,
				subteam: member.subteam?.name || "Unknown",
				subteamId: member.subteam?.id || "",
			});
		}
	}

	// Filter out "General" events if there are specific events
	const hasSpecificEvents = eventsWithSubteams.some(
		(e) => e.event !== "General",
	);
	const filteredEvents = hasSpecificEvents
		? eventsWithSubteams.filter((e) => e.event !== "General")
		: eventsWithSubteams;

	// Check if person is only on one subteam
	const uniqueSubteams = [...new Set(filteredEvents.map((e) => e.subteamId))];
	const isSingleSubteam = uniqueSubteams.length === 1;

	// Always show at least one badge - if no subteam, show "Unknown"
	const subteamsToShow =
		member.subteams && member.subteams.length > 0
			? member.subteams
			: member.subteam
				? [member.subteam]
				: [{ id: null, name: "Unknown", description: "" }];

	return (
		<div className="flex flex-wrap gap-1 gap-y-2 justify-center">
			{/* Subteam badges */}
			{subteamsToShow
				.filter((s) => s !== null && s !== undefined)
				.map((subteam, index) => (
					<div key={subteam?.id || index} className="relative group">
						<div
							className={`px-2 py-1 rounded-full text-xs font-medium border ${
								darkMode
									? "bg-green-900 text-green-300 border-green-700"
									: "bg-green-100 text-green-800 border-green-200"
							}`}
						>
							{subteam?.name || "Unknown"}
							{/* Show "set?" for captains when subteam is "Unknown" */}
							{isCaptain &&
								member.id &&
								(subteam?.name === "Unknown team" ||
									subteam?.name === "Unknown" ||
									!subteam?.name) && (
									<span
										className="cursor-pointer"
										onClick={() => {
											onSetSelectedMember(member);
											onSubteamDropdownToggle(
												showSubteamDropdown === member.id ? null : member.id,
											);
										}}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												onSetSelectedMember(member);
												onSubteamDropdownToggle(
													showSubteamDropdown === member.id ? null : member.id,
												);
											}
										}}
										title="Set subteam for this user"
									>
										<span>,</span>
										<span className="text-blue-600 hover:text-blue-800">
											{" "}
											set?
										</span>
									</span>
								)}
						</div>
						{subteam?.id && (isCaptain || member.id === user?.id) && (
							<button
								type="button"
								onClick={async () => {
									try {
										if (member.id === user?.id) {
											await onRemoveSelfFromSubteam(subteam.id);
										} else {
											await onRemoveFromSubteam(
												member,
												subteam.id,
												subteam.name,
											);
										}
									} catch (e: unknown) {
										logger.error("Failed to remove from subteam:", e);
										const errorMessage =
											(e instanceof Error ? e.message : String(e)) ||
											"Failed to remove from subteam";
										toast.error(errorMessage);
									}
								}}
								className={`absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity px-1 py-0.5 rounded ${
									darkMode ? "bg-red-600 text-white" : "bg-red-600 text-white"
								}`}
								title={
									member.id === user?.id
										? "Remove yourself from this subteam"
										: "Remove subteam badge"
								}
							>
								<X className="w-3 h-3" />
							</button>
						)}
					</div>
				))}

			{/* Event badges */}
			{filteredEvents.map((eventData, eventIndex) => (
				<div
					key={`${eventData.event}-${eventData.subteamId}-${eventIndex}`}
					className="relative group"
				>
					<span
						className={`px-2 py-1 rounded-full text-xs font-medium border ${
							darkMode
								? "bg-blue-900 text-blue-300 border-blue-700"
								: "bg-blue-100 text-blue-800 border-blue-200"
						}`}
					>
						{isSingleSubteam
							? eventData.event
							: `${eventData.event} - ${eventData.subteam}`}
					</span>
					{isCaptain && (
						<button
							type="button"
							onClick={async () => {
								await onRemoveEvent(
									member,
									eventData.event,
									eventData.subteamId,
									eventData.subteam,
								);
							}}
							className={`absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity px-1 py-0.5 rounded ${
								darkMode ? "bg-red-600 text-white" : "bg-red-600 text-white"
							}`}
							title={`Remove ${eventData.event} from ${eventData.subteam}`}
						>
							<X className="w-3 h-3" />
						</button>
					)}
				</div>
			))}

			{/* Add event badge for captains - works for both linked and unlinked members */}
			{isCaptain &&
				member.subteam &&
				member.subteam.name !== "Unknown team" &&
				member.subteam.name !== "Unknown" && (
					<button
						type="button"
						onClick={() => onAddEvent(member)}
						className={`px-2 py-1 rounded-full text-xs font-medium border ${
							darkMode
								? "bg-purple-900 text-purple-300 border-purple-700 hover:bg-purple-800"
								: "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200"
						}`}
						title="Add this user to an event"
					>
						Add event?
					</button>
				)}
		</div>
	);
}
