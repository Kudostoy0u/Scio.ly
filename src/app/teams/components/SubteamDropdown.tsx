"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import type { Member } from "../types";

interface SubteamDropdownProps {
	subteams: Array<{
		id: string;
		name: string;
		team_id: string;
		description: string;
		created_at: string;
	}>;
	selectedMember: Member;
	onSubteamAssign: (member: Member, subteamId: string) => Promise<void>;
	onClose: () => void;
}

export default function SubteamDropdown({
	subteams,
	selectedMember,
	onSubteamAssign,
	onClose,
}: SubteamDropdownProps) {
	const { darkMode } = useTheme();

	return (
		<div className="mt-2">
			<div
				className={`relative inline-block text-left ${darkMode ? "bg-gray-800" : "bg-white"} border ${darkMode ? "border-gray-600" : "border-gray-300"} rounded-md shadow-lg`}
			>
				<div className="py-1">
					{subteams.map((subteam) => (
						<button
							type="button"
							key={subteam.id}
							onClick={async () => {
								await onSubteamAssign(selectedMember, subteam.id);
								onClose();
							}}
							className={`w-full text-left px-4 py-2 text-sm ${darkMode ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}
						>
							{subteam.name}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
