"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import TeamCalendar from "@/app/teams/components/TeamCalendar";
import TeamLayout from "@/app/teams/components/TeamLayout";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";

export default function CalendarPage() {
	const { darkMode } = useTheme();
	const { user } = useAuth();
	const router = useRouter();

	const { data, isLoading } = trpc.teams.listUserTeams.useQuery(undefined, {
		enabled: !!user?.id,
	});

	const userTeams =
		data?.teams.map((team) => ({
			id: team.id,
			slug: team.slug,
			name: team.name || `${team.school} ${team.division}`,
			school: team.school,
			division: (team.division ?? "C") as "B" | "C",
			user_role: team.role || "member",
		})) ?? [];

	const isCaptain = userTeams.some(
		(team) => team.user_role === "captain" || team.user_role === "admin",
	);

	const handleTabChange = (tab: "home" | "upcoming" | "settings") => {
		if (tab === "home") {
			router.push("/teams");
		} else if (tab === "upcoming") {
			// Already on calendar page
		} else if (tab === "settings") {
			router.push("/teams?tab=settings");
		}
	};

	const handleTeamSelect = (team: {
		id: string;
		name: string;
		slug: string;
		school: string;
		division: "B" | "C";
	}) => {
		router.push(`/teams/${team.slug}`);
	};

	const handleNavigateToMainDashboard = () => {
		router.push("/teams?view=all");
	};

	if (isLoading) {
		return (
			<div
				className={`min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}
			>
				<div className="flex items-center justify-center h-screen">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
						<p
							className={`text-lg ${darkMode ? "text-gray-300" : "text-gray-600"}`}
						>
							Loading calendar...
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<TeamLayout
			activeTab="upcoming"
			onTabChangeAction={handleTabChange}
			userTeams={userTeams}
			onTeamSelect={handleTeamSelect}
			onNavigateToMainDashboard={handleNavigateToMainDashboard}
		>
			<div className="max-w-7xl mx-auto">
				<TeamCalendar
					teamId={undefined}
					isCaptain={isCaptain}
					teamSlug={undefined}
				/>
			</div>
		</TeamLayout>
	);
}
