"use client";
import { ArrowRight } from "lucide-react";
import { getEventMaxSlots, shouldShowAssignOption } from "./rosterUtils";

interface EventInputProps {
	darkMode: boolean;
	eventName: string;
	roster: Record<string, string[]>;
	isCaptain: boolean;
	isEditMode: boolean;
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
	stackInputs?: boolean;
	inputColumns?: 1 | 2 | 3;
}

function formatNames(names: string[]): string {
	const filtered = names.filter((n) => n.trim());
	if (filtered.length === 0) {
		return "";
	}
	if (filtered.length === 1) {
		return filtered[0] ?? "";
	}
	if (filtered.length === 2) {
		return `${filtered[0]} and ${filtered[1]}`;
	}
	// 3+ people: "Name1, Name2, and Name3"
	const last = filtered[filtered.length - 1];
	const rest = filtered.slice(0, -1);
	return `${rest.join(", ")}, and ${last}`;
}

export default function EventInput({
	darkMode,
	eventName,
	roster,
	isCaptain,
	isEditMode,
	colorKey,
	colors,
	onUpdateRoster,
	onCreateAssignment,
	onRemoveEvent,
	conflictBlock,
	stackInputs = false,
	inputColumns = 3,
}: EventInputProps) {
	const max = getEventMaxSlots(eventName);
	const base = roster[eventName] || [];
	const slots = [
		...base,
		...new Array(Math.max(0, max - base.length)).fill(""),
	].slice(0, max);

	const shouldShowAssign = shouldShowAssignOption(
		isCaptain,
		colorKey,
		eventName,
	);

	const names = base.filter((n) => n.trim());
	const formattedNames = formatNames(names);

	if (!isEditMode) {
		// View mode: show arrow + formatted names
		return (
			<div className="space-y-2">
				<div
					className={`text-sm font-medium ${colors.text} flex items-center gap-2`}
				>
					<span>{eventName}</span>
				</div>
				<div className="flex items-center gap-2">
					<ArrowRight
						className={`w-4 h-4 flex-shrink-0 ${
							darkMode ? "text-gray-400" : "text-gray-500"
						}`}
					/>
					<span
						className={`text-sm ${
							darkMode ? "text-gray-300" : "text-gray-700"
						}`}
					>
						{formattedNames || (
							<span className="italic text-gray-500">No one assigned</span>
						)}
					</span>
				</div>
			</div>
		);
	}

	// Edit mode: show inputs (current behavior)
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
			<div
				className={`grid gap-2 ${
					stackInputs
						? "grid-cols-1"
						: inputColumns === 2
							? "grid-cols-2"
							: "grid-cols-3"
				}`}
			>
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
