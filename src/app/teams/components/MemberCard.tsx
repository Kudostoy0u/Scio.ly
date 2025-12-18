"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import {
	generateDisplayName,
	needsNamePrompt,
} from "@/lib/utils/content/displayNameUtils";
import {
	AlertTriangle,
	ArrowDownCircle,
	ArrowUpCircle,
	Crown,
	Edit3,
	UserStar,
	X,
} from "lucide-react";
import type { Member } from "../types";
import { getDisplayName } from "../utils/displayNameUtils";
import LinkInvite from "./LinkInvite";
import LinkStatus from "./LinkStatus";
import MemberBadges from "./MemberBadges";
import SubteamDropdown from "./SubteamDropdown";

interface MemberCardProps {
	member: Member;
	index: number;
	isCaptain: boolean;
	isAdmin: boolean;
	subteams: Array<{
		id: string;
		name: string;
		team_id: string;
		description: string;
		created_at: string;
	}>;
	showSubteamDropdown: string | null;
	selectedMember: Member | null;
	onNameClick: (member: Member) => void;
	onPromoteToCaptain: (member: Member) => void;
	onPromoteToAdmin: (member: Member) => void;
	onDemoteCaptainToMember: (member: Member) => void;
	onRemoveMember: (member: Member) => void;
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
	linkInviteStates: Record<string, boolean>;
	onLinkInvite: (memberName: string) => void;
	onLinkInviteClose: (memberName: string) => void;
	onLinkInviteSubmit: (memberName: string, username: string) => Promise<void>;
	onCancelLinkInvite: (memberName: string) => Promise<void>;
	onCancelInvitation: (member: Member) => Promise<void>;
}

export default function MemberCard({
	member,
	index,
	isCaptain,
	isAdmin,
	subteams,
	showSubteamDropdown,
	selectedMember,
	onNameClick,
	onPromoteToCaptain,
	onPromoteToAdmin,
	onDemoteCaptainToMember,
	onRemoveMember,
	onRemoveFromSubteam,
	onRemoveSelfFromSubteam,
	onRemoveEvent,
	onAddEvent,
	onSubteamAssign,
	onSubteamDropdownToggle,
	onSetSelectedMember,
	linkInviteStates,
	onLinkInvite,
	onLinkInviteClose,
	onLinkInviteSubmit,
	onCancelLinkInvite,
	onCancelInvitation,
}: MemberCardProps) {
	const { darkMode } = useTheme();
	const { user } = useAuth();

	const isShowingLinkInvite = linkInviteStates[getDisplayName(member)] === true;

	const RoleIcon = ({
		label,
		children,
	}: {
		label: string;
		children: React.ReactNode;
	}) => (
		<div className="relative group">
			<span
				className={`inline-flex items-center justify-center p-1 rounded-md transition-all duration-200 ${
					darkMode
						? "hover:bg-gray-700 text-gray-300"
						: "hover:bg-gray-100 text-gray-600"
				}`}
				aria-label={label}
				title={label}
			>
				{children}
			</span>
			<div
				className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${
					darkMode
						? "bg-gray-800 text-white border border-gray-700"
						: "bg-white text-gray-900 border border-gray-200 shadow-lg"
				}`}
			>
				{label}
				<div
					className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
						darkMode ? "border-t-gray-800" : "border-t-white"
					}`}
				/>
			</div>
		</div>
	);

	return (
		<div
			key={member.id || `member-${index}`}
			className={`p-4 rounded-lg border relative ${
				darkMode
					? "bg-gray-800 border-gray-700 hover:bg-gray-750"
					: "bg-white border-gray-200 hover:bg-gray-50"
			} transition-colors`}
		>
			{/* Link Invitation Form - Replaces entire card */}
			{isShowingLinkInvite ? (
				<LinkInvite
					isOpen={true}
					onClose={() => onLinkInviteClose(getDisplayName(member))}
					onSubmit={(username) =>
						onLinkInviteSubmit(getDisplayName(member), username)
					}
					studentName={getDisplayName(member)}
				/>
			) : (
				<>
					{/* Action buttons for captains */}
					{isCaptain && member.id !== user?.id && (
						<div className="absolute top-2 right-2 flex items-center space-x-1">
							{/* Promote to captain button */}
							{isAdmin && member.role === "member" && member.id && (
								<button
									type="button"
									onClick={() => onPromoteToCaptain(member)}
									className={`p-1 rounded transition-colors ${
										darkMode
											? "text-gray-400 hover:text-yellow-400 hover:bg-gray-700"
											: "text-gray-500 hover:text-yellow-500 hover:bg-gray-100"
									}`}
									title={`Promote ${member.name} to captain`}
								>
									<ArrowUpCircle className="w-5 h-5" />
								</button>
							)}

							{/* Demote captain to member */}
							{isAdmin && member.role === "captain" && member.id && (
								<button
									type="button"
									onClick={() => onDemoteCaptainToMember(member)}
									className={`p-1 rounded transition-colors ${
										darkMode
											? "text-gray-400 hover:text-orange-300 hover:bg-gray-700"
											: "text-gray-500 hover:text-orange-500 hover:bg-gray-100"
									}`}
									title={`Demote ${member.name} to member`}
								>
									<ArrowDownCircle className="w-5 h-5" />
								</button>
							)}

							{/* Promote captain to admin */}
							{isAdmin && member.role === "captain" && member.id && (
								<button
									type="button"
									onClick={() => onPromoteToAdmin(member)}
									className={`p-1 rounded transition-colors ${
										darkMode
											? "text-gray-400 hover:text-orange-300 hover:bg-gray-700"
											: "text-gray-500 hover:text-orange-500 hover:bg-gray-100"
									}`}
									title={`Promote ${member.name} to admin`}
								>
									<UserStar className="w-5 h-5" />
								</button>
							)}

							{/* Remove button */}
							{(member.role === "member" ||
								(isAdmin && member.role === "captain")) && (
								<button
									type="button"
									onClick={() => onRemoveMember(member)}
									className={`p-1 rounded transition-colors ${
										darkMode
											? "text-gray-400 hover:text-red-400 hover:bg-gray-700"
											: "text-gray-500 hover:text-red-500 hover:bg-gray-100"
									}`}
									title={`Remove ${member.name} from team`}
								>
									<X className="w-5 h-5" />
								</button>
							)}
						</div>
					)}
					<div className="flex flex-col items-center text-center space-y-3">
						{/* Profile Picture */}
						<div className="relative">
							<div
								className={`w-16 h-16 rounded-full flex items-center justify-center ${darkMode ? "bg-gray-600" : "bg-gray-300"}`}
							>
								{member.avatar ? (
									<div
										className="w-16 h-16 rounded-full bg-cover bg-center"
										style={{ backgroundImage: `url(${member.avatar})` }}
									/>
								) : (
									<span
										className={`font-medium text-xl ${darkMode ? "text-gray-300" : "text-gray-600"}`}
									>
										{getDisplayName(member).charAt(0).toUpperCase()}
									</span>
								)}
							</div>
							{member.isOnline && (
								<div
									className={`absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 rounded-full ${darkMode ? "border-gray-800" : "border-white"}`}
								/>
							)}
						</div>

						{/* Name and Role */}
						<div>
							<div className="flex items-center justify-center space-x-2">
								<div className="flex items-center space-x-1">
									<h3
										className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"} ${
											member.id === user?.id
												? "cursor-pointer hover:opacity-80 transition-opacity"
												: ""
										}`}
										onClick={() => onNameClick(member)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												onNameClick(member);
											}
										}}
										tabIndex={member.id === user?.id ? 0 : undefined}
										title={
											member.id === user?.id
												? "Click to edit your name"
												: undefined
										}
									>
										{(() => {
											// For the current user, if name is weak, show a better fallback immediately
											if (
												member.id === user?.id &&
												needsNamePrompt(member.name)
											) {
												const emailLocal = user?.email?.split("@")[0] || "";
												const { name: robust } = generateDisplayName(
													{
														displayName: null,
														firstName: null,
														lastName: null,
														username:
															emailLocal && emailLocal.length > 2
																? emailLocal
																: null,
														email: user?.email || null,
													},
													user?.id,
												);
												return robust || getDisplayName(member);
											}
											return getDisplayName(member);
										})()}
										{member.id === user?.id && (
											<span
												className={`ml-2 text-xs font-normal ${darkMode ? "text-gray-400" : "text-gray-500"}`}
											>
												(me)
											</span>
										)}
									</h3>
									{member.id === user?.id && (
										<button
											type="button"
											onClick={() => onNameClick(member)}
											title="Edit your name"
											className="p-0.5 rounded cursor-pointer hover:opacity-80"
											aria-label="Edit your name"
										>
											<Edit3 className="w-3 h-3 opacity-60" />
										</button>
									)}
								</div>
								{member.role === "admin" ? (
									<RoleIcon label="Admin">
										<UserStar className="w-4 h-4 text-orange-400" />
									</RoleIcon>
								) : member.role === "captain" ? (
									<RoleIcon label="Captain">
										<Crown className="w-4 h-4 text-yellow-500" />
									</RoleIcon>
								) : null}
								{member.conflicts && member.conflicts.length > 0 && (
									<div className="relative group">
										<AlertTriangle className="w-4 h-4 text-orange-500" />
										<div
											className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap z-10 ${
												darkMode
													? "bg-gray-800 text-white border border-gray-700"
													: "bg-white text-gray-900 border border-gray-200 shadow-lg"
											} opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none`}
										>
											<div className="font-medium mb-1">Event Conflicts:</div>
											{member.conflicts.map((conflict, conflictIndex) => (
												<div
													key={`conflict-${conflict.conflictBlockNumber}-${conflictIndex}`}
													className="text-xs"
												>
													Conflict Block {conflict.conflictBlockNumber}:{" "}
													{conflict.events.join(", ")}
												</div>
											))}
											<div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800 dark:border-t-gray-700" />
										</div>
									</div>
								)}
							</div>
							{member.username && (
								<p
									className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
								>
									@{member.username}
								</p>
							)}
						</div>

						{/* All Badges - Subteams, Events, and Add Event */}
						{!member.isPendingInvitation && (
							<MemberBadges
								member={member}
								isCaptain={isCaptain}
								subteams={subteams}
								showSubteamDropdown={showSubteamDropdown}
								selectedMember={selectedMember}
								onRemoveFromSubteam={onRemoveFromSubteam}
								onRemoveSelfFromSubteam={onRemoveSelfFromSubteam}
								onRemoveEvent={onRemoveEvent}
								onAddEvent={onAddEvent}
								onSubteamAssign={onSubteamAssign}
								onSubteamDropdownToggle={onSubteamDropdownToggle}
								onSetSelectedMember={onSetSelectedMember}
							/>
						)}

						{/* Subteam assignment dropdown */}
						{showSubteamDropdown === member.id && selectedMember && (
							<SubteamDropdown
								subteams={subteams}
								selectedMember={selectedMember}
								onSubteamAssign={onSubteamAssign}
								onClose={() => {
									onSubteamDropdownToggle(null);
									onSetSelectedMember(null);
								}}
							/>
						)}

						{/* Link Status */}
						<LinkStatus
							member={member}
							isCaptain={isCaptain}
							onLinkInvite={onLinkInvite}
							onCancelLinkInvite={onCancelLinkInvite}
							onCancelInvitation={onCancelInvitation}
						/>
					</div>
				</>
			)}
		</div>
	);
}
