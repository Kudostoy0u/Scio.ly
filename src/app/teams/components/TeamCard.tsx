import { useTheme } from "@/app/contexts/ThemeContext";
import { Users } from "lucide-react";

interface TeamMember {
	role: string;
}

interface Team {
	id: string;
	name: string;
	slug: string;
	school: string;
	division: "B" | "C";
	members: TeamMember[];
}

interface TeamCardProps {
	team: Team;
	onClick: (teamSlug: string) => void;
}

export function TeamCard({ team, onClick }: TeamCardProps) {
	const { darkMode } = useTheme();

	return (
		<button
			type="button"
			className={`w-full text-left p-6 rounded-lg border cursor-pointer transition-all hover:shadow-[0_0_20px_rgba(0,0,0,0.15)] ${
				darkMode
					? "bg-gray-800 border-gray-700 hover:border-gray-600"
					: "bg-white border-gray-200 hover:border-gray-300"
			}`}
			onClick={() => onClick(team.slug)}
			aria-label={`View ${team.school} team`}
		>
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center space-x-3">
					<div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
						<Users className="w-6 h-6 text-blue-600" />
					</div>
					<div>
						<h3
							className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
						>
							{team.school}
						</h3>
						<p
							className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
						>
							Division {team.division}
						</p>
					</div>
				</div>
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<span
						className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
					>
						Members
					</span>
					<span
						className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
					>
						{team.members.length}
					</span>
				</div>
				<div className="flex items-center justify-between">
					<span
						className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
					>
						Leaders
					</span>
					<span
						className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
					>
						{
							team.members.filter(
								(m) => m.role === "captain" || m.role === "admin",
							).length
						}
					</span>
				</div>
			</div>
		</button>
	);
}
