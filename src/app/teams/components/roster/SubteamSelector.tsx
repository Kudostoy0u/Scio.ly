"use client";

import { ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import type React from "react";
import { createPortal } from "react-dom";
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
	collapsed?: boolean;
	onToggleCollapsed?: () => void;
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
	collapsed = false,
	onToggleCollapsed,
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

	const IconTooltipButton = ({
		label,
		onClick,
		className,
		disabled,
		children,
	}: {
		label: string;
		onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
		className: string;
		disabled?: boolean;
		children: React.ReactNode;
	}) => {
		const buttonRef = useRef<HTMLButtonElement | null>(null);
		const [tooltip, setTooltip] = useState<{
			x: number;
			y: number;
			visible: boolean;
		}>({ x: 0, y: 0, visible: false });

		const showTooltip = () => {
			if (!buttonRef.current) return;
			const rect = buttonRef.current.getBoundingClientRect();
			setTooltip({
				x: rect.left - 8,
				y: rect.top + rect.height / 2,
				visible: true,
			});
		};

		const hideTooltip = () =>
			setTooltip((prev) => ({ ...prev, visible: false }));

		return (
			<>
				<button
					ref={buttonRef}
					type="button"
					onClick={onClick}
					onMouseEnter={showTooltip}
					onMouseLeave={hideTooltip}
					onFocus={showTooltip}
					onBlur={hideTooltip}
					className={className}
					aria-label={label}
					title={label}
					disabled={disabled}
				>
					{children}
				</button>
				{tooltip.visible &&
					typeof document !== "undefined" &&
					createPortal(
						<div
							className={`fixed z-50 -translate-x-full -translate-y-1/2 px-3 py-2 rounded-lg text-xs whitespace-nowrap pointer-events-none ${
								darkMode
									? "bg-gray-800 text-white border border-gray-700"
									: "bg-white text-gray-900 border border-gray-200 shadow-lg"
							}`}
							style={{ left: tooltip.x, top: tooltip.y }}
						>
							{label}
							<div
								className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-0 h-0 border-y-4 border-y-transparent border-l-4 ${
									darkMode ? "border-l-gray-800" : "border-l-white"
								}`}
							/>
						</div>,
						document.body,
					)}
			</>
		);
	};

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
								return;
							}

							// Prevent parent key handlers from blocking spaces or enter while editing
							if (e.key === " " || e.key === "Enter") {
								e.stopPropagation();
							}

							if (e.key === "Enter") {
								e.preventDefault();
								if (editingSubteamName.trim() && onEditSubteam) {
									onEditSubteam(editingSubteamId, editingSubteamName.trim());
									setEditingSubteamId(null);
									setEditingSubteamName("");
								}
							}
						}}
						className={getInputClasses(subteam.id)}
					/>
					<IconTooltipButton
						label="Confirm edit"
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
						>
							<title>Confirm edit</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5 13l4 4L19 7"
							/>
						</svg>
					</IconTooltipButton>
					<IconTooltipButton
						label="Cancel edit"
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
						>
							<title>Cancel edit</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</IconTooltipButton>
				</div>
			);
		}

		return (
			<>
				<span className="font-medium">{subteam.name}</span>
				{isCaptain && (
					<div className="flex items-center space-x-1">
						<IconTooltipButton
							label="Edit subteam"
							onClick={(e) => {
								e.stopPropagation();
								setEditingSubteamId(subteam.id);
								setEditingSubteamName(subteam.name);
							}}
							className={`p-1 rounded transition-colors ${
								activeSubteamId === subteam.id
									? darkMode
										? "hover:bg-blue-500/20 text-blue-200"
										: "hover:bg-blue-100 text-blue-700"
									: darkMode
										? "hover:bg-gray-700 text-gray-300"
										: "hover:bg-gray-100 text-gray-700"
							}`}
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
						</IconTooltipButton>
						{subteams.length > 1 && (
							<IconTooltipButton
								label="Delete subteam"
								onClick={(e) => {
									e.stopPropagation();
									onDeleteSubteam?.(subteam.id, subteam.name);
								}}
								className={`p-1 rounded transition-colors ${
									activeSubteamId === subteam.id
										? darkMode
											? "text-blue-200 hover:text-red-400 hover:bg-blue-500/20"
											: "text-blue-700 hover:text-red-600 hover:bg-blue-100"
										: darkMode
											? "text-gray-300 hover:text-red-400 hover:bg-gray-700"
											: "text-gray-600 hover:text-red-600 hover:bg-gray-100"
								}`}
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
							</IconTooltipButton>
						)}
					</div>
				)}
			</>
		);
	};

	return (
		<div
			className={`relative mb-6 py-3 px-4 rounded-lg border-2 flex items-center ${
				darkMode
					? "bg-gray-800/50 border-gray-700"
					: "bg-gray-100/50 border-gray-300"
			}`}
		>
			<div className="flex items-center space-x-2 overflow-x-auto w-full">
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
			{onToggleCollapsed && (
				<div className="absolute bottom-3 right-3">
					<IconTooltipButton
						label={collapsed ? "Move to top" : "Move to bottom"}
						onClick={(event) => {
							event.stopPropagation();
							onToggleCollapsed();
						}}
						className={`inline-flex items-center justify-center rounded-md p-1 ${
							darkMode
								? "text-gray-300 hover:bg-gray-800"
								: "text-gray-600 hover:bg-gray-100"
						}`}
					>
						<ChevronDown
							className={`h-4 w-4 transition-transform ${
								collapsed ? "rotate-180" : ""
							}`}
						/>
					</IconTooltipButton>
				</div>
			)}
		</div>
	);
}
