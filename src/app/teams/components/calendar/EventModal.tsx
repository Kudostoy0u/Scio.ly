"use client";

import { AnimatePresence, motion } from "framer-motion";

interface CalendarEvent {
	id: string;
	title: string;
	description?: string;
	start_time: string;
	end_time?: string;
	location?: string;
	event_type:
		| "practice"
		| "tournament"
		| "meeting"
		| "deadline"
		| "other"
		| "personal";
	is_all_day: boolean;
	is_recurring: boolean;
	recurrence_pattern?: Record<string, unknown>;
	created_by: string;
	team_id?: string;
	attendees?: Array<{
		user_id: string;
		status: "pending" | "attending" | "declined" | "tentative";
		name: string;
		email: string;
	}>;
}

interface EventForm {
	title: string;
	description: string;
	date: string;
	start_time: string;
	end_time: string;
	location: string;
	event_type:
		| "practice"
		| "tournament"
		| "meeting"
		| "deadline"
		| "other"
		| "personal";
	is_all_day: boolean;
	is_recurring: boolean;
	recurrence_pattern: Record<string, unknown>;
	meeting_type: "personal" | "team";
	selected_team_id: string;
}

interface UserTeam {
	id: string;
	name: string;
	slug: string;
	school: string;
	user_role: string;
	team_id: string;
}

interface EventModalProps {
	darkMode: boolean;
	showModal: boolean;
	selectedEvent: CalendarEvent | null;
	eventForm: EventForm;
	userTeams: UserTeam[];
	onClose: () => void;
	onFormChange: (updates: Partial<EventForm>) => void;
	onSubmit: () => void;
}

export default function EventModal({
	darkMode,
	showModal,
	selectedEvent,
	eventForm,
	userTeams,
	onClose,
	onFormChange,
	onSubmit,
}: EventModalProps) {
	const handleTeamSelection = (value: string) => {
		if (value === "personal") {
			onFormChange({
				meeting_type: "personal",
				selected_team_id: "",
			});
		} else if (value.startsWith("all-")) {
			onFormChange({
				meeting_type: "team",
				selected_team_id: value,
			});
		} else {
			onFormChange({
				meeting_type: "team",
				selected_team_id: value,
			});
		}
	};

	const getTeamOptions = () => {
		type TeamOption = UserTeam & { isAllTeams?: boolean };
		return userTeams.reduce((acc: TeamOption[], team) => {
			const schoolKey = team.school || "Unknown School";
			const existingGroup = acc.find((group) => group.school === schoolKey);

			if (existingGroup) {
				acc.push({
					...team,
					name: team.name,
				});
			} else {
				acc.push({
					id: `all-${schoolKey}`,
					school: schoolKey,
					name: "All Teams",
					isAllTeams: true,
					slug: "",
					user_role: "",
					team_id: "",
				});
				acc.push({
					...team,
					name: team.name,
				});
			}

			return acc;
		}, []);
	};

	return (
		<AnimatePresence>
			{showModal && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 flex items-center justify-center z-50"
					style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
					onClick={onClose}
				>
					<motion.div
						initial={{ scale: 0.95, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.95, opacity: 0 }}
						className={`max-w-md w-full mx-4 rounded-lg ${darkMode ? "bg-gray-800" : "bg-white"}`}
						onClick={(e) => e.stopPropagation()}
					>
						<div className="p-6">
							<div className="flex items-center justify-between mb-4">
								<h3
									className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
								>
									{selectedEvent ? "Edit Event" : "Create Event"}
								</h3>
								<button
									type="button"
									onClick={onClose}
									className={`p-1 rounded-lg hover:bg-opacity-20 transition-colors ${
										darkMode ? "hover:bg-gray-600" : "hover:bg-gray-200"
									}`}
								>
									<svg
										className="w-5 h-5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										data-testid="x-icon"
									>
										<title>Close modal</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							</div>

							<div className="space-y-4">
								<div>
									<label
										htmlFor="event-title"
										className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
									>
										Title <span className="text-red-500">*</span>
									</label>
									<input
										id="event-title"
										type="text"
										value={eventForm.title}
										onChange={(e) => onFormChange({ title: e.target.value })}
										className={`w-full px-3 py-2 border rounded-lg ${
											darkMode
												? "bg-gray-700 border-gray-600 text-white"
												: "bg-white border-gray-300 text-gray-900"
										}`}
										placeholder="Event title"
									/>
								</div>

								<div>
									<label
										htmlFor="event-description"
										className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
									>
										Description
									</label>
									<textarea
										id="event-description"
										value={eventForm.description}
										onChange={(e) =>
											onFormChange({ description: e.target.value })
										}
										className={`w-full px-3 py-2 border rounded-lg ${
											darkMode
												? "bg-gray-700 border-gray-600 text-white"
												: "bg-white border-gray-300 text-gray-900"
										}`}
										rows={3}
										placeholder="Event description"
									/>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label
											htmlFor="event-date"
											className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
										>
											Date <span className="text-red-500">*</span>
										</label>
										<input
											id="event-date"
											type="date"
											value={eventForm.date}
											onChange={(e) => onFormChange({ date: e.target.value })}
											className={`w-full px-3 py-2 border rounded-lg ${
												darkMode
													? "bg-gray-700 border-gray-600 text-white"
													: "bg-white border-gray-300 text-gray-900"
											}`}
										/>
									</div>

									<div>
										<label
											htmlFor="meeting-type"
											className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
										>
											Meeting Type
										</label>
										<select
											id="meeting-type"
											value={
												eventForm.meeting_type === "personal"
													? "personal"
													: eventForm.selected_team_id || "personal"
											}
											onChange={(e) => handleTeamSelection(e.target.value)}
											className={`w-full px-3 py-2 border rounded-lg ${
												darkMode
													? "bg-gray-700 border-gray-600 text-white"
													: "bg-white border-gray-300 text-gray-900"
											}`}
										>
											<option value="personal">Personal</option>
											{getTeamOptions().map((team) => (
												<option
													key={team.id}
													value={
														team.isAllTeams ? `all-${team.school}` : team.id
													}
												>
													{team.isAllTeams
														? `${team.school} - All Teams`
														: `${team.school} - ${team.name}`}
												</option>
											))}
										</select>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label
											htmlFor="start-time"
											className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
										>
											Start Time
										</label>
										<input
											id="start-time"
											type="time"
											value={eventForm.start_time}
											onChange={(e) =>
												onFormChange({ start_time: e.target.value })
											}
											className={`w-full px-3 py-2 border rounded-lg ${
												darkMode
													? "bg-gray-700 border-gray-600 text-white"
													: "bg-white border-gray-300 text-gray-900"
											}`}
										/>
									</div>

									<div>
										<label
											htmlFor="end-time"
											className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
										>
											End Time
										</label>
										<input
											id="end-time"
											type="time"
											value={eventForm.end_time}
											onChange={(e) =>
												onFormChange({ end_time: e.target.value })
											}
											className={`w-full px-3 py-2 border rounded-lg ${
												darkMode
													? "bg-gray-700 border-gray-600 text-white"
													: "bg-white border-gray-300 text-gray-900"
											}`}
										/>
									</div>
								</div>

								<div>
									<label
										htmlFor="event-location"
										className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
									>
										Location
									</label>
									<input
										id="event-location"
										type="text"
										value={eventForm.location}
										onChange={(e) => onFormChange({ location: e.target.value })}
										className={`w-full px-3 py-2 border rounded-lg ${
											darkMode
												? "bg-gray-700 border-gray-600 text-white"
												: "bg-white border-gray-300 text-gray-900"
										}`}
										placeholder="Event location"
									/>
								</div>

								<div>
									<label
										htmlFor="event-type"
										className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
									>
										Event Type
									</label>
									<select
										id="event-type"
										value={eventForm.event_type}
										onChange={(e) => {
											const value = e.target.value;
											if (
												value === "practice" ||
												value === "tournament" ||
												value === "meeting" ||
												value === "deadline" ||
												value === "other" ||
												value === "personal"
											) {
												onFormChange({ event_type: value });
											}
										}}
										className={`w-full px-3 py-2 border rounded-lg ${
											darkMode
												? "bg-gray-700 border-gray-600 text-white"
												: "bg-white border-gray-300 text-gray-900"
										}`}
									>
										<option value="practice">Practice</option>
										<option value="tournament">Tournament</option>
										<option value="meeting">Meeting</option>
										<option value="deadline">Deadline</option>
										<option value="personal">Personal</option>
										<option value="other">Other</option>
									</select>
								</div>
							</div>

							<div className="flex justify-end space-x-3 mt-6">
								<button
									type="button"
									onClick={onClose}
									className={`px-4 py-2 rounded-lg font-medium ${
										darkMode
											? "bg-gray-700 hover:bg-gray-600 text-white"
											: "bg-gray-200 hover:bg-gray-300 text-gray-900"
									}`}
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={onSubmit}
									className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
								>
									{selectedEvent ? "Update" : "Create"}
								</button>
							</div>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
