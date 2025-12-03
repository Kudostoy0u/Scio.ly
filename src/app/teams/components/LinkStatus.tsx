"use client";

import { Link, Link2Off, UserPlus } from "lucide-react";
import type { Member } from "../types";
import { getDisplayName } from "../utils/displayNameUtils";

interface LinkStatusProps {
	member: Member;
	isCaptain: boolean;
	onLinkInvite: (memberName: string) => void;
	onCancelLinkInvite: (memberName: string) => Promise<void>;
	onCancelInvitation: (member: Member) => Promise<void>;
}

export default function LinkStatus({
	member,
	isCaptain,
	onLinkInvite,
	onCancelLinkInvite,
	onCancelInvitation,
}: LinkStatusProps) {
	if (member.isPendingInvitation) {
		return (
			<div className="flex items-center space-x-2">
				<div className="flex items-center space-x-1 text-yellow-600">
					<UserPlus className="w-4 h-4" />
					<span className="text-xs font-medium">Invite Pending</span>
				</div>
				{isCaptain && (
					<button
						type="button"
						onClick={() => onCancelInvitation(member)}
						className="text-red-600 hover:text-red-700 text-xs font-medium transition-colors"
					>
						Cancel?
					</button>
				)}
			</div>
		);
	}

	if (member.hasPendingInvite) {
		return (
			<div className="flex items-center space-x-1 text-yellow-600">
				<UserPlus className="w-4 h-4" />
				<span className="text-xs font-medium">Invite Pending</span>
			</div>
		);
	}

	if (member.hasPendingLinkInvite) {
		return (
			<div className="flex items-center space-x-2">
				<div className="flex items-center space-x-1 text-yellow-600">
					<UserPlus className="w-4 h-4" />
					<span className="text-xs font-medium">Link Pending</span>
				</div>
				{isCaptain && (
					<button
						type="button"
						onClick={() => onCancelLinkInvite(getDisplayName(member))}
						className="text-red-600 hover:text-red-700 text-xs font-medium transition-colors"
					>
						Cancel?
					</button>
				)}
			</div>
		);
	}

	if (member.isUnlinked) {
		return (
			<div className="flex items-center space-x-2">
				<div className="flex items-center space-x-1 text-red-500">
					<Link2Off className="w-4 h-4" />
					<span className="text-xs">Unlinked</span>
				</div>
				{isCaptain && (
					<button
						type="button"
						onClick={() => onLinkInvite(getDisplayName(member))}
						className="text-blue-600 hover:text-blue-700 text-xs font-medium transition-colors"
					>
						Link?
					</button>
				)}
			</div>
		);
	}

	if (member.id) {
		return (
			<div className="flex items-center space-x-1 text-green-600">
				<Link className="w-4 h-4" />
				<span className="text-xs font-medium">Linked</span>
			</div>
		);
	}

	return null;
}
