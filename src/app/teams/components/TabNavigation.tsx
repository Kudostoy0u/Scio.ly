"use client";

import { useTheme } from "@/app/contexts/themeContext";
import { ClipboardList, Home, UserPlus, Users } from "lucide-react";

type TabName = "home" | "people" | "roster" | "assignments";

interface TabNavigationProps {
	activeTab: TabName;
	onTabChange: (tab: TabName) => void;
}

export default function TabNavigation({
	activeTab,
	onTabChange,
}: TabNavigationProps) {
	const { darkMode } = useTheme();

	const tabs: Array<{ id: TabName; label: string; icon: typeof Users }> = [
		{ id: "home", label: "Home", icon: Home },
		{ id: "people", label: "People", icon: UserPlus },
		{ id: "roster", label: "Roster", icon: Users },
		{ id: "assignments", label: "Assignments", icon: ClipboardList },
	];

	const handleClick = (tab: TabName) => {
		onTabChange(tab);
	};

	const baseClasses =
		"py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2";

	return (
		<>
			{/* Desktop Navigation - Sticky */}
			<div
				className={`hidden md:block sticky top-0 z-20 border-b ${darkMode ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white"}`}
			>
				<div className="w-full px-4 sm:px-6 lg:px-8">
					<nav className="flex space-x-6">
						{tabs.map((tab) => (
							<button
								key={tab.id}
								type="button"
								onClick={() => handleClick(tab.id)}
								className={`${baseClasses} ${
									activeTab === tab.id
										? darkMode
											? "border-blue-500 text-blue-400"
											: "border-blue-600 text-blue-600"
										: darkMode
											? "border-transparent text-gray-400 hover:text-gray-300"
											: "border-transparent text-gray-500 hover:text-gray-700"
								}`}
							>
								<tab.icon className="w-4 h-4" />
								<span>{tab.label}</span>
							</button>
						))}
					</nav>
				</div>
			</div>

			{/* Mobile Bottom Navigation */}
			<div
				className={`md:hidden fixed bottom-0 left-0 right-0 z-40 ${darkMode ? "bg-gray-800 border-t border-gray-700" : "bg-white border-t border-gray-200"}`}
			>
				<div className="grid grid-cols-4 h-16">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => handleClick(tab.id)}
							className={`flex flex-col items-center justify-center space-y-1 ${
								activeTab === tab.id
									? darkMode
										? "text-blue-400"
										: "text-blue-600"
									: darkMode
										? "text-gray-400"
										: "text-gray-500"
							}`}
						>
							<tab.icon className="w-5 h-5" />
							<span className="text-xs font-medium">{tab.label}</span>
						</button>
					))}
				</div>
			</div>
		</>
	);
}
