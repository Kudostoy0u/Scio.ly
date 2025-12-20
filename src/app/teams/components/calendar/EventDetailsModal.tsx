"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { CalendarEvent } from "./calendarUtils";

interface UserTeam {
	id: string;
	name: string;
	school: string;
	subteams?: Array<{
		id: string;
		name: string;
	}>;
}

interface EventDetailsModalProps {
	darkMode: boolean;
	showModal: boolean;
	selectedEvent: CalendarEvent | null;
	userTeams?: UserTeam[];
	onClose: () => void;
	onEdit?: (event: CalendarEvent) => void;
}

export default function EventDetailsModal({
	darkMode,
	showModal,
	selectedEvent,
	userTeams = [],
	onClose,
	onEdit,
}: EventDetailsModalProps) {
	if (!selectedEvent) {
		return null;
	}

	// Determine event scope (personal, team, or subteam)
	const getEventScope = (): {
		type: "personal" | "team" | "subteam";
		label: string;
	} => {
		// Personal event: has owner_user_id and no team_id
		if (selectedEvent.owner_user_id && !selectedEvent.team_id) {
			return { type: "personal", label: "Personal" };
		}

		// Subteam event: has subteam_id
		if (selectedEvent.subteam_id) {
			const team = userTeams.find((t) => t.id === selectedEvent.team_id);
			const subteam = team?.subteams?.find(
				(s) => s.id === selectedEvent.subteam_id,
			);
			if (subteam) {
				return {
					type: "subteam",
					label: `${team?.school || "Team"} - ${subteam.name}`,
				};
			}
			return { type: "subteam", label: "Subteam" };
		}

		// Team event: has team_id but no subteam_id
		if (selectedEvent.team_id) {
			const team = userTeams.find((t) => t.id === selectedEvent.team_id);
			return {
				type: "team",
				label: team?.school || team?.name || "Team",
			};
		}

		// Fallback
		return { type: "personal", label: "Personal" };
	};

	const eventScope = getEventScope();

	// Get event type badge color
	const getEventTypeColor = () => {
		switch (selectedEvent.event_type) {
			case "tournament":
				return darkMode
					? "bg-red-900/30 text-red-300 border-red-800"
					: "bg-red-50 text-red-700 border-red-200";
			case "practice":
				return darkMode
					? "bg-blue-900/30 text-blue-300 border-blue-800"
					: "bg-blue-50 text-blue-700 border-blue-200";
			case "meeting":
				return darkMode
					? "bg-purple-900/30 text-purple-300 border-purple-800"
					: "bg-purple-50 text-purple-700 border-purple-200";
			case "deadline":
				return darkMode
					? "bg-orange-900/30 text-orange-300 border-orange-800"
					: "bg-orange-50 text-orange-700 border-orange-200";
			case "personal":
				return darkMode
					? "bg-green-900/30 text-green-300 border-green-800"
					: "bg-green-50 text-green-700 border-green-200";
			default:
				return darkMode
					? "bg-gray-700/30 text-gray-300 border-gray-600"
					: "bg-gray-50 text-gray-700 border-gray-200";
		}
	};

	// Get scope icon
	const getScopeIcon = () => {
		switch (eventScope.type) {
			case "personal":
				return (
					<svg
						className="w-5 h-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-label="Personal event"
					>
						<title>Personal event</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
						/>
					</svg>
				);
			case "subteam":
				return (
					<svg
						className="w-5 h-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-label="Subteam event"
					>
						<title>Subteam event</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
						/>
					</svg>
				);
			default:
				return (
					<svg
						className="w-5 h-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-label="Team event"
					>
						<title>Team event</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
						/>
					</svg>
				);
		}
	};

	// Format event type for display
	const formatEventType = (type: string) => {
		return type.charAt(0).toUpperCase() + type.slice(1);
	};

	return (
		<AnimatePresence>
			{showModal && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 flex items-center justify-center z-50 p-4"
					style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
					onClick={onClose}
				>
					<motion.div
						initial={{ scale: 0.95, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.95, opacity: 0 }}
						className={`max-w-2xl w-full rounded-xl shadow-2xl ${
							darkMode ? "bg-gray-800" : "bg-white"
						}`}
						onClick={(e) => e.stopPropagation()}
					>
						{/* Header */}
						<div
							className={`px-6 py-4 border-b ${
								darkMode ? "border-gray-700" : "border-gray-200"
							}`}
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div
										className={`p-2 rounded-lg ${
											darkMode ? "bg-gray-700" : "bg-gray-100"
										}`}
									>
										<svg
											className={`w-6 h-6 ${
												darkMode ? "text-gray-300" : "text-gray-600"
											}`}
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											aria-label="Calendar icon"
										>
											<title>Calendar icon</title>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
											/>
										</svg>
									</div>
									<div>
										<h3
											className={`text-xl font-bold ${
												darkMode ? "text-white" : "text-gray-900"
											}`}
										>
											{selectedEvent.title}
										</h3>
										<div className="flex items-center gap-2 mt-1">
											<span
												className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEventTypeColor()}`}
											>
												{formatEventType(selectedEvent.event_type)}
											</span>
											{selectedEvent.is_recurring && (
												<span
													className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
														darkMode
															? "bg-blue-900/30 text-blue-300 border border-blue-800"
															: "bg-blue-50 text-blue-700 border border-blue-200"
													}`}
												>
													Recurring
												</span>
											)}
										</div>
									</div>
								</div>
								<button
									type="button"
									onClick={onClose}
									className={`p-2 rounded-lg transition-colors ${
										darkMode
											? "text-gray-400 hover:text-gray-300 hover:bg-gray-700"
											: "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
									}`}
								>
									<svg
										className="w-5 h-5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										aria-label="Close"
									>
										<title>Close</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							</div>
						</div>

						{/* Content */}
						<div className="p-6">
							{/* Description - Full Width */}
							{selectedEvent.description && (
								<div className="mb-6">
									<div className="flex items-start gap-3">
										<svg
											className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
												darkMode ? "text-gray-400" : "text-gray-500"
											}`}
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											aria-label="Description"
										>
											<title>Description</title>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M4 6h16M4 12h16M4 18h7"
											/>
										</svg>
										<div className="flex-1">
											<p
												className={`text-sm leading-relaxed ${
													darkMode ? "text-gray-300" : "text-gray-700"
												}`}
											>
												{selectedEvent.description}
											</p>
										</div>
									</div>
								</div>
							)}

							{/* Two Column Grid */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{/* Date & Time Column */}
								<div className="space-y-4">
									{/* Date */}
									<div className="flex items-start gap-3">
										<svg
											className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
												darkMode ? "text-gray-400" : "text-gray-500"
											}`}
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											aria-label="Date"
										>
											<title>Date</title>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
											/>
										</svg>
										<div className="flex-1 min-w-0">
											<p
												className={`text-xs font-medium mb-1 ${
													darkMode ? "text-gray-400" : "text-gray-500"
												}`}
											>
												Date
											</p>
											<p
												className={`text-sm font-medium ${
													darkMode ? "text-white" : "text-gray-900"
												}`}
											>
												{new Date(selectedEvent.start_time).toLocaleDateString(
													undefined,
													{
														weekday: "long",
														year: "numeric",
														month: "long",
														day: "numeric",
													},
												)}
											</p>
										</div>
									</div>

									{/* Time Range */}
									{!selectedEvent.is_all_day && (
										<div className="flex items-start gap-3">
											<svg
												className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
													darkMode ? "text-gray-400" : "text-gray-500"
												}`}
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												aria-label="Time"
											>
												<title>Time</title>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
												/>
											</svg>
											<div className="flex-1 min-w-0">
												<p
													className={`text-xs font-medium mb-1 ${
														darkMode ? "text-gray-400" : "text-gray-500"
													}`}
												>
													Time
												</p>
												<p
													className={`text-sm font-medium ${
														darkMode ? "text-white" : "text-gray-900"
													}`}
												>
													{new Date(
														selectedEvent.start_time,
													).toLocaleTimeString([], {
														hour: "2-digit",
														minute: "2-digit",
													})}
													{selectedEvent.end_time &&
														` - ${new Date(
															selectedEvent.end_time,
														).toLocaleTimeString([], {
															hour: "2-digit",
															minute: "2-digit",
														})}`}
												</p>
											</div>
										</div>
									)}

									{selectedEvent.is_all_day && (
										<div className="flex items-start gap-3">
											<svg
												className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
													darkMode ? "text-gray-400" : "text-gray-500"
												}`}
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												aria-label="All day"
											>
												<title>All day</title>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
												/>
											</svg>
											<div className="flex-1 min-w-0">
												<p
													className={`text-xs font-medium mb-1 ${
														darkMode ? "text-gray-400" : "text-gray-500"
													}`}
												>
													Time
												</p>
												<p
													className={`text-sm font-medium ${
														darkMode ? "text-white" : "text-gray-900"
													}`}
												>
													All Day
												</p>
											</div>
										</div>
									)}
								</div>

								{/* Location & Scope Column */}
								<div className="space-y-4">
									{/* Location */}
									{selectedEvent.location && (
										<div className="flex items-start gap-3">
											<svg
												className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
													darkMode ? "text-gray-400" : "text-gray-500"
												}`}
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												aria-label="Location"
											>
												<title>Location</title>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
												/>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
												/>
											</svg>
											<div className="flex-1 min-w-0">
												<p
													className={`text-xs font-medium mb-1 ${
														darkMode ? "text-gray-400" : "text-gray-500"
													}`}
												>
													Location
												</p>
												<p
													className={`text-sm font-medium ${
														darkMode ? "text-white" : "text-gray-900"
													}`}
												>
													{selectedEvent.location}
												</p>
											</div>
										</div>
									)}

									{/* Event Scope */}
									<div className="flex items-start gap-3">
										<div
											className={`mt-0.5 flex-shrink-0 ${
												darkMode ? "text-gray-400" : "text-gray-500"
											}`}
										>
											{getScopeIcon()}
										</div>
										<div className="flex-1 min-w-0">
											<p
												className={`text-xs font-medium mb-1 ${
													darkMode ? "text-gray-400" : "text-gray-500"
												}`}
											>
												For
											</p>
											<p
												className={`text-sm font-medium ${
													darkMode ? "text-white" : "text-gray-900"
												}`}
											>
												{eventScope.label}
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Footer */}
						<div
							className={`px-6 py-4 border-t flex justify-between items-center ${
								darkMode ? "border-gray-700" : "border-gray-200"
							}`}
						>
							{onEdit && (
								<button
									type="button"
									onClick={() => {
										if (selectedEvent) {
											onEdit(selectedEvent);
										}
									}}
									className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
										darkMode
											? "bg-blue-600 hover:bg-blue-700 text-white"
											: "bg-blue-600 hover:bg-blue-700 text-white"
									}`}
								>
									<svg
										className="w-4 h-4"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										aria-label="Edit"
									>
										<title>Edit</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
										/>
									</svg>
									Edit
								</button>
							)}
							<button
								type="button"
								onClick={onClose}
								className={`ml-auto px-6 py-2 rounded-lg font-medium transition-colors ${
									darkMode
										? "bg-gray-700 hover:bg-gray-600 text-white"
										: "bg-gray-100 hover:bg-gray-200 text-gray-900"
								}`}
							>
								Close
							</button>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
