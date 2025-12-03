"use client";

import { Calendar, MapPin, X } from "lucide-react";
import type { Event } from "./streamTypes";
import {
	calculateTimeRemaining,
	formatEventDateTime,
	getDisplayTimeUnits,
	getEventStatus,
	getEventTypeColor,
} from "./streamUtils";

interface ActiveTimersProps {
	darkMode: boolean;
	activeTimers: Event[];
	onRemoveTimer: (eventId: string) => void;
}

export default function ActiveTimers({
	darkMode,
	activeTimers,
	onRemoveTimer,
}: ActiveTimersProps) {
	if (activeTimers.length === 0) {
		return null;
	}

	return (
		<div
			className={`mb-6 p-4 rounded-lg border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
		>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{activeTimers
					.filter(
						(event) =>
							event.start_time &&
							event.title &&
							event.event_type !== "personal",
					)
					.map((event) => {
						const timeRemaining = calculateTimeRemaining(event.start_time);
						const displayUnits = getDisplayTimeUnits(timeRemaining);
						const status = getEventStatus(event.start_time);

						return (
							<div
								key={event.id}
								className={`p-4 rounded-lg border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-200"}`}
							>
								<div className="flex items-center justify-between mb-3">
									<div className="flex items-center space-x-2">
										<Calendar className="w-4 h-4 text-blue-500" />
										<span
											className={`font-medium text-base ${darkMode ? "text-white" : "text-gray-900"}`}
										>
											{event.title}
										</span>
										<span
											className={`text-xs px-2 py-1 rounded-full ${getEventTypeColor(event.event_type, darkMode)}`}
										>
											{event.event_type}
										</span>
									</div>
									<button
										type="button"
										onClick={() => onRemoveTimer(event.id)}
										className="text-gray-400 hover:text-red-500 transition-colors"
										title="Remove timer"
									>
										<X className="w-4 h-4" />
									</button>
								</div>

								{event.location && (
									<div className="flex items-center space-x-1 mb-3">
										<MapPin className="w-3 h-3 text-gray-400" />
										<span
											className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
										>
											{event.location}
										</span>
									</div>
								)}

								{/* Exact date and time */}
								<div
									className={`text-sm font-medium mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
								>
									{formatEventDateTime(event.start_time)}
								</div>

								{/* Time units with white cards */}
								<div className="flex justify-between gap-2 mb-3">
									{displayUnits.map((unit, _index) => {
										if (!unit) {
											return null;
										}
										return (
											<div key={unit.key} className="flex-1">
												<div
													className={`rounded-lg p-3 text-center border ${
														darkMode
															? "bg-gray-700 border-gray-600"
															: "bg-white border-gray-200"
													}`}
												>
													<div
														className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
													>
														{Number.isNaN(unit.value) ? 0 : unit.value}
													</div>
													<div
														className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}
													>
														{unit.label}
													</div>
												</div>
											</div>
										);
									})}
								</div>

								{/* Status indicator */}
								<div className="text-center">
									<span className={`text-sm font-medium ${status.color}`}>
										{status.text}
									</span>
								</div>
							</div>
						);
					})}
			</div>
		</div>
	);
}
