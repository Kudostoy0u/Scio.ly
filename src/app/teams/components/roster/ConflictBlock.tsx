"use client";

import { ChevronDown, ChevronRight, Plus, RotateCcw } from "lucide-react";
import type React from "react";
import EventInput from "./EventInput";
import type { ConflictBlock as ConflictBlockType } from "./rosterUtils";
import { getGroupColors } from "./rosterUtils";

interface ConflictBlockProps {
	darkMode: boolean;
	group: ConflictBlockType;
	roster: Record<string, string[]>;
	isCaptain: boolean;
	isEditMode: boolean;
	collapsedGroups: Set<string>;
	isLastGroup: boolean;
	onToggleGroupCollapse: (groupLabel: string) => void;
	onUpdateRoster: (eventName: string, index: number, value: string) => void;
	onCreateAssignment: (eventName: string) => void;
	onRemoveEvent: (eventName: string, conflictBlock: string) => void;
	onResetBlock: (conflictBlock: string) => void;
	onAddEvent: (conflictBlock: string) => void;
	showReset: boolean;
}

export default function ConflictBlock({
	darkMode,
	group,
	roster,
	isCaptain,
	isEditMode,
	collapsedGroups,
	isLastGroup,
	onToggleGroupCollapse,
	onUpdateRoster,
	onCreateAssignment,
	onRemoveEvent,
	onResetBlock,
	onAddEvent,
	showReset,
}: ConflictBlockProps) {
	// Removed verbose logging - not needed for business logic

	const colors = getGroupColors(darkMode, group.colorKey);
	const isCollapsed = collapsedGroups.has(group.label);

	const handleGroupClick = () => {
		// Only make collapsible on mobile
		if (window.innerWidth < 768) {
			onToggleGroupCollapse(group.label);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleGroupClick();
		}
	};

	if (isLastGroup) {
		return (
			<div
				className={`rounded-lg border-2 p-4 lg:col-span-2 ${colors.bg} ${colors.border}`}
			>
				<div className="flex items-center justify-between mb-4">
					<button
						type="button"
						className="flex items-center gap-2 cursor-pointer md:cursor-default text-left"
						onClick={handleGroupClick}
						onKeyDown={handleKeyDown}
					>
						<h3 className={`text-lg font-semibold ${colors.text}`}>
							{group.label}
						</h3>
						<div className="md:hidden">
							{isCollapsed ? (
								<ChevronRight className="w-5 h-5 text-gray-400" />
							) : (
								<ChevronDown className="w-5 h-5 text-gray-400" />
							)}
						</div>
					</button>
					<div className="flex items-center gap-2">
						{isCaptain && (
							<>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onAddEvent(group.label);
									}}
									className={`p-1.5 rounded border-2 bg-transparent transition-colors ${colors.border} hover:bg-black/5 dark:hover:bg-white/5`}
									title="Add event"
								>
									<Plus
										className={`w-4 h-4 ${colors.border.replace("border-", "text-")}`}
									/>
								</button>
								{showReset && (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onResetBlock(group.label);
										}}
										className={`p-1.5 rounded border-2 bg-transparent transition-colors ${colors.border} hover:bg-black/5 dark:hover:bg-white/5`}
										title="Reset block to default events"
									>
										<RotateCcw
											className={`w-4 h-4 ${colors.border.replace("border-", "text-")}`}
										/>
									</button>
								)}
							</>
						)}
					</div>
				</div>
				<div
					className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${isCollapsed ? "hidden md:grid" : ""}`}
				>
					<div className="space-y-3">
						{group.events
							.slice(0, Math.ceil(group.events.length / 2))
							.map((evt) => (
								<EventInput
									key={evt}
									darkMode={darkMode}
									eventName={evt}
									roster={roster}
									isCaptain={isCaptain}
									isEditMode={isEditMode}
									colorKey={group.colorKey}
									colors={colors}
									onUpdateRoster={onUpdateRoster}
									onCreateAssignment={onCreateAssignment}
									onRemoveEvent={onRemoveEvent}
									conflictBlock={group.label}
								/>
							))}
					</div>
					<div className="space-y-3">
						{group.events
							.slice(Math.ceil(group.events.length / 2))
							.map((evt) => (
								<EventInput
									key={evt}
									darkMode={darkMode}
									eventName={evt}
									roster={roster}
									isCaptain={isCaptain}
									isEditMode={isEditMode}
									colorKey={group.colorKey}
									colors={colors}
									onUpdateRoster={onUpdateRoster}
									onCreateAssignment={onCreateAssignment}
									onRemoveEvent={onRemoveEvent}
									conflictBlock={group.label}
								/>
							))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={`rounded-lg border-2 p-4 ${colors.bg} ${colors.border}`}>
			<div className="flex items-center justify-between mb-4">
				<button
					type="button"
					className="flex items-center gap-2 cursor-pointer md:cursor-default text-left"
					onClick={handleGroupClick}
					onKeyDown={handleKeyDown}
				>
					<h3 className={`text-lg font-semibold ${colors.text}`}>
						{group.label}
					</h3>
					<div className="md:hidden">
						{isCollapsed ? (
							<ChevronRight className="w-5 h-5 text-gray-400" />
						) : (
							<ChevronDown className="w-5 h-5 text-gray-400" />
						)}
					</div>
				</button>
				<div className="flex items-center gap-2">
					{isCaptain && (
						<>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onAddEvent(group.label);
								}}
								className={`p-1.5 rounded border-2 bg-transparent transition-colors ${colors.border} hover:bg-black/5 dark:hover:bg-white/5`}
								title="Add event"
							>
								<Plus
									className={`w-4 h-4 ${colors.border.replace("border-", "text-")}`}
								/>
							</button>
							{showReset && (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onResetBlock(group.label);
									}}
									className={`p-1.5 rounded border-2 bg-transparent transition-colors ${colors.border} hover:bg-black/5 dark:hover:bg-white/5`}
									title="Reset block to default events"
								>
									<RotateCcw
										className={`w-4 h-4 ${colors.border.replace("border-", "text-")}`}
									/>
								</button>
							)}
						</>
					)}
				</div>
			</div>
			<div className={`space-y-3 ${isCollapsed ? "hidden md:block" : ""}`}>
				{group.events.map((evt) => (
					<EventInput
						key={evt}
						darkMode={darkMode}
						eventName={evt}
						roster={roster}
						isCaptain={isCaptain}
						isEditMode={isEditMode}
						colorKey={group.colorKey}
						colors={colors}
						onUpdateRoster={onUpdateRoster}
						onCreateAssignment={onCreateAssignment}
						onRemoveEvent={onRemoveEvent}
						conflictBlock={group.label}
					/>
				))}
			</div>
		</div>
	);
}
