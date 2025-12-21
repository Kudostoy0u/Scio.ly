"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import TeamCalendar from "@/app/teams/components/TeamCalendar";
import TeamLayout from "@/app/teams/components/TeamLayout";
import { trpc } from "@/lib/trpc/client";
import { motion } from "framer-motion";
import { Calendar, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function CalendarAccessDenied({ darkMode }: { darkMode: boolean }) {
	const { user } = useAuth();

	return (
		<div className="flex flex-col items-center justify-center py-20 px-4 text-center">
			<motion.div
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.5 }}
				className="relative mb-8"
			>
				{/* Background Glow */}
				<div
					className={`absolute inset-0 blur-3xl rounded-full ${
						darkMode ? "bg-blue-900/20" : "bg-blue-100/50"
					}`}
				/>

				{/* Animated Graphic */}
				<div className="relative">
					<div
						className={`w-32 h-32 mx-auto rounded-3xl flex items-center justify-center ${
							darkMode ? "bg-gray-800" : "bg-white"
						} shadow-xl border ${darkMode ? "border-gray-700" : "border-gray-100"}`}
					>
						<motion.div
							animate={{
								rotate: [0, 360],
							}}
							transition={{
								duration: 8,
								repeat: Number.POSITIVE_INFINITY,
								ease: "linear",
							}}
						>
							<Calendar
								className={`w-16 h-16 ${darkMode ? "text-blue-400" : "text-blue-500"}`}
							/>
						</motion.div>
					</div>
				</div>
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.2 }}
			>
				<h2
					className={`text-3xl font-bold mb-4 ${
						darkMode ? "text-white" : "text-gray-900"
					}`}
				>
					{!user ? (
						"Please sign in to access the calendar"
					) : (
						<>
							You need to be part of a team
							<br />
							to access the calendar
						</>
					)}
				</h2>
				<p
					className={`text-lg max-w-md mx-auto leading-relaxed mb-6 ${
						darkMode ? "text-gray-400" : "text-gray-600"
					}`}
				>
					{!user
						? "Sign in to view and manage your team's calendar events, practices, and tournaments."
						: "Join or create a team to start using the calendar feature and keep track of all your Science Olympiad events."}
				</p>

				{user && (
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Link
							href="/teams"
							className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
								darkMode
									? "bg-blue-600 text-white hover:bg-blue-700"
									: "bg-blue-600 text-white hover:bg-blue-700"
							}`}
						>
							<Users className="w-5 h-5" />
							Go to Teams
						</Link>
					</div>
				)}
			</motion.div>
		</div>
	);
}

export default function CalendarPage() {
	const { darkMode } = useTheme();
	const { user } = useAuth();
	const router = useRouter();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

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

	if (!mounted) {
		return null;
	}

	// Show access denied if not signed in or has no teams
	if (!isLoading && (!user || userTeams.length === 0)) {
		return (
			<TeamLayout
				activeTab="upcoming"
				onTabChangeAction={handleTabChange}
				userTeams={userTeams}
				onTeamSelect={handleTeamSelect}
				onNavigateToMainDashboard={handleNavigateToMainDashboard}
			>
				<CalendarAccessDenied darkMode={darkMode} />
			</TeamLayout>
		);
	}

	if (isLoading) {
		return (
			<TeamLayout
				activeTab="upcoming"
				onTabChangeAction={handleTabChange}
				userTeams={userTeams}
				onTeamSelect={handleTeamSelect}
				onNavigateToMainDashboard={handleNavigateToMainDashboard}
			>
				<div className="flex items-center justify-center py-20">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
						<p
							className={`text-lg ${darkMode ? "text-gray-300" : "text-gray-600"}`}
						>
							Loading calendar...
						</p>
					</div>
				</div>
			</TeamLayout>
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
