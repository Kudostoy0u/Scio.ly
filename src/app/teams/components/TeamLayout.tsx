"use client";

import Header from "@/app/components/Header";
import { useTheme } from "@/app/contexts/ThemeContext";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import Sidebar from "./Sidebar";

interface Team {
	id: string;
	name: string;
	slug: string;
	school: string;
	division: "B" | "C";
}

interface TeamLayoutProps {
	children: React.ReactNode;
	activeTab: "home" | "upcoming" | "settings";
	onTabChangeAction: (tab: "home" | "upcoming" | "settings") => void;
	userTeams?: Team[];
	currentTeamSlug?: string;
	onTeamSelect?: (team: Team) => void;
	onNavigateToMainDashboard?: () => void;
	showTopBar?: boolean;
}

export default function TeamLayout({
	children,
	activeTab,
	onTabChangeAction,
	userTeams = [],
	currentTeamSlug,
	onTeamSelect,
	onNavigateToMainDashboard,
	showTopBar = true,
}: TeamLayoutProps) {
	const { darkMode } = useTheme();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	return (
		<div className={`min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
			{/* Top Navigation Bar */}
			{showTopBar && (
				<Header
					logoOffsetClassName="md:-ml-12"
					hideMobileNav
					leftAddon={
						<button
							type="button"
							onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
							className={`md:hidden p-2 rounded-lg ${
								darkMode
									? "text-gray-300 hover:bg-gray-700"
									: "text-gray-600 hover:bg-gray-100"
							}`}
							aria-label="Toggle team menu"
						>
							<Menu className="w-6 h-6" />
						</button>
					}
				/>
			)}

			<div className={`flex h-screen ${showTopBar ? "pt-16" : ""}`}>
				{/* Mobile Menu Overlay */}
				<AnimatePresence>
					{isMobileMenuOpen && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 z-50 md:hidden"
							style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
							onClick={() => setIsMobileMenuOpen(false)}
						>
							<motion.div
								initial={{ x: -300 }}
								animate={{ x: 0 }}
								exit={{ x: -300 }}
								transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
								className={`w-60 h-full ${darkMode ? "bg-gray-900" : "bg-white"} shadow-xl overflow-hidden`}
								onClick={(e) => e.stopPropagation()}
							>
								<div className="p-6 pt-20">
									<div className="flex items-center justify-between mb-8">
										<span
											className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
										>
											Menu
										</span>
										<button
											type="button"
											onClick={() => setIsMobileMenuOpen(false)}
											className={`p-2 rounded-lg transition-colors ${darkMode ? "text-gray-300 hover:bg-gray-800 hover:text-white" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
										>
											<X className="w-5 h-5" />
										</button>
									</div>

									<Sidebar
										activeTab={activeTab}
										onTabChange={(tab) => {
											onTabChangeAction(tab);
											setIsMobileMenuOpen(false);
										}}
										userTeams={userTeams}
										currentTeamSlug={currentTeamSlug}
										onTeamSelect={onTeamSelect}
										onNavigateToMainDashboard={onNavigateToMainDashboard}
									/>
								</div>
							</motion.div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Fixed Desktop Sidebar */}
				<div className="hidden md:block fixed left-0 top-16 bottom-0 z-30 w-60">
					<Sidebar
						activeTab={activeTab}
						onTabChange={onTabChangeAction}
						userTeams={userTeams}
						currentTeamSlug={currentTeamSlug}
						onTeamSelect={onTeamSelect}
						onNavigateToMainDashboard={onNavigateToMainDashboard}
					/>
				</div>

				{/* Main Content Area */}
				<div className="flex-1 w-full md:ml-60 pb-16 md:pb-0 overflow-y-auto">
					{children}
				</div>
			</div>
		</div>
	);
}
