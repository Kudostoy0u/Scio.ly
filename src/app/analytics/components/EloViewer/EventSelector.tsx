"use client";

interface EventSelectorProps {
	events: string[];
	selectedEvents: string[];
	eventSearch: string;
	darkMode: boolean;
	onEventSearchChange: (value: string) => void;
	onEventToggle: (event: string) => void;
	onRemoveEvent: (event: string) => void;
	onClearAllEvents: () => void;
}
export default function EventSelector({
	events,
	selectedEvents,
	eventSearch,
	darkMode,
	onEventSearchChange,
	onEventToggle,
	onRemoveEvent,
	onClearAllEvents,
}: EventSelectorProps) {
	return (
		<div>
			<label
				htmlFor="event-search-input"
				className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"} mb-2`}
			>
				Select Events
			</label>
			<div className="space-y-3">
				<input
					id="event-search-input"
					type="text"
					placeholder="Search events..."
					value={eventSearch}
					onChange={(e) => onEventSearchChange(e.target.value)}
					className={`w-full px-3 py-2 border rounded-md ${darkMode ? "border-gray-600 bg-gray-700 text-white placeholder-gray-400" : "border-gray-300 bg-white text-gray-900 placeholder-gray-500"} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
				/>
				<div
					className={`max-h-48 overflow-y-auto border rounded-md ${darkMode ? "border-gray-600 bg-gray-700" : "border-gray-300 bg-white"}`}
				>
					{events.map((event) => (
						<button
							key={event}
							type="button"
							className={`w-full text-left px-3 py-2 cursor-pointer border-b last:border-b-0 transition-colors ${
								selectedEvents.includes(event)
									? darkMode
										? "bg-blue-900/20 text-blue-300"
										: "bg-blue-50 text-blue-700"
									: darkMode
										? "border-gray-600 hover:bg-gray-600 text-gray-300"
										: "border-gray-100 hover:bg-gray-50 text-gray-700"
							}`}
							onClick={() => onEventToggle(event)}
						>
							{event}{" "}
						</button>
					))}{" "}
				</div>
				<div className="flex flex-wrap gap-2 items-center">
					{selectedEvents.map((event) => (
						<span
							key={event}
							className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
								darkMode
									? "bg-blue-900/30 text-blue-200"
									: "bg-blue-100 text-blue-800"
							}`}
						>
							{event}{" "}
							<button
								type="button"
								onClick={() => onRemoveEvent(event)}
								className={`ml-2 ${darkMode ? "text-blue-400 hover:text-blue-200" : "text-blue-600 hover:text-blue-800"}`}
							>
								×
							</button>
						</span>
					))}{" "}
					{selectedEvents.length > 0 && (
						<button
							type="button"
							onClick={onClearAllEvents}
							className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
								darkMode
									? "bg-red-600 hover:bg-red-700 text-white"
									: "bg-red-100 hover:bg-red-200 text-red-700"
							}`}
						>
							Clear All
						</button>
					)}{" "}
				</div>
			</div>
		</div>
	);
}
