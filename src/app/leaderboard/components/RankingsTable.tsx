/**
 * Component for displaying leaderboard rankings
 */

import { getAvatarInitial } from "@/lib/utils/content/displayNameUtils";
import { LogOut } from "lucide-react";
import Image from "next/image";
import type { LeaderboardMember, UserProfile } from "../types";

interface RankingsTableProps {
	members: LeaderboardMember[];
	user: UserProfile | null;
	onLeave: () => void;
	darkMode: boolean;
}

export function RankingsTable({
	members,
	user,
	onLeave,
	darkMode,
}: RankingsTableProps) {
	return (
		<div
			className={`rounded-lg p-6 ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"} shadow-sm`}
		>
			<div className="flex justify-between items-center mb-6">
				<h2
					className={`text-2xl font-semibold ${darkMode ? "" : "text-gray-900"}`}
				>
					Rankings
				</h2>
				<button
					type="button"
					onClick={onLeave}
					className={`${darkMode ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-700"} flex items-center gap-2`}
				>
					<LogOut className="w-4 h-4" />
					Leave
				</button>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr
							className={`border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}
						>
							<th
								className={`text-left py-3 px-4 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
							>
								Rank
							</th>
							<th
								className={`text-left py-3 px-4 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
							>
								Name
							</th>
							<th
								className={`text-right py-3 px-4 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
							>
								Correct
							</th>
							<th
								className={`text-right py-3 px-4 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
							>
								Attempted
							</th>
							<th
								className={`text-right py-3 px-4 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
							>
								Accuracy
							</th>
						</tr>
					</thead>
					<tbody>
						{members.map((member) => (
							<tr
								key={member.user_id}
								className={`border-b ${darkMode ? "border-gray-700" : "border-gray-200"} ${
									member.user_id === user?.id
										? darkMode
											? "bg-blue-900/10"
											: "bg-blue-50"
										: ""
								}`}
							>
								<td className="py-3 px-4">
									{member.rank === 1 && "🥇"}
									{member.rank === 2 && "🥈"}
									{member.rank === 3 && "🥉"}
									{member.rank && member.rank > 3 && member.rank}
								</td>
								<td className="py-3 px-4 font-medium">
									<div className="flex items-center gap-3">
										{member.photo_url ? (
											<Image
												src={member.photo_url}
												alt="Profile"
												width={24}
												height={24}
												className="w-6 h-6 rounded-full"
												unoptimized={true}
												onError={(e) => {
													const target = e.target as HTMLImageElement;
													target.style.display = "none";
													const fallback =
														target.nextElementSibling as HTMLElement;
													if (fallback) {
														fallback.style.display = "flex";
													}
												}}
											/>
										) : null}
										<div
											className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs"
											style={{ display: member.photo_url ? "none" : "flex" }}
										>
											{getAvatarInitial(
												member.display_name || "",
												member.email,
											)}
										</div>
										<span>
											{member.display_name ||
												(member.email?.includes("@")
													? `@${member.email.split("@")[0]}`
													: "@unknown")}
											{member.user_id === user?.id && " (You)"}
										</span>
									</div>
								</td>
								<td className="text-right py-3 px-4">
									{member.correct_answers}
								</td>
								<td className="text-right py-3 px-4">
									{member.questions_attempted}
								</td>
								<td className="text-right py-3 px-4">
									{member.accuracy_percentage}%
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
