"use client";
import { getEventMaxSlots, shouldShowAssignOption } from "./rosterUtils";

interface EventInputProps {
	darkMode: boolean;
	eventName: string;
	roster: Record<string, string[]>;
	isCaptain: boolean;
	colorKey: string;
	colors: {
		bg: string;
		border: string;
		text: string;
	};
	onUpdateRoster: (eventName: string, index: number, value: string) => void;
	onCreateAssignment: (eventName: string) => void;
	onRemoveEvent: (eventName: string, conflictBlock: string) => void;
	conflictBlock: string;
}

export default function EventInput({
	darkMode,
	eventName,
	roster,
	isCaptain,
	colorKey,
	colors,
	onUpdateRoster,
	onCreateAssignment,
	onRemoveEvent,
	conflictBlock,
}: EventInputProps) {
	const max = getEventMaxSlots(eventName);
	const base = roster[eventName] || [];
	const slots = [
		...base,
		...new Array(Math.max(0, max - base.length)).fill(""),
	].slice(0, max);

	// Removed verbose logging - not needed for business logic

	const shouldShowAssign = shouldShowAssignOption(
		isCaptain,
		colorKey,
		eventName,
	);

	return (
		<div className="space-y-2">
			<div
				className={`text-sm font-medium ${colors.text} flex items-center gap-2`}
			>
				<span>{eventName}</span>
				{shouldShowAssign && (
					<button
						type="button"
						onClick={() => onCreateAssignment(eventName)}
						className="text-blue-400 hover:text-blue-500 text-xs"
					>
						Assign?
					</button>
				)}
				{isCaptain && (
					<button
						type="button"
						onClick={() => onRemoveEvent(eventName, conflictBlock)}
						className="text-red-400 hover:text-red-500 text-xs"
					>
						Remove?
					</button>
				)}
			</div>
			<div className="grid grid-cols-3 gap-2">
				{[...new Array(max)].map((_, i) => (
					<input
						key={i.toString()}
						value={slots[i] || ""}
						onChange={(e) => {
							onUpdateRoster(eventName, i, e.target.value);
						}}
						disabled={!isCaptain}
						placeholder="Name"
						className={`w-full rounded px-2 py-1 text-sm ${
							isCaptain
								? darkMode
									? "bg-gray-900 text-white border border-gray-700"
									: "bg-white text-gray-900 border border-gray-300"
								: darkMode
									? "bg-gray-800 text-gray-500 border border-gray-600 cursor-not-allowed"
									: "bg-gray-100 text-gray-500 border border-gray-300 cursor-not-allowed"
						}`}
					/>
				))}
			</div>
		</div>
	);
}
