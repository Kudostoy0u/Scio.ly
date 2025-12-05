"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { AlertTriangle } from "lucide-react";
import type { Member } from "../types";
import { DIVISION_B_GROUPS, DIVISION_C_GROUPS } from "./roster/rosterUtils";

/**
 * Science Olympiad Division C events
 * Standard events list for the 2024-2025 season
 */
const DIVISION_C_EVENTS = [
	"Anatomy & Physiology",
	"Astronomy",
	"Chemistry Lab",
	"Circuit Lab",
	"Codebusters",
	"Designer Genes",
	"Disease Detectives",
	"Dynamic Planet",
	"Entomology",
	"Experimental Design",
	"Forensics",
	"Machines",
	"Materials Science",
	"Meteorology",
	"Remote Sensing",
	"Rocks and Minerals",
	"Solar System",
	"Water Quality",
] as const;

/**
 * Props for the EventAssignmentModal component
 */
interface EventAssignmentModalProps {
	/** Whether the modal is visible */
	isOpen: boolean;
	/** Callback when the modal should close */
	onClose: () => void;
	/**
	 * Callback when an event is selected
	 * @param eventName - The name of the selected event
	 * @param subteamId - The ID of the subteam to assign the event to
	 */
	onSelectEvent: (eventName: string, subteamId: string) => Promise<void>;
	/** List of available events (defaults to Division C events) */
	events?: readonly string[];
	/** The member being assigned events */
	selectedMember: Member | null;
	/** The ID of the subteam for the member */
	subteamId: string;
	/** Division (B or C) for conflict detection */
	division?: "B" | "C";
}

/**
 * EventAssignmentModal Component
 *
 * A modal dialog that displays a list of Science Olympiad events and allows
 * captains to assign members to specific events. The modal shows event buttons
 * and handles the assignment workflow.
 *
 * Features:
 * - Dark mode support
 * - Scrollable event list
 * - Async event selection handling
 * - Accessible keyboard navigation
 * - Responsive design
 *
 * @example
 * ```tsx
 * <EventAssignmentModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   onSelectEvent={async (eventName, subteamId) => {
 *     await assignEventToMember(eventName, subteamId);
 *   }}
 *   selectedMember={member}
 *   subteamId={currentSubteamId}
 * />
 * ```
 */
export default function EventAssignmentModal({
	isOpen,
	onClose,
	onSelectEvent,
	events = DIVISION_C_EVENTS,
	selectedMember,
	subteamId,
	division = "C",
}: EventAssignmentModalProps) {
	const { darkMode } = useTheme();

	// Don't render if modal is not open or no member is selected
	if (!(isOpen && selectedMember)) {
		return null;
	}

	// Get the appropriate conflict groups based on division
	const conflictGroups =
		division === "B" ? DIVISION_B_GROUPS : DIVISION_C_GROUPS;

	// Build a map of event -> conflict block
	const eventToConflictBlock = new Map<string, string>();
	for (const group of conflictGroups) {
		for (const event of group.events) {
			eventToConflictBlock.set(event, group.label);
		}
	}

	// Check if adding an event would create a conflict
	const getConflictWarning = (eventName: string): string | null => {
		if (!selectedMember.events || selectedMember.events.length === 0) {
			return null;
		}

		const eventBlock = eventToConflictBlock.get(eventName);
		if (!eventBlock) {
			return null;
		}

		// Find if member has any events in the same conflict block
		const conflictingEvents = selectedMember.events.filter((memberEvent) => {
			const memberEventBlock = eventToConflictBlock.get(memberEvent);
			return memberEventBlock === eventBlock;
		});

		if (conflictingEvents.length > 0) {
			return `${selectedMember.name} is already assigned to ${conflictingEvents.join(", ")} in ${eventBlock}`;
		}

		return null;
	};

	/**
	 * Handles event selection
	 * Calls the onSelectEvent callback with the event name and subteam ID
	 */
	const handleEventClick = async (event: string) => {
		try {
			await onSelectEvent(event, subteamId);
			onClose();
		} catch (_error) {
			// Error is handled by the parent component
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			{/* Backdrop overlay */}
			<div
				className="fixed inset-0 transition-opacity"
				style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Escape") {
						onClose();
					}
				}}
				tabIndex={-1}
				aria-hidden="true"
			/>

			{/* Modal dialog */}
			<dialog
				className={`relative ${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden`}
				aria-labelledby="event-modal-title"
				open={true}
			>
				{/* Modal header */}
				<div
					className={`${darkMode ? "bg-gray-800" : "bg-white"} px-4 pt-5 pb-4 sm:p-6 sm:pb-4`}
				>
					<h3
						id="event-modal-title"
						className={`text-lg leading-6 font-medium ${darkMode ? "text-white" : "text-gray-900"} mb-4`}
					>
						Add Event for {selectedMember.name}
					</h3>

					{/* Event list */}
					<div className="space-y-2 max-h-96 overflow-y-auto">
						<p
							className={`${darkMode ? "text-gray-400" : "text-gray-600"} mb-3`}
						>
							Select an event to add {selectedMember.name} to in{" "}
							{selectedMember.subteam?.name}.
						</p>

						{/* Event buttons */}
						{events.map((event) => {
							const conflictWarning = getConflictWarning(event);
							const hasConflict = !!conflictWarning;

							return (
								<div key={event} className="relative group">
									<button
										type="button"
										onClick={() => handleEventClick(event)}
										disabled={hasConflict}
										className={`w-full text-left px-4 py-2 pr-10 border ${
											hasConflict
												? darkMode
													? "border-gray-700 bg-gray-800/50 text-gray-500 cursor-not-allowed"
													: "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
												: darkMode
													? "border-gray-600 hover:bg-gray-700 text-white"
													: "border-gray-300 hover:bg-gray-50 text-gray-900"
										} rounded-md transition-colors relative`}
									>
										{event}
										{hasConflict && (
											<AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500" />
										)}
									</button>
									{hasConflict && conflictWarning && (
										<div
											className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-sm whitespace-nowrap z-10 ${
												darkMode
													? "bg-gray-800 text-white border border-gray-700"
													: "bg-white text-gray-900 border border-gray-200 shadow-lg"
											} opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none`}
										>
											{conflictWarning}
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>

				{/* Modal footer */}
				<div
					className={`${darkMode ? "bg-gray-700" : "bg-gray-50"} px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse`}
				>
					<button
						type="button"
						onClick={onClose}
						className={`w-full inline-flex justify-center rounded-md border ${
							darkMode
								? "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700"
								: "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
						} shadow-sm px-4 py-2 text-base font-medium sm:ml-3 sm:w-auto sm:text-sm transition-colors`}
					>
						Cancel
					</button>
				</div>
			</dialog>
		</div>
	);
}
