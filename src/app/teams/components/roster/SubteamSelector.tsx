"use client";

import { useState } from "react";
import type React from "react";
import type { Subteam } from "./rosterUtils";

interface SubteamSelectorProps {
	darkMode: boolean;
	subteams: Subteam[];
	activeSubteamId?: string | null;
	isCaptain: boolean;
	onSubteamChange?: (subteamId: string) => void;
	onCreateSubteam?: () => void;
	onEditSubteam?: (subteamId: string, newName: string) => void;
	onDeleteSubteam?: (subteamId: string, subteamName: string) => void;
	onReorderSubteams?: (subteamIds: string[]) => void;
}

export default function SubteamSelector({
	darkMode,
	subteams,
	activeSubteamId,
	isCaptain,
	onSubteamChange,
	onCreateSubteam,
	onEditSubteam,
	onDeleteSubteam,
	onReorderSubteams,
}: SubteamSelectorProps) {
	const [editingSubteamId, setEditingSubteamId] = useState<string | null>(null);
	const [editingSubteamName, setEditingSubteamName] = useState("");
	const [draggedSubteamId, setDraggedSubteamId] = useState<string | null>(null);
	const [dragOverSubteamId, setDragOverSubteamId] = useState<string | null>(
		null,
	);

	if (subteams.length === 0) {
		return null;
	}

	// Drag and drop handlers
	const handleDragStart = (e: React.DragEvent, subteamId: string) => {
		if (!isCaptain || editingSubteamId !== null) {
			return;
		}
		setDraggedSubteamId(subteamId);
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/plain", subteamId);
	};

	const handleDragOver = (e: React.DragEvent, subteamId: string) => {
		if (!(isCaptain && draggedSubteamId) || draggedSubteamId === subteamId) {
			return;
		}
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		setDragOverSubteamId(subteamId);
	};

	const handleDragLeave = () => {
		setDragOverSubteamId(null);
	};

	const handleDrop = (e: React.DragEvent, targetSubteamId: string) => {
		e.preventDefault();
		if (
			!(isCaptain && draggedSubteamId) ||
			draggedSubteamId === targetSubteamId ||
			!onReorderSubteams
		) {
			setDraggedSubteamId(null);
			setDragOverSubteamId(null);
			return;
		}

		const draggedIndex = subteams.findIndex((s) => s.id === draggedSubteamId);
		const targetIndex = subteams.findIndex((s) => s.id === targetSubteamId);

		if (draggedIndex === -1 || targetIndex === -1) {
			setDraggedSubteamId(null);
			setDragOverSubteamId(null);
			return;
		}

		// Create new ordered array
		const newSubteams = [...subteams];
		const [removed] = newSubteams.splice(draggedIndex, 1);
		if (!removed) {
			setDraggedSubteamId(null);
			setDragOverSubteamId(null);
			return;
		}
		newSubteams.splice(targetIndex, 0, removed);

		// Call reorder callback with new order
		onReorderSubteams(newSubteams.map((s) => s.id));

		setDraggedSubteamId(null);
		setDragOverSubteamId(null);
	};

	const handleDragEnd = () => {
		setDraggedSubteamId(null);
		setDragOverSubteamId(null);
	};

	// Helper function to get subteam item styling
	const getSubteamItemClasses = (subteamId: string) => {
		const isDragging = draggedSubteamId === subteamId;
		const isDragOver = dragOverSubteamId === subteamId;

		return `flex items-center space-x-1 px-4 py-3 rounded-lg border-2 min-w-fit transition-all ${
			isDragging
				? "opacity-50 cursor-grabbing"
				: isDragOver
					? darkMode
						? "bg-blue-800/50 border-blue-400 text-blue-200"
						: "bg-blue-100 border-blue-400 text-blue-800"
					: activeSubteamId === subteamId
						? darkMode
							? "bg-blue-900/30 border-blue-500 text-blue-300"
							: "bg-blue-50 border-blue-500 text-blue-700"
						: darkMode
							? "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
							: "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
		} ${isCaptain && editingSubteamId === null ? "cursor-move" : "cursor-pointer"}`;
	};

	// Helper function to get input styling
	const getInputClasses = (subteamId: string) => {
		return `bg-transparent border-none outline-none font-medium w-20 ${
			activeSubteamId === subteamId
				? darkMode
					? "text-blue-300"
					: "text-blue-700"
				: darkMode
					? "text-gray-300"
					: "text-gray-700"
		}`;
	};

	// Helper function to render subteam content
	const renderSubteamContent = (subteam: Subteam) => {
		if (editingSubteamId === subteam.id) {
			return (
				<div className="flex items-center space-x-1">
					<input
						type="text"
						value={editingSubteamName}
						onChange={(e) => setEditingSubteamName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								setEditingSubteamId(null);
								setEditingSubteamName("");
							}
						}}
						className={getInputClasses(subteam.id)}
					/>
					<button
						type="button"
						onClick={() => {
							if (editingSubteamName.trim() && onEditSubteam) {
								onEditSubteam(editingSubteamId, editingSubteamName.trim());
								setEditingSubteamId(null);
								setEditingSubteamName("");
							}
						}}
						disabled={!editingSubteamName.trim()}
						className={`p-1 rounded transition-colors ${
							editingSubteamName.trim()
								? darkMode
									? "hover:bg-green-400/20 text-green-400"
									: "hover:bg-green-500/20 text-green-600"
								: darkMode
									? "text-gray-500"
									: "text-gray-400"
						}`}
					>
						<svg
							className="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-label="Confirm edit"
						>
							<title>Confirm edit</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5 13l4 4L19 7"
							/>
						</svg>
					</button>
					<button
						type="button"
						onClick={() => {
							setEditingSubteamId(null);
							setEditingSubteamName("");
						}}
						className={`p-1 rounded transition-colors ${
							darkMode
								? "hover:bg-red-400/20 text-red-400"
								: "hover:bg-red-500/20 text-red-600"
						}`}
					>
						<svg
							className="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-label="Cancel edit"
						>
							<title>Cancel edit</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
			);
		}

		return (
			<>
				<span className="font-medium">{subteam.name}</span>
				{isCaptain && (
					<div className="flex items-center space-x-1">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setEditingSubteamId(subteam.id);
								setEditingSubteamName(subteam.name);
							}}
							className={`p-1 rounded hover:bg-opacity-20 transition-colors ${
								activeSubteamId === subteam.id
									? "hover:bg-blue-400"
									: "hover:bg-gray-400"
							}`}
							title="Edit subteam"
						>
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>Edit subteam</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
								/>
							</svg>
						</button>
						{subteams.length > 1 && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onDeleteSubteam?.(subteam.id, subteam.name);
								}}
								className={`p-1 rounded hover:bg-opacity-20 transition-colors ${
									activeSubteamId === subteam.id
										? "hover:bg-red-400"
										: "hover:bg-red-400"
								}`}
								title="Delete subteam"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Delete subteam</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/>
								</svg>
							</button>
						)}
					</div>
				)}
			</>
		);
	};

	return (
		<div
			className={`mb-6 p-4 rounded-lg ${darkMode ? "bg-gray-800/50" : "bg-gray-100/50"}`}
		>
			<div className="flex space-x-2 overflow-x-auto pb-2">
				{subteams.map((subteam) => (
					<div
						key={subteam.id}
						className={getSubteamItemClasses(subteam.id)}
						onClick={() => {
							if (editingSubteamId === null) {
								onSubteamChange?.(subteam.id);
							}
						}}
						draggable={
							isCaptain && editingSubteamId === null && subteams.length > 1
						}
						onDragStart={(e) => handleDragStart(e, subteam.id)}
						onDragOver={(e) => handleDragOver(e, subteam.id)}
						onDragLeave={handleDragLeave}
						onDrop={(e) => handleDrop(e, subteam.id)}
						onDragEnd={handleDragEnd}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								if (editingSubteamId === null) {
									onSubteamChange?.(subteam.id);
								}
							}
						}}
					>
						{renderSubteamContent(subteam)}
					</div>
				))}

				{/* Add Subteam Button */}
				{isCaptain && (
					<button
						type="button"
						className={`flex items-center space-x-1 px-4 py-3 rounded-lg border-2 min-w-fit cursor-pointer transition-all ${
							darkMode
								? "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
								: "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
						}`}
						onClick={() => onCreateSubteam?.()}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onCreateSubteam?.();
							}
						}}
					>
						<svg
							className="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-label="Add subteam"
						>
							<title>Add subteam</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 6v6m0 0v6m0-6h6m-6 0H6"
							/>
						</svg>
						<span className="font-medium">Add Subteam</span>
					</button>
				)}
			</div>
		</div>
	);
}
